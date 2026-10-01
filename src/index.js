export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);

		if (pathname === "/api/beverages") {
			const { results } = await env.prod_d1_tutorial
				.prepare("SELECT * FROM Customers WHERE CompanyName = ?")
				.bind("Bs Beverages")
				.run();
			return Response.json(results);
		}

		if (pathname === "/api/create_unselected_table") {
			//Delete existing table
			await env.prod_d1_tutorial.prepare("DROP TABLE IF EXISTS 'Unselected Exercises'").run();

			//Duplicate the All Exercises table into Unselected Exercises
			await env.prod_d1_tutorial.prepare("CREATE TABLE 'Unselected Exercises' AS SELECT * FROM 'All Exercises'").run();

			return Response.json("Duplicated All Exercises table into Unselected Exercises");
		}

		return new Response(
			"Call /api/beverages to see everyone who works at Bs Beverages",
		);
	},
};
