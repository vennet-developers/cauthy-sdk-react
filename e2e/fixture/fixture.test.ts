// The recording, checked against the route table of the spec: every request
// names a route, every POST carried X-Cauthy-Request, every answer says
// protocol 1 and no-store, carries the fields the table says, `next` on a
// sign-in answer, and the protocol's error shape on a refusal.
import { describe, expect, it } from 'vitest'
import { SIGN_IN_PATHS, type RouteId } from '@cauthyhq/js'
import { readFixture } from '../servers/fixture'
// The whole route table (answer fields, redirects, streams): @cauthyhq/js
// ships only method and path, so the generated table is vendored here.
import { ROUTE_DETAILS as ROUTES } from './route-details'

const fixture = readFixture()
const all = Object.entries(fixture.scenarios).flatMap(([scenario, list]) => list.map((e) => ({ scenario, e })))
const routeOf = (method: string, path: string): RouteId | undefined => {
  const p = path.replace(/^\/api\/auth/, '')
  return (Object.keys(ROUTES) as RouteId[]).find((id) => ROUTES[id].method === method && new RegExp(`^${ROUTES[id].path.replace('{provider}', '[^/]+')}$`).test(p))
}

describe('the recorded protocol fixture', () => {
  it('was recorded at protocol 1, from a backend, with every test of the suite', () => {
    expect(fixture.protocol).toBe(1)
    expect(fixture.recordedFrom).not.toBe('')
    expect(Object.keys(fixture.scenarios).length).toBe(9)
    expect(all.length).toBeGreaterThan(20)
  })

  it('names only routes of the table', () => {
    for (const { scenario, e } of all) expect(routeOf(e.request.method, e.request.path), `${scenario}: ${e.request.method} ${e.request.path}`).toBeDefined()
  })

  it('sent X-Cauthy-Request: 1 on every POST', () => {
    for (const { scenario, e } of all.filter((x) => x.e.request.method === 'POST')) expect(e.request.headers['x-cauthy-request'], `${scenario}: ${e.request.path}`).toBe('1')
  })

  it('answered protocol 1 and no-store every time', () => {
    for (const { scenario, e } of all) {
      expect(e.response.headers['cauthy-protocol'], `${scenario}: ${e.request.path}`).toBe('1')
      expect(e.response.headers['cache-control'], `${scenario}: ${e.request.path}`).toContain('no-store')
    }
  })

  it('answered each route with the fields the table says, and next on a sign-in answer', () => {
    for (const { scenario, e } of all) {
      const id = routeOf(e.request.method, e.request.path)!
      const r = ROUTES[id]
      if (r.redirect) {
        expect(e.response.status, `${scenario}: ${id}`).toBe(302)
        continue
      }
      if (r.stream || e.response.status !== 200) continue
      const body = JSON.parse(e.response.body) as Record<string, unknown>
      for (const [field, type] of Object.entries(r.fields)) {
        if (!type.endsWith('?')) expect(body, `${scenario}: ${id} lacks ${field}`).toHaveProperty(field)
      }
      if (SIGN_IN_PATHS.has(r.path)) expect(body.next, `${scenario}: ${id} has no next`).toBeDefined()
    }
  })

  it('refused in the protocol\'s error shape', () => {
    for (const { scenario, e } of all.filter((x) => x.e.response.status >= 400 && (x.e.response.headers['content-type'] ?? '').startsWith('application/json'))) {
      const body = JSON.parse(e.response.body) as { error?: { code?: unknown; message?: unknown } }
      expect(typeof body.error?.code, `${scenario}: ${e.request.path}`).toBe('string')
      expect(typeof body.error?.message, `${scenario}: ${e.request.path}`).toBe('string')
    }
  })
})
