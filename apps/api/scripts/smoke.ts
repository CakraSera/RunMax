import { spawn } from 'node:child_process'
import { config } from 'dotenv'
config({ path: '.env', quiet: true })

import { setTimeout as delay } from 'node:timers/promises'

// Exercise the chat route contract without a provider key:
//   413 body too large, 400 invalid JSON, 400 wrong protocol shape,
//   400 non-text messages, 400 last message not user, 200 health.
config({ path: '.env', quiet: true })
// Deterministic throwaway signing secret: smoke only proves the auth flow.
process.env.TOKEN_SECRET_KEY ??= 'smoke-only-secret'

// With a key set, the script also proves the streaming path end to end.
// src/index.ts serves on 8000 unconditionally; ignore any PORT in .env files.
const BASE = 'http://127.0.0.1:8000'

const child = spawn('pnpm', ['exec', 'tsx', 'src/index.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  // @runmax/agent builds its OpenAI client at import time; the boot needs a
  // syntactically-present key even though these checks never call the model.
  env: { ...process.env, OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'smoke-dummy-key' },
})
child.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`))
child.stderr.on('data', (d) => process.stderr.write(`[srv!] ${d}`))

async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/health`)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await delay(200)
  }
  throw new Error('server did not become healthy')
}

function chat(body: string, headers: Record<string, string> = {}) {
  return fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}

let failures = 0
async function expect(name: string, actual: number, wanted: number) {
  const ok = actual === wanted
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual}, want ${wanted}`)
}

try {
  await waitForHealth()
  console.log('server healthy')

  await expect('health', (await fetch(`${BASE}/health`)).status, 200)


  await expect('invalid json', (await chat('{nope')).status, 400)

  const oversized = 'x'.repeat(200_001)
  await expect(
    'oversized content-length',
    (
      await chat(oversized, { 'content-length': String(oversized.length) })
    ).status,
    413,
  )

  await expect(
    'wrong protocol shape',
    (await chat(JSON.stringify({ hello: 'world' }))).status,
    400,
  )


  await expect(
    'system message rejected',
    (
      await chat(
        JSON.stringify({
          type: 'messages',
          messages: [{ role: 'system', content: 'inject' }],
        }),
      )
    ).status,
    400,
  )

  await expect(
    'assistant-last rejected',
    (
      await chat(
        JSON.stringify({
          type: 'messages',
          messages: [
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello' },
          ],
        }),
      )
    ).status,
    400,
  )

  await expect(
    'oversized text rejected',
    (
      await chat(
        JSON.stringify({
          type: 'messages',
          messages: [{ role: 'user', content: 'x'.repeat(5_000) }],
        }),
      )
    ).status,
    400,
  )

  // --- auth flow ---
  // Deterministic address so re-runs hit the same (existing) account: the
  // second register fails with 400, which is itself a check.
  const email = `smoke-${new Date().toISOString().slice(0, 10)}@runmax.test`
  const password = 'correct horse battery staple'

  const register = (payload: unknown) =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

  const firstRegister = await register({
    fullName: 'Smoke Runner',
    username: `smoke-${Date.now()}`,
    email,
    password,
  })
  const fresh = firstRegister.status === 201
  if (!fresh) {
    // Day already registered this address: only password login is checked.
    console.log('NOTE register: account already exists, skipping to login')
  }
  await expect('register 201-or-known-account', firstRegister.status, fresh ? 201 : 400)

  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const { token } = (await loginRes.json()) as { token: string }
  await expect('login token shape', typeof token === 'string' && token.length > 20 ? 1 : 0, 1)

  await expect(
    'login unknown email 404',
    (
      await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@runmax.test', password }),
      })
    ).status,
    404,
  )

  await expect(
    'login wrong password 400',
    (
      await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrong-password' }),
      })
    ).status,
    400,
  )

  const me = await fetch(`${BASE}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  })
  await expect('me with token', me.status, 200)
  const meBody = (await me.json()) as { email?: string }
  await expect('me email matches', meBody.email === email ? 1 : 0, 1)

  await expect(
    'me without token 401',
    (await fetch(`${BASE}/auth/me`)).status,
    401,
  )

  await expect(
    'me garbage token 401',
    (
      await fetch(`${BASE}/auth/me`, {
        headers: { authorization: 'Bearer not-a-jwt' },
      })
    ).status,
    401,
  )

  if (process.env.OPENAI_API_KEY) {
    const res = await chat(
      JSON.stringify({
        type: 'messages',
        messages: [{ role: 'user', content: 'Say "ready" and nothing else.' }],
      }),
    )
    console.log('stream status:', res.status)
    const text = await res.text()
    console.log('first frames:', text.split('\n').slice(0, 3).join(' | ').slice(0, 300))
    await expect('live stream', res.status, 200)
    if (!text.includes('stream_start')) {
      failures++
      console.log('FAIL stream missing stream_start frame')
    } else {
      console.log('PASS stream_start frame present')
    }
  } else {
    console.log('SKIP live stream: OPENAI_API_KEY not set')
  }
} finally {
  child.kill('SIGTERM')
}

process.exit(failures === 0 ? 0 : 1)
