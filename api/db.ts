import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import Pool from 'pg-pool'
import { env } from './core/env.ts'
import { DB } from './models.ts'

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  })
})

export const db = new Kysely<DB>({
  dialect,
  plugins: [new CamelCasePlugin()],
})
