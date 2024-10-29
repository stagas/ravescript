import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.createTable('profiles')
		.ifNotExists()
		.addColumn('ownerNick', 'text', col => col.references('users.nick').notNull())
		.addColumn('nick', 'text', col => col.primaryKey())
		.addColumn('displayName', 'text', col => col.notNull())
		.addColumn('bio', 'text')
		.addColumn('avatar', 'text')
		.addColumn('banner', 'text')
		.addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
		.addColumn('updatedAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
		.execute()

	await db.schema
		.createIndex('profiles_ownerNick_index')
		.ifNotExists()
		.on('profiles')
		.column('ownerNick')
		.execute()

	await db.schema
		.createIndex('profiles_displayName_index')
		.ifNotExists()
		.on('profiles')
		.column('displayName')
		.execute()

	await db.schema
		.alterTable('users')
		.addColumn('defaultProfile', 'text', col => col.references('profiles.nick'))
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.dropTable('profiles')
		.ifExists()
		.cascade()
		.execute()

	await db.schema
		.alterTable('users')
		.dropColumn('defaultProfile')
		.execute()
}
