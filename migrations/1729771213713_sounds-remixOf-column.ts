import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations

	// Add remixOf column to sounds table
	await db.schema
		.alterTable('sounds')
		.addColumn('remixOf', 'uuid', col => col.references('sounds.id'))
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.alterTable('sounds')
		.dropColumn('remixOf')
		.execute()
}
