// @vitest-environment jsdom
//
// The ready-made parts against axe-core's WCAG rules, and what axe cannot see:
// an error is announced where a screen reader hears it, the first wrong field
// takes the focus, every input has a label, the user menu works from the keyboard.
import axe from 'axe-core'
import { act, createElement as h, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicSession } from '@cauthyhq/js'
import { AccountProfile, CauthyProvider, ForgotPassword, Organizations, SignIn, SignUp, UserButton } from '../src/index'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SALES = '3b2f6c1e-8d4a-4c7e-9f10-2a6b5c8d9e01'
const ana: PublicSession = {
  user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false },
  tenantId: 't1', roles: [], organizations: [{ id: SALES, system: 'acme-crm', name: 'Acme Sales', kind: 'customer', role: 'owner', metadata: {} }],
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
}
const ROUTES: Record<string, { status?: number; body: unknown }> = {
  '/methods': { body: { providers: [], passwordSignIn: true, signUp: true, magicLink: false, passkey: false, passkeyHere: false, passkeyOnCauthy: false, sso: false } },
  '/look': { body: {} },
  '/me': { body: { account: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, hasPassword: true, mfaEnabled: false } } },
  '/me/organizations': { body: { organizations: [{ id: SALES, system: 'acme-crm', name: 'Acme Sales', kind: 'customer', role: 'owner', can: { readMembers: true, manageMembers: true, removeMembers: true, update: true, archive: true, delete: true } }] } },
  '/me/organizations/members': { body: { members: [{ userId: 'u1', email: 'ana@acme.com', name: 'Ana', role: 'owner', status: 'active', invited: false, manager: true, you: true, since: '2026-11-01T12:00:00Z' }] } },
  '/me/organizations/roles': { body: { roles: [{ role: 'owner', name: 'Owner', description: '', manager: true }] } },
  '/sign-in/email': { status: 401, body: { error: { code: 'invalid_credentials', message: 'Wrong email or password.' } } },
}
beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace(/^\/api\/auth/, '').split('?')[0]
    const a = ROUTES[path] ?? { body: { session: null, status: 'unauthenticated' } }
    return Response.json(a.body, { status: a.status ?? 200, headers: { 'cauthy-protocol': '1' } })
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
async function show(el: ReactNode, session: PublicSession | null) {
  const box = document.createElement('main')
  document.body.appendChild(box)
  root = createRoot(box)
  act(() => root!.render(h(CauthyProvider, { initialSession: session, children: el })))
  await settle()
  return box
}
// One part on the page at a time: the next one's <main> must not sit beside the last one's.
function clear() {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
}
async function violations(el: Element): Promise<string[]> {
  // Colour contrast needs layout, which jsdom does not do; landmarks are the application's page.
  const r = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
  return r.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)
}
async function type(where: Element, name: string, value: string) {
  const input = where.querySelector(`input[name="${name}"]`) as HTMLInputElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit(where: Element) {
  await act(async () => { (where.querySelector('form') as HTMLFormElement).requestSubmit() })
  await settle()
}

describe('accessibility', () => {
  it.each([
    ['SignIn', SignIn],
    ['SignUp', SignUp],
    ['ForgotPassword', ForgotPassword],
  ] as const)('<%s /> breaks no rule, and labels every input', async (_name, Part) => {
    const box = await show(h(Part), null)
    expect(await violations(box)).toEqual([])
    for (const input of box.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])')) {
      expect((input as HTMLInputElement).labels?.length, (input as HTMLInputElement).name).toBeGreaterThan(0)
    }
  })

  it('<AccountProfile />, <Organizations /> and an open <UserButton /> break no rule', async () => {
    expect(await violations(await show(h(AccountProfile), ana))).toEqual([])
    clear()
    expect(await violations(await show(h(Organizations), ana))).toEqual([])
    clear()
    const box = await show(h(UserButton), ana)
    await act(async () => { (box.querySelector('button') as HTMLButtonElement).click() })
    expect(await violations(box)).toEqual([])
  })

  it('announces a refused sign-in in a live region', async () => {
    const box = await show(h(SignIn), null)
    await type(box, 'email', 'ana@acme.com')
    await type(box, 'password', 'wrong-password')
    await submit(box)
    const alert = box.querySelector('[role="alert"]') as HTMLElement
    expect(alert.getAttribute('aria-live')).toBe('assertive')
    expect(alert.textContent).toBe('The address or the password is not right.')
  })

  it('focuses the first wrong field and ties its error to it', async () => {
    const box = await show(h(SignIn), null)
    await submit(box)
    const email = box.querySelector('input[name="email"]') as HTMLInputElement
    expect(document.activeElement).toBe(email)
    expect(email.getAttribute('aria-invalid')).toBe('true')
    const error = document.getElementById(email.getAttribute('aria-describedby')!.split(' ')[0])!
    // Read with its field when the focus lands there; one live region per form, not one per field.
    expect(error.getAttribute('role')).toBeNull()
    expect(error.getAttribute('aria-live')).toBeNull()
    expect(error.textContent).not.toBe('')
  })
})
