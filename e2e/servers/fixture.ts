// The recorded protocol fixture: what crossed /api/auth while the suite ran
// against @cauthyhq/node, per test. Replayed, it is the contract the client
// must keep with any backend; checked against the route table, it is the
// protocol as the spec says it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const FIXTURE_PATH = resolve(process.env.E2E_FIXTURE ?? 'e2e/fixture/auth-bff.v1.json')

export interface Exchange {
  request: { method: string; path: string; query: string; headers: Record<string, string>; body: unknown }
  response: { status: number; headers: Record<string, string>; setCookie: string[]; body: string }
}

export interface Fixture {
  protocol: 1
  recordedFrom: string
  scenarios: Record<string, Exchange[]>
}

export function readFixture(): Fixture {
  if (!existsSync(FIXTURE_PATH)) return { protocol: 1, recordedFrom: '', scenarios: {} }
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Fixture
}

export function writeFixture(f: Fixture): void {
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(f, null, 2)}\n`)
}

/** The keys of a JSON body, sorted: what replay compares (values typed by a person may differ). */
export function keysOf(body: unknown): string[] {
  return body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body).sort() : []
}
