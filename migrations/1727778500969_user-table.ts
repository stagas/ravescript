import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.createTable('user')
		.ifNotExists()
		.addColumn('nick', 'text', col =>
			col.primaryKey()
		)
		.addColumn('email', 'text', col =>
			col.unique().notNull()
		)
		.addColumn('emailVerified', 'boolean', col =>
			col.defaultTo(false)
		)
		.addColumn('password', 'text', col =>
			col.unique().notNull()
		)
		.addColumn('createdAt', 'timestamp', (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.addColumn('updatedAt', 'timestamp', (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute()

	await db.schema
		.createIndex('user_email_index')
		.on('user')
		.column('email')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.dropTable('user')
		.cascade()
		.execute()
}
