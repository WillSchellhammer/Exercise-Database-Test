const json = (data, status = 200) => Response.json(data, { status });
const error = (message, status) => json({ error: message }, status);

function isValidDate(s) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const d = new Date(`${s}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Positive integer, or null/undefined (meaning "use the exercise's default")
function parseOptionalCount(value) {
	if (value === undefined || value === null) return { ok: true, value: null };
	if (Number.isInteger(value) && value > 0) return { ok: true, value };
	return { ok: false };
}

// Identify the user from Cloudflare Access. For local dev, set DEV_USER_EMAIL in .dev.vars.
// Never set DEV_USER_EMAIL in production.
async function getUserId(request, db, env) {
	const email = (
		request.headers.get("Cf-Access-Authenticated-User-Email") ?? env.DEV_USER_EMAIL
	)?.toLowerCase();
	if (!email) return null;
 
	await db.prepare("INSERT OR IGNORE INTO users (email) VALUES (?)").bind(email).run();
	const row = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
	return row?.id ?? null;
}

//SQL code used in multiple routes
const SELECT_ENTRY = `
	SELECT s.id AS entry_id, s.scheduled_date, s.position, e.id AS exercise_id,
		e."Exercise Name" AS name, e."Description" AS description,
		COALESCE(s.sets, e."Sets") AS sets, COALESCE(s.reps, e."Reps") AS reps
	FROM schedule_entries s
	JOIN all_exercises e ON e.id = s.exercise_id`;

export default {
    async fetch(request, env) {
        try {
            return await handle(request, env);
        } catch (err) {
            console.error(err);
            return error("Internal server error", 500);
        }
    },
};

//Main function
async function handle(request, env) {
	const db = env.prod_d1_tutorial;
	const url = new URL(request.url);
	const parts = url.pathname.split("/").filter(Boolean);
	const method = request.method;
 
    //Check if it prompts the API
	if (parts[0] !== "api") {
		return new Response("DeacFit API", { status: 200 });
	}
 
	// GET /api/exercises
	if (parts[1] === "exercises" && parts.length === 2 && method === "GET") {
		const { results } = await db
			.prepare(
				`SELECT id, "Exercise Name" AS name, "Description" AS description,
					"Sets" AS sets, "Reps" AS reps
				FROM all_exercises ORDER BY "Exercise Name"`,
			)
			.all();
		return json(results);
	}
 
	if (parts[1] !== "schedule") {
		return error("Not found", 404);
	}
 
	const userId = await getUserId(request, db, env);
	if (!userId) return error("Not authenticated", 401);
 
	// GET /api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
	if (parts.length === 2 && method === "GET") {
		const from = url.searchParams.get("from");
		const to = url.searchParams.get("to");
		if (!isValidDate(from) || !isValidDate(to)) {
			return error("from and to must be valid dates in YYYY-MM-DD format", 400);
		}
		if (from > to) return error("from must not be after to", 400);
 
		const { results } = await db
			.prepare(
				`${SELECT_ENTRY}
				WHERE s.user_id = ? AND s.scheduled_date BETWEEN ? AND ?
				ORDER BY s.scheduled_date, s.position, s.id`,
			)
			.bind(userId, from, to)
			.all();
		return json(results);
	}
 
	const date = parts[2];
	if (!isValidDate(date)) {
		return error("Date must be a valid date in YYYY-MM-DD format", 400);
	}
 
	// GET /api/schedule/:date
	if (parts.length === 3 && method === "GET") {
		const { results } = await db
			.prepare(
				`${SELECT_ENTRY}
				WHERE s.user_id = ? AND s.scheduled_date = ?
				ORDER BY s.position, s.id`,
			)
			.bind(userId, date)
			.all();
		return json(results);
	}
 
	// GET /api/schedule/:date/available  (exercises not yet scheduled on that date)
	if (parts.length === 4 && parts[3] === "available" && method === "GET") {
		const { results } = await db
			.prepare(
				`SELECT e.id, e."Exercise Name" AS name, e."Description" AS description,
					e."Sets" AS sets, e."Reps" AS reps
				FROM all_exercises e
				WHERE NOT EXISTS (
					SELECT 1 FROM schedule_entries s
					WHERE s.exercise_id = e.id AND s.user_id = ? AND s.scheduled_date = ?
				)
				ORDER BY e."Exercise Name"`,
			)
			.bind(userId, date)
			.all();
		return json(results);
	}
 
	// POST/DELETE /api/schedule/:date/exercises/:exerciseId
	if (parts.length === 5 && parts[3] === "exercises") {
		const exerciseId = Number(parts[4]);
		if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
			return error("Exercise ID must be a positive integer", 400);
		}
 
		if (method === "POST") {
			// Optional body: { "sets": 3, "reps": 10 } overrides the exercise defaults
			let body = {};
			try {
				body = await request.json();
			} catch {
				// no body is fine
			}
			const sets = parseOptionalCount(body?.sets);
			const reps = parseOptionalCount(body?.reps);
			if (!sets.ok || !reps.ok) {
				return error("sets and reps must be positive integers", 400);
			}
 
			try {
				const result = await db
					.prepare(
						`INSERT INTO schedule_entries (user_id, exercise_id, scheduled_date, sets, reps, position)
						SELECT ?, e.id, ?, ?, ?,
							(SELECT COALESCE(MAX(position), 0) + 1 FROM schedule_entries
								WHERE user_id = ? AND scheduled_date = ?)
						FROM all_exercises e WHERE e.id = ?`,
					)
					.bind(userId, date, sets.value, reps.value, userId, date, exerciseId)
					.run();
 
				if (result.meta.changes === 0) return error("Exercise not found", 404);
				return json({ added: exerciseId, date }, 201);
			} catch (err) {
				if (String(err.message).includes("UNIQUE")) {
					return error("Exercise is already scheduled on that date", 409);
				}
				throw err;
			}
		}
 
		if (method === "DELETE") {
			const result = await db
				.prepare(
					"DELETE FROM schedule_entries WHERE user_id = ? AND scheduled_date = ? AND exercise_id = ?",
				)
				.bind(userId, date, exerciseId)
				.run();
 
			if (result.meta.changes === 0) return error("Scheduled exercise not found", 404);
			return json({ removed: exerciseId, date });
		}
	}
 
	return error("Not found", 404);
}
