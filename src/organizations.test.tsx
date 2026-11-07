// @vitest-environment jsdom
import { act, createElement as h, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrganizationSeat, PublicSession } from '@cauthyhq/js'
import { useOrganizations, type UseOrganizations } from './organizations'
import { CauthyProvider } from './react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SALES = '3b2f6c1e-8d4a-4c7e-9f10-2a6b5c8d9e01'
const ana: PublicSession = { user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false }, tenantId: 't1', roles: [], organizations: [], expiresAt: new Date(Date.now() + 600_000).toISOString() }
const seat = (name: string): OrganizationSeat => ({ id: SALES, system: 'acme-crm', name, kind: 'customer', role: 'owner', can: { readMembers: true, manageMembers: true, removeMembers: true, update: true, archive: true, delete: true } })

let asked: string[]
let name: string
let down: 'refused' | 'unreachable' | null
beforeEach(() => {
  asked = []
  name = 'Acme Sales'
  down = null
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace(/^\/api\/auth/, '')
    asked.push(`${init?.method ?? 'GET'} ${path}`)
    const headers = { 'cauthy-protocol': '1' }
    if (path.startsWith('/me/organizations?') || path === '/me/organizations') {
      if (down === 'unreachable') throw new TypeError('Failed to fetch')
      if (down === 'refused') return Response.json({ error: { code: 'forbidden', message: 'Not for you.' } }, { status: 403, headers })
      return Response.json({ organizations: [seat(name)] }, { headers })
    }
    if (path === '/me/organizations/rename') {
      name = JSON.parse(String(init!.body)).name
      return Response.json({ status: 'renamed', organization: seat(name) }, { headers })
    }
    return Response.json({ session: null, status: 'unauthenticated' }, { headers })
  })
})
let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})
const settle = async () => {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}
async function show(el: ReactNode) {
  const box = document.createElement('div')
  document.body.appendChild(box)
  root = createRoot(box)
  act(() => root!.render(el))
  await settle()
  return box
}

let grabbed: UseOrganizations | null = null
function Names({ system }: { system?: string }) {
  const orgs = useOrganizations({ system })
  grabbed = orgs
  return h('p', null, orgs.loading ? 'loading' : orgs.error ? `error:${orgs.error.code}` : orgs.organizations.map((o) => o.name).join(','))
}

describe('useOrganizations', () => {
  it("lists the person's organizations, and asks again after a change it made", async () => {
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(Names) }))
    expect(box.textContent).toBe('Acme Sales')
    await act(async () => { await grabbed!.rename(SALES, 'Acme Sales West') })
    await settle()
    expect(box.textContent).toBe('Acme Sales West')
    expect(asked.filter((a) => a === 'GET /me/organizations')).toHaveLength(2)
  })

  it('asks nothing for nobody', async () => {
    const box = await show(h(CauthyProvider, { initialSession: null, children: h(Names) }))
    expect(box.textContent).toBe('')
    expect(asked.some((a) => a.includes('/me/organizations'))).toBe(false)
  })

  it('tells a list it could not get from an empty one', async () => {
    down = 'refused'
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(Names) }))
    expect(box.textContent).toBe('error:forbidden')
    expect(grabbed!.organizations).toEqual([])
    expect(grabbed!.error?.status).toBe(403)
    down = 'unreachable'
    await act(async () => { await grabbed!.reload() })
    expect(grabbed!.error?.code).toBe('unavailable')
    down = null
    await act(async () => { await grabbed!.reload() })
    expect(box.textContent).toBe('Acme Sales')
    expect(grabbed!.error).toBeNull()
  })

  it("lists one system's only when asked", async () => {
    await show(h(CauthyProvider, { initialSession: ana, children: h(Names, { system: 'acme-crm' }) }))
    expect(asked).toContain('GET /me/organizations?system=acme-crm')
  })
})
