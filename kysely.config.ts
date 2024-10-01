import dotenv from 'dotenv'
import { CamelCasePlugin, PostgresDialect } from 'kysely'
import { defineConfig } from 'kysely-ctl'
import { Pool } from 'pg'

dotenv.config({
	override: true,
	path: process.env.NODE_ENV === 'production'
		? '.env'
		: '.env.development'
})

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
	throw new Error('kysely: No connectionString found.')
}

console.log('NODE_ENV:', process.env.NODE_ENV)

const dialect = new PostgresDialect({
	pool: new Pool({
		connectionString,
		max: 10,
	})
})

export default defineConfig({
	dialect,
	migrations: {
		migrationFolder: 'migrations',
	},
	plugins: [new CamelCasePlugin()],
	//   seeds: {
	//     seedFolder: 'seeds',
	//   }
})
