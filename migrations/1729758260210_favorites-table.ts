import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('favorites')
		.ifNotExists()
		.addColumn('profileNick', 'text', col => col.references('profiles.nick').onDelete('cascade').notNull())
		.addColumn('soundId', 'uuid', col => col.references('sounds.id').onDelete('cascade').notNull())
		.addColumn('createdAt', 'timestamp', col => col.defaultTo(sql`now()`).notNull())
		.addPrimaryKeyConstraint('favorites_pkey', ['profileNick', 'soundId'])
		.execute()

	// Index for faster lookups when querying a profile's favorites
	await db.schema
		.createIndex('favorites_profileId_idx')
		.ifNotExists()
		.on('favorites')
		.column('profileNick')
		.execute()

	// Index for faster lookups when querying who favorited a sound
	await db.schema
		.createIndex('favorites_soundId_idx')
		.ifNotExists()
		.on('favorites')
		.column('soundId')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.dropTable('favorites')
		.ifExists()
		.cascade()
		.execute()
}
