export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);

		//From template
		if (pathname === "/api/beverages") {
			const { results } = await env.prod_d1_tutorial
				.prepare("SELECT * FROM Customers WHERE CompanyName = ?")
				.bind("Bs Beverages")
				.run();
			return Response.json(results);
		}

		//Duplicate the All Exercises table into Unselected Exercises
		if (pathname === "/api/create_unselected_table") {
			//Delete existing table
			await env.prod_d1_tutorial.prepare("DROP TABLE IF EXISTS 'Unselected Exercises'").run();

			//Duplication step
			await env.prod_d1_tutorial.prepare("CREATE TABLE 'Unselected Exercises' AS SELECT * FROM 'All Exercises'").run();

			return Response.json("Duplicated All Exercises table into Unselected Exercises");
		}

		//Delete existing Monday table and build a blank one
		if (pathname === "/api/create_monday_table") {
			//Delete existing table
			await env.prod_d1_tutorial.prepare("DROP TABLE IF EXISTS 'Monday'").run();

			//Create blank Monday table (where 0=1 means none of the data is copied over)
			await env.prod_d1_tutorial.prepare("CREATE TABLE Monday AS SELECT * FROM 'All Exercises' WHERE 0=1").run();

			return Response.json("Created blank Monday table");
		}

		return new Response(
			"Call /api/beverages to see everyone who works at Bs Beverages",
		);
	},
};
