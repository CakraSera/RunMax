import { existsSync } from 'node:fs'
import EmbeddedPostgres from 'embedded-postgres'

// Rootless dev Postgres for this machine: Docker needs root/group rights the
// user does not have, and postgres is not installed system-wide. The embedded
// binaries live in node_modules; data goes to .devpg/ (gitignored).
//
// Usage: pnpm db:up | pnpm db:down

const dir = process.env.DEV_DB_DIR ?? '.devpg'
const port = Number(process.env.DEV_DB_PORT ?? 54330)
const user = process.env.DEV_DB_USER ?? 'runmax'
const password = process.env.DEV_DB_PASSWORD ?? 'runmax'
const database = process.env.DEV_DB_NAME ?? 'runmax'

const command = process.argv[2] ?? 'up'

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user,
  password,
  port,
  persistent: true,
})

if (command === 'up') {
  if (!existsSync(dir)) {
    await pg.initialise()
    console.log(`[dev-db] initialised cluster in ${dir}`)
  }
  await pg.start()
  await pg.createDatabase(database).catch((e) => {
    if (e?.code === '42P04') return // database already exists
    throw e
  })
  console.log(`[dev-db] postgres ready on 127.0.0.1:${port} db=${database}`)
  console.log(`[dev-db] DATABASE_URL=postgresql://${user}:${password}@127.0.0.1:${port}/${database}`)
  // Keep the process attached so the server keeps running; Ctrl+C stops it.
} else if (command === 'down') {
  await pg.stop()
  console.log('[dev-db] stopped')
} else {
  console.error('usage: tsx scripts/dev-db.ts [up|down]')
  process.exitCode = 1
}
