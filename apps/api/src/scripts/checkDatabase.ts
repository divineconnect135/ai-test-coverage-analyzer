import pg from 'pg'
import { env } from '../config/env.js'

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  max: 1,
})

async function checkDatabase() {
  try {
    const result = await pool.query<{ ok: number }>('SELECT 1 AS ok')

    if (result.rows[0]?.ok !== 1) {
      throw new Error('Unexpected database response.')
    }

    console.log('Neon PostgreSQL connection successful.')
  } catch (error) {
    console.error(
      'Database connection failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

void checkDatabase()
