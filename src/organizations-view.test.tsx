// @vitest-environment jsdom
import { act, createElement as h, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrganizationSeat, PublicSession } from '@cauthyhq/js'
import { Organizations } from './organizations-view'
import { CauthyProvider } from './react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SALES = '3b2f6c1e-8d4a-4c7e-9f10-2a6b5c8d9e01'
const SUPPORT = '5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f'
const can = { readMembers: true, manageMembers: true, removeMembers: true, update: true, archive: true, delete: true }
const seats: OrganizationSeat[] = [
  { id: SALES, system: 'acme-crm', name: 'Acme Sales', kind: 'customer', role: 'owner', can },
  { id: SUPPORT, system: 'acme-crm', name: 'Acme Support', kind: 'customer', role: 'member', can },
]
const ana: PublicSession = { user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false }, tenantId: 't1', roles: [], organizations: [], expiresAt: new Date(Date.now() + 600_000).toISOString() }

let asked: string[]
let listed: OrganizationSeat[]
beforeEach(() => {
  asked = []
  listed = seats
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace(/^\/api\/auth/, '')
    asked.push(`${init?.method ?? 'GET'} ${path}`)
    const headers = { 'cauthy-protocol': '1' }
    if (path === '/me/organizations') return Response.json({ organizations: listed }, { headers })
    if (path.startsWith('/me/organizations/members?')) {
      const who = path.endsWith(SALES) ? { name: 'Bo', email: 'bo@acme.com' } : { name: 'Cy', email: 'cy@acme.com' }
      return Response.json({ members: [{ userId: 'u2', ...who, role: 'member', status: 'active', invited: false, manager: false, you: false, since: '2026-11-01T12:00:00Z' }] }, { headers })
    }
    if (path.startsWith('/me/organizations/roles?')) return Response.json({ roles: [{ role: 'member', name: 'Member', description: '', manager: false }] }, { headers })
    return Response.json({ session: ana, status: 'authenticated' }, { headers })
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
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}
async function show(el: ReactNode) {
  const box = document.createElement('div')
  document.body.appendChild(box)
  root = createRoot(box)
  act(() => root!.render(h(CauthyProvider, { initialSession: ana, children: el })))
  await settle()
  return box
}
const picks = (box: Element) => [...box.querySelectorAll('.cauthy-organization')] as HTMLButtonElement[]

describe('<Organizations />', () => {
  it('lists the organizations, the first shown with its people', async () => {
    const box = await show(h(Organizations))
    expect(picks(box).map((b) => b.querySelector('span')!.textContent)).toEqual(['Acme Sales', 'Acme Support'])
    expect(picks(box)[0].getAttribute('aria-current')).toBe('true')
    expect(asked).toContain(`GET /me/organizations/members?id=${SALES}`)
    expect(box.textContent).toContain('bo@acme.com')
  })

  it('shows another when the person picks it, and tells the application', async () => {
    const onSelect = vi.fn()
    const box = await show(h(Organizations, { onSelect }))
    await act(async () => { picks(box)[1].click() })
    await settle()
    expect(onSelect).toHaveBeenCalledWith(seats[1])
    expect(picks(box)[1].getAttribute('aria-current')).toBe('true')
    expect(picks(box)[0].getAttribute('aria-current')).toBeNull()
    expect(box.textContent).toContain('cy@acme.com')
  })

  it('shows only the list when asked', async () => {
    await show(h(Organizations, { showMembers: false }))
    expect(asked.some((a) => a.includes('/me/organizations/members'))).toBe(false)
  })

  it('says when the person belongs to none', async () => {
    listed = []
    const box = await show(h(Organizations))
    expect(box.textContent).toContain('You do not belong to any organization yet.')
  })
})
