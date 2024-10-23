import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.createTable('sounds')
		.ifNotExists()
		.addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('ownerProfileNick', 'text', col => col.references('profiles.nick').notNull())
		.addColumn('title', 'text', col => col.notNull())
		.addColumn('code', 'text', col => col.notNull())
		.addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
		.addColumn('updatedAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
		.execute()

	await db.schema
		.createIndex('sounds_ownerProfileNick_index')
		.ifNotExists()
		.on('sounds')
		.column('ownerProfileNick')
		.execute()

	await db.schema
		.createIndex('sounds_title_index')
		.ifNotExists()
		.on('sounds')
		.column('title')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.dropTable('sounds')
		.ifExists()
		.cascade()
		.execute()
}
