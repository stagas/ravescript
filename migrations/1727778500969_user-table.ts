import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('nick', 'text', col => col.primaryKey())
		.addColumn('email', 'text', col => col.unique().notNull())
		.addColumn('emailVerified', 'boolean', col => col.defaultTo(false))
		.addColumn('password', 'text')
		.addColumn('oauthGithub', 'boolean')
		.addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
		.addColumn('updatedAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
		.execute()

	await db.schema
		.createIndex('users_email_index')
		.ifNotExists()
		.on('users')
		.column('email')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.dropTable('users')
		.ifExists()
		.cascade()
		.execute()
}
