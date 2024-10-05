import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.createTable('channel')
		.ifNotExists()
		.addColumn('name', 'text', col => col.primaryKey())
		.addColumn('createdAt', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
		.execute()

	await db.schema
		.createTable('channelUser')
		.ifNotExists()
		.addColumn('channel', 'text', col => col.notNull().references('channel.name'))
		.addColumn('nick', 'text', col => col.notNull().references('user.nick'))
		.addColumn('joinedAt', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
		.execute()

	await db.schema
		.createTable('message')
		.ifNotExists()
		.addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('channel', 'text', col => col.notNull().references('channel.name'))
		.addColumn('type', 'text', col => col.notNull())
		.addColumn('nick', 'text', col => col.notNull().references('user.nick'))
		.addColumn('text', 'text', col => col.notNull())
		.addColumn('createdAt', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
		.execute()

	await db.schema
		.createIndex('message_createdAt_index')
		.on('message')
		.columns(['createdAt'])
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema.dropTable('channel').ifExists().cascade().execute()
	await db.schema.dropTable('channelUser').ifExists().cascade().execute()
	await db.schema.dropTable('message').ifExists().cascade().execute()
	await db.schema.dropType('messageType').ifExists().execute()
}
