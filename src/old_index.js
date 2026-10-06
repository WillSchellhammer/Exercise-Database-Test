export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);
		
		//Duplicate the all_exercises table into unselected_exercises
		if (pathname === "/api/create_unselected_table") {
			//Delete existing table
			await env.prod_d1_tutorial.prepare("DROP TABLE IF EXISTS unselected_exercises").run();

			//Duplication step
			await env.prod_d1_tutorial.prepare("CREATE TABLE unselected_exercises AS SELECT * FROM all_exercises").run();

			return Response.json("Duplicated all_exercises table into unselected_exercises");
		}

		//Delete existing monday table and build a blank one
		if (pathname === "/api/create_monday_table") {
			//Delete existing table
			await env.prod_d1_tutorial.prepare("DROP TABLE IF EXISTS monday").run();

			//Create blank monday table (where 0=1 means none of the data is copied over)
			await env.prod_d1_tutorial.prepare("CREATE TABLE monday AS SELECT * FROM all_exercises WHERE 0=1").run();

			return Response.json("Created blank monday table");
		}

		if (pathname.startsWith("/api/insert_exercise_monday/")) {
			//Find row ID
			const ID = pathname.split('/').pop();
			if (!ID) {
				return Response.json({error: "Missing row ID"}, {status: 400});
			}

			//Create monday table if it doesn't exist
			await env.prod_d1_tutorial.prepare('CREATE TABLE IF NOT EXISTS monday AS SELECT * FROM all_exercises WHERE 0=1').run();

			//Add an exercise from unselected_exercises
			await env.prod_d1_tutorial.prepare('INSERT INTO monday SELECT * FROM unselected_exercises WHERE id=?').bind(ID).run();

			//Remove the exercise from unselected_exercises
			await env.prod_d1_tutorial.prepare('DELETE FROM unselected_exercises WHERE id=?').bind(ID).run();

			return Response.json(`Moved id ${ID} from unselected_exercises to monday`);
		}

		return new Response(
			"Call /api/something to do something",
		);
	},
};
