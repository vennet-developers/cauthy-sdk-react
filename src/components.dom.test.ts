// @vitest-environment jsdom
//
// The forms in a browser: drawn with the application's own parts, filtered,
// ordered, and telling the application what they saved.

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AcceptInvite, Account, AccountPasskeys, ForgotPassword, OrganizationMembers, PendingTerms, ResetPassword, SignIn, SignUp, VerifyEmail } from './components'
import type { AuthComponents, AuthConfirmOptions } from './components'
import { createAuthClient } from '@cauthyhq/js'
import { CauthyProvider } from './react'
import type { PublicSession } from '@cauthyhq/js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Every part, faked with elements of no look: what they are given shows as data.
const h = createElement
const parts: AuthComponents = {
  Form: (p) => h('x-form', { 'data-as': p.as, 'data-class': p.className, 'data-section': p.section, 'aria-busy': p['aria-busy'] === undefined ? undefined : String(p['aria-busy']) }, p.children),
  Button: (p) => h('button', { type: p.type, disabled: p.disabled, onClick: p.onClick, 'data-variant': p.variant, 'data-loading': p.loading ? '' : undefined }, p.children),
  Input: (p) => h('input', { id: p.id, name: p.name, type: p.type, value: p.value, onChange: p.onChange }),
  Checkbox: (p) => h('x-checkbox', { 'data-name': p.name, 'data-checked': String(p.checked), onClick: () => p.onChange(!p.checked) }, p.children),
  Select: (p) => h('x-select', { 'data-name': p.name, 'data-value': p.value, 'data-options': p.options.map((o) => o.value).join(','), 'aria-label': p['aria-label'] }),
  Field: (p) => h('x-field', { 'data-label': String(p.label), 'data-error': p.error ? String(p.error) : undefined }, p.children, p.aside),
  Text: (p) => h('x-text', { 'data-as': p.as ?? 'p', 'data-size': p.size }, p.children),
  Badge: (p) => h('x-badge', { 'data-tone': p.tone }, p.children),
  Link: (p) => h('x-link', { 'data-href': p.href, 'data-new-tab': p.newTab ? '' : undefined }, p.children),
  Divider: (p) => h('x-divider', null, p.label),
  Alert: (p) => h('x-alert', { 'data-tone': p.tone }, p.children),
  Confirm: async () => true,
}

type Answer = { status?: number; body: unknown }
let routes: Record<string, (body: Record<string, unknown>) => Answer | Promise<Answer>>
let sent: { path: string; body: Record<string, unknown>; headers: Record<string, string> }[]

beforeEach(() => {
  sent = []
  routes = {}
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = url.replace(/^\/api\/auth/, '')
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (init?.method === 'POST') sent.push({ path, body, headers: { ...(init.headers as Record<string, string>) } })
    const route = routes[path] ?? routes[path.split('?')[0]]
    const a = route ? await route(body) : path === '/session' ? { body: { session: null, status: 'unauthenticated' } } : { status: 404, body: {} }
    return new Response(JSON.stringify(a.body), { status: a.status ?? 200 })
  })
})

let root: Root | null = null
let box: HTMLElement
afterEach(() => {
  act(() => root?.unmount())
  root = null
  box?.remove()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

const settle = async () => {
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}

async function show(el: ReactNode, session: PublicSession | null = null, more: { locale?: string | (() => string) } = {}) {
  box = document.createElement('div')
  document.body.appendChild(box)
  root = createRoot(box)
  act(() => root!.render(h(CauthyProvider, { initialSession: session, ...more, children: el })))
  await settle()
  return box
}

const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => { (el as HTMLElement).click() })
  await settle()
}
const button = (where: Element, text: string) => [...where.querySelectorAll('button')].find((b) => b.textContent === text)
async function type(where: Element, name: string, value: string) {
  const input = where.querySelector(`input[name="${name}"]`) as HTMLInputElement
  expect(input).toBeTruthy()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit(form: Element | null) {
  expect(form).toBeTruthy()
  await act(async () => { (form as HTMLFormElement).requestSubmit() })
  await settle()
}

/**
 * The elements the form drew itself that carry a look: the raw controls and
 * sentences a design system draws instead, and any class or inline style
 * outside the structural wrappers.
 */
function ownLook(where: Element): string[] {
  const raw = [...where.querySelectorAll('label, select, hr, p, a, h2, input[type=checkbox], input[type=radio], [style]')].map((e) => e.outerHTML)
  const classed = [...where.querySelectorAll('[class]')].filter((e) => !['DIV', 'FORM', 'SECTION', 'UL', 'LI'].includes(e.tagName)).map((e) => e.outerHTML)
  return [...raw, ...classed]
}

/**
 * The elements around the parts the form drew itself instead of the
 * application's `Form`: none, when it gave one.
 */
const rawWrappers = (where: Element) => [...where.querySelectorAll('form, div, section')].map((e) => e.outerHTML)

/** A request held until the test lets it answer. */
function held(answer: Answer) {
  let release!: () => void
  const answered = new Promise<Answer>((resolve) => { release = () => resolve(answer) })
  return { route: () => answered, release }
}

const methods = {
  providers: [{ id: 'google', name: 'Google' }], signUp: true, passwordSignIn: true, magicLink: false, passkey: true,
  legal: { documents: [{ kind: 'terms', version: '1', url: 'https://example.com/terms' }, { kind: 'privacy', version: '1', url: 'https://example.com/privacy' }], consentPurposes: [{ key: 'news', label: 'Send me news', required: false }] },
}
const me = { id: 'u1', email: 'ana@example.com', name: 'Ana', emailVerified: true, hasPassword: true, mfaEnabled: false }
const accountRoutes = () => ({
  '/methods': () => ({ body: methods }),
  '/me': () => ({ body: { account: me } }),
  '/me/sessions': () => ({ body: { sessions: [{ device: 'Mac · Chrome', ip: '203.0.113.7', createdAt: '2026-10-28T12:00:00Z', expiresAt: '2026-11-28T12:00:00Z' }] } }),
  '/me/identities': () => ({ body: { identities: [] } }),
  '/me/mfa/factors': () => ({ body: { totp: false, phone: null, phoneChannels: ['sms', 'whatsapp'] } }),
  '/me/agents': () => ({ body: { agents: [{ id: 'ag1', name: 'Claude', redirectHost: 'claude.ai', resource: { name: 'Acme CRM', uri: 'https://mcp.example.com' }, scopes: [], connectedAt: '2026-10-28T12:00:00Z', lastUsedAt: '2026-10-28T12:00:00Z' }] } }),
})

const owner = { id: 'o1', system: 'acme-crm', name: 'Acme', kind: 'business', role: 'owner', can: { readMembers: true, manageMembers: true, removeMembers: true, update: true, archive: true, delete: true } }
const person = (userId: string, role: string, more: Record<string, unknown> = {}) =>
  ({ userId, email: `${userId}@example.com`, name: '', role, status: 'active', invited: false, manager: false, you: false, since: '2026-10-21T12:00:00Z', ...more })
const memberRoutes = () => ({
  '/me/organizations': () => ({ body: { organizations: [owner] } }),
  '/me/organizations/members': () => ({ body: { members: [person('u1', 'owner', { you: true, manager: true }), person('u2', 'admin', { invited: true }), person('u3', 'reader')] } }),
  '/me/organizations/roles': () => ({ body: { roles: ['owner', 'admin', 'reader'].map((role) => ({ role, name: role[0].toUpperCase() + role.slice(1), description: '', manager: role !== 'reader' })) } }),
})

describe('every part given, and unstyled', () => {
  it('leaves no look of the form\'s own in <SignIn /> and <SignUp />', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const signIn = await show(h(SignIn, { unstyled: true, components: parts, links: { signUp: '/sign-up', forgotPassword: '/forgot' } }))
    expect(signIn.querySelector('x-divider')?.textContent).toBe('or with your email')
    expect(signIn.querySelectorAll('x-field')).toHaveLength(2)
    expect(signIn.querySelector('x-link[data-href="/forgot"]')).toBeTruthy()
    expect(signIn.querySelector('x-link[data-href="/sign-up"]')).toBeTruthy()
    expect(ownLook(signIn)).toEqual([])
    expect(rawWrappers(signIn)).toEqual([])
    act(() => root!.unmount())
    root = null

    const signUp = await show(h(SignUp, { unstyled: true, components: parts, links: { signIn: '/sign-in' } }))
    expect(signUp.querySelectorAll('x-checkbox')).toHaveLength(2)
    expect(signUp.querySelector('x-link[data-href="https://example.com/terms"][data-new-tab]')).toBeTruthy()
    expect(signUp.querySelector('x-field[data-label="Password"]')).toBeTruthy()
    expect(ownLook(signUp)).toEqual([])
    expect(rawWrappers(signUp)).toEqual([])
  })

  it('leaves no look of its own in <Account />', async () => {
    routes = accountRoutes()
    const html = await show(h(Account, { unstyled: true, components: parts }))
    expect([...html.querySelectorAll('x-text[data-as="h2"]')].map((e) => e.textContent)).toEqual(
      ['Profile', 'Email address', 'Password', 'Linked accounts', 'Second step', 'Phone, with its country code', 'Passkeys', 'AI agents', 'Where you are signed in'])
    // The phone's channel, with the application's select.
    expect(html.querySelector('x-select[data-name="channel"]')?.getAttribute('data-options')).toBe('sms,whatsapp')
    expect(ownLook(html)).toEqual([])
    expect(rawWrappers(html)).toEqual([])
    // The screen, and each part in it: forms where they send, groups where they do not.
    // What is already set (the name, the address, the password) shows as it is, not as a form.
    expect(html.querySelector('x-form')?.getAttribute('data-as')).toBe('div')
    expect([...html.querySelectorAll('x-form x-form')].map((e) => e.getAttribute('data-as'))).toEqual(['div', 'div', 'div', 'div', 'form', 'form', 'div', 'div', 'div'])
    // Each part says which it is, for a card per part; the screen says none.
    expect(html.querySelector('x-form')?.hasAttribute('data-section')).toBe(false)
    expect([...html.querySelectorAll('x-form x-form')].map((e) => e.getAttribute('data-section'))).toEqual(
      ['profile', 'email', 'password', 'linked', 'secondStep', 'phone', 'passkeys', 'agents', 'sessions'])
  })

  it('leaves no look of its own in <OrganizationMembers />', async () => {
    routes = memberRoutes()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', unstyled: true, components: parts }))
    expect([...html.querySelectorAll('x-badge')].map((e) => e.textContent)).toEqual(['you', 'manages members', 'invited'])
    // Members already there: adding one and renaming open on their buttons.
    expect([...html.querySelectorAll('x-form')].map((e) => e.getAttribute('data-section'))).toEqual([null, 'members', 'add-member', 'organization'])
    expect(ownLook(html)).toEqual([])
    await click(button(html, 'Add member'))
    await click(button(html, 'Rename'))
    expect(html.querySelector('x-select[data-name="role"]')).toBeTruthy()
    expect(ownLook(html)).toEqual([])
    expect(rawWrappers(html)).toEqual([])
    // The screen; the members; adding one; the organization, with its rename form inside.
    expect([...html.querySelectorAll('x-form')].map((e) => e.getAttribute('data-as'))).toEqual(['div', 'div', 'form', 'div', 'form'])
    expect([...html.querySelectorAll('x-form')].map((e) => e.getAttribute('data-section'))).toEqual([null, 'members', 'add-member', 'organization', 'rename'])
  })

  it('leaves no look of its own in <AcceptInvite /> and <PendingTerms />', async () => {
    routes = { '/methods': () => ({ body: methods }), '/invitation': () => ({ body: { invitation: { email: 'ana@example.com', workspace: 'Acme', organization: 'Acme Books' } } }) }
    window.history.replaceState(null, '', '/accept-invite?token=t1')
    const invite = await show(h(AcceptInvite, { unstyled: true, components: parts }))
    expect(invite.querySelector('x-text[data-as="h2"]')?.textContent).toBe("You've been invited to Acme Books on Acme")
    expect(ownLook(invite).filter((e) => !e.startsWith('<input type="email" name="username"'))).toEqual([])
    expect(rawWrappers(invite)).toEqual([])
    act(() => root!.unmount())
    root = null

    routes = { '/me/legal': () => ({ body: { pending: [{ kind: 'terms', version: '2', url: 'https://example.com/terms' }] } }) }
    const terms = await show(h(PendingTerms, { unstyled: true, components: parts }))
    expect(terms.querySelector('x-link')?.textContent).toBe('the Terms of Service')
    expect(ownLook(terms)).toEqual([])
    expect(rawWrappers(terms)).toEqual([])
  })

  it('draws today\'s elements when no part is given', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(SignUp, {}))
    expect(html.querySelectorAll('label.cauthy-check input[type=checkbox]')).toHaveLength(2)
    expect(html.querySelector('p.cauthy-separator')?.textContent).toBe('or with your email')
    expect(html.querySelector('a.cauthy-link[target=_blank]')?.getAttribute('href')).toBe('https://example.com/terms')
    // What the check above finds, so its emptiness means something.
    expect(ownLook(html).length).toBeGreaterThan(5)
  })

  it('swaps each part alone', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(SignUp, { components: { Checkbox: parts.Checkbox } }))
    expect(html.querySelectorAll('x-checkbox')).toHaveLength(2)
    expect(html.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
    expect(html.querySelector('p.cauthy-separator')).toBeTruthy()
  })
})

describe('<OrganizationMembers />', () => {
  it('offers only the roles that pass, and a member keeps a role that does not', async () => {
    routes = memberRoutes()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', components: parts, roles: (role: string) => role !== 'admin' }))
    await click(button(html, 'Add member'))
    expect(html.querySelector('x-select[data-name="role"]')?.getAttribute('data-options')).toBe('owner,reader')
    expect(html.querySelector('x-select[data-name="role_u2"]')?.getAttribute('data-options')).toBe('admin,owner,reader')
    expect(html.querySelector('x-select[data-name="role_u3"]')?.getAttribute('data-options')).toBe('owner,reader')
  })

  it('names each role as roleLabel says, wherever one shows', async () => {
    routes = memberRoutes()
    const Select: AuthComponents['Select'] = (p) => h('x-select', { 'data-name': p.name, 'data-labels': p.options.map((o) => o.label).join(',') })
    const roleLabel = (c: { role: string; name: string }) => `Acme ${c.name}`
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', roleLabel, components: { Select } }))
    await click(button(html, 'Add member'))
    expect(html.querySelector('x-select[data-name="role"]')?.getAttribute('data-labels')).toBe('Acme Owner,Acme Admin,Acme Reader')
    expect(html.querySelector('x-select[data-name="role_u2"]')?.getAttribute('data-labels')).toBe('Acme Owner,Acme Admin,Acme Reader')
    act(() => root!.unmount())
    root = null

    // A member whose role the person may not change shows it as a word.
    routes = { ...memberRoutes(), '/me/organizations': () => ({ body: { organizations: [{ ...owner, role: 'reader', can: { ...owner.can, manageMembers: false } }] } }) }
    const read = await show(h(OrganizationMembers, { organizationId: 'o1', roleLabel }))
    expect(read.textContent).toContain('Acme Admin')
    expect(read.textContent).not.toMatch(/(?<!Acme )Reader/)
  })

  it('never offers the actions hidden', async () => {
    routes = memberRoutes()
    const all = await show(h(OrganizationMembers, { organizationId: 'o1' }))
    for (const b of ['Archive', 'Delete organization', 'Rename', 'Leave']) expect(button(all, b)).toBeTruthy()
    act(() => root!.unmount())
    root = null
    const some = await show(h(OrganizationMembers, { organizationId: 'o1', hide: ['archive', 'delete', 'rename', 'leave'] }))
    for (const b of ['Archive', 'Delete organization', 'Rename', 'Leave']) expect(button(some, b)).toBeUndefined()
    expect(some.querySelector('input[name="name"]')).toBeNull()
    expect(button(some, 'Remove')).toBeTruthy()
  })

  it('asks the application\'s Confirm, and does nothing when it says no', async () => {
    routes = memberRoutes()
    const asked: AuthConfirmOptions[] = []
    let yes = false
    const Confirm = async (o: AuthConfirmOptions) => { asked.push(o); return yes }
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', components: { Confirm } }))
    await click(button(html, 'Archive'))
    expect(asked[0]).toMatchObject({ title: 'Archive', confirmLabel: 'Archive', cancelLabel: 'Cancel', danger: true })
    expect(asked[0].body).toContain('Archive Acme?')
    expect(sent).toEqual([])
    // No inline question either: the application asked.
    expect(button(html, 'Yes')).toBeUndefined()
    yes = true
    routes['/me/organizations/archive'] = () => ({ body: { status: 'archived', organizationId: 'o1' } })
    await click(button(html, 'Archive'))
    expect(sent.map((s) => s.path)).toEqual(['/me/organizations/archive'])
  })

  it('asks inline when the application gives no Confirm', async () => {
    routes = memberRoutes()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1' }))
    await click([...html.querySelectorAll('li')][2].querySelector('button'))
    expect(html.textContent).toContain('Remove u3@example.com?')
    expect(sent).toEqual([])
  })

  it('says a person already belongs, and changes nobody\'s role', async () => {
    routes = {
      ...memberRoutes(),
      '/me/organizations/members/add': () => ({ status: 409, body: { error: { code: 'member_exists', message: 'already a member', field: 'email' } } }),
    }
    const saved = vi.fn()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', onSaved: saved }))
    await click(button(html, 'Add member'))
    await type(html, 'email', 'u3@example.com')
    await submit(html.querySelector('input[name="email"]')!.closest('form'))
    expect(html.textContent).toContain('That person already belongs to the organization; their role was not changed.')
    expect(sent.map((s) => s.path)).toEqual(['/me/organizations/members/add'])
    expect(saved).not.toHaveBeenCalled()
    act(() => root!.unmount())
    root = null

    const es = await show(h(OrganizationMembers, { organizationId: 'o1', locale: 'es' }))
    await click(button(es, 'Agregar miembro'))
    await type(es, 'email', 'u3@example.com')
    await submit(es.querySelector('input[name="email"]')!.closest('form'))
    expect(es.textContent).toContain('Esa persona ya pertenece a la organización; su rol no cambió.')
  })

  it('tells the application each change it saved', async () => {
    routes = {
      ...memberRoutes(),
      '/me/organizations/members/add': (b) => ({ body: { status: 'added', member: person('u4', String(b.role), { email: String(b.email) }) } }),
      '/me/organizations/members/role': (b) => ({ body: { status: 'changed', userId: b.userId, role: b.role } }),
      '/me/organizations/members/remove': (b) => ({ body: { status: 'removed', userId: b.userId } }),
      '/me/organizations/members/invite': (b) => ({ body: { status: 'sent', userId: b.userId } }),
      '/me/organizations/rename': (b) => ({ body: { status: 'renamed', organization: { ...owner, name: b.name } } }),
      '/me/organizations/delete': () => ({ body: { status: 'deleted', organizationId: 'o1' } }),
    }
    const saved = vi.fn()
    let pickRole: ((v: string) => void) | undefined
    const Select: AuthComponents['Select'] = (p) => {
      if (p.name === 'role_u3') pickRole = p.onChange
      return h('x-select', { 'data-name': p.name })
    }
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', onSaved: saved, components: { Select, Confirm: async () => true } }))

    await click(button(html, 'Add member'))
    await type(html, 'email', 'beto@example.com')
    await submit(html.querySelector('input[name="email"]')!.closest('form'))
    await act(async () => pickRole!('admin'))
    await settle()
    await click(button(html, 'Send the invitation again'))
    await click(button([...html.querySelectorAll('li')][2], 'Remove'))
    await click(button(html, 'Rename'))
    await type(html, 'name', 'Acme Books')
    await submit(html.querySelector('input[name="name"]')!.closest('form'))
    await click(button(html, 'Delete organization'))

    expect(saved.mock.calls.map((c) => c[0])).toEqual([
      { kind: 'member.added', organizationId: 'o1', userId: 'u4', email: 'beto@example.com', role: 'owner' },
      { kind: 'member.role_changed', organizationId: 'o1', userId: 'u3', role: 'admin', previousRole: 'reader' },
      { kind: 'member.invited_again', organizationId: 'o1', userId: 'u2' },
      { kind: 'member.removed', organizationId: 'o1', userId: 'u3' },
      { kind: 'organization.renamed', organizationId: 'o1', name: 'Acme Books' },
      { kind: 'organization.deleted', organizationId: 'o1' },
    ])
  })

  it('says a member left, by their own hand', async () => {
    routes = { ...memberRoutes(), '/me/organizations/members/remove': (b) => ({ body: { status: 'removed', userId: b.userId } }) }
    const saved = vi.fn()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', onSaved: saved, components: { Confirm: async () => true } }))
    await click(button(html, 'Leave'))
    expect(saved).toHaveBeenCalledWith({ kind: 'member.left', organizationId: 'o1', userId: 'u1' })
  })
})

describe('<Account />', () => {
  it('shows the sections asked for, in their order', async () => {
    routes = accountRoutes()
    const html = await show(h(Account, { sections: ['sessions', 'profile', 'agents'] }))
    expect([...html.querySelectorAll('h2')].map((e) => e.textContent)).toEqual(['Where you are signed in', 'Profile', 'AI agents'])
  })

  it('has each part on its own', async () => {
    routes = { ...accountRoutes(), '/methods': () => ({ body: { ...methods, passkeyHere: false } }) }
    const html = await show(h(AccountPasskeys, {}))
    expect([...html.querySelectorAll('h2')].map((e) => e.textContent)).toEqual(['Passkeys'])
    expect(html.querySelector('[data-cauthy]')).toBeTruthy()
  })

  it('tells the application each change it saved', async () => {
    routes = {
      ...accountRoutes(),
      '/me': (b) => ({ body: { status: 'saved', account: { ...me, name: b.name ?? me.name } } }),
      '/me/email': (b) => ({ body: { status: 'sent', email: b.email } }),
      '/me/password': () => ({ body: { status: 'changed', signedIn: true } }),
      '/me/agents/disconnect': (b) => ({ body: { status: 'disconnected', id: b.id } }),
      '/me/sessions/end': () => ({ body: { status: 'ended' } }),
    }
    const saved = vi.fn()
    const html = await show(h(Account, { onSaved: saved, onSignedOut: () => {}, sections: ['profile', 'email', 'password', 'agents', 'sessions'] }))
    const form = () => html.querySelector('form')!

    await click(button(html, 'Change'))
    await type(form(), 'name', 'Ana María')
    await submit(form())
    await click(button(html, 'Change email'))
    await type(form(), 'email', 'ana.maria@example.com')
    await type(form(), 'password', 'the current one')
    await submit(form())
    await click(button(html, 'Change password'))
    await type(form(), 'password', 'the current one')
    await type(form(), 'newPassword', 'a brand new long password')
    await submit(form())
    // Each part is back to what is set, saying what was done.
    expect(html.querySelector('form')).toBeNull()
    await click(button(html, 'Disconnect'))
    await click(button(html, 'Sign out everywhere'))

    expect(saved.mock.calls.map((c) => c[0])).toEqual([
      { kind: 'profile.saved', name: 'Ana María' },
      { kind: 'email.change_requested', email: 'ana.maria@example.com' },
      { kind: 'password.changed' },
      { kind: 'agent.disconnected', id: 'ag1' },
      { kind: 'sessions.ended' },
    ])
  })
})

describe('<AcceptInvite />', () => {
  it('tells the application the invitation was accepted', async () => {
    routes = {
      '/methods': () => ({ body: methods }),
      '/invitation': () => ({ body: { invitation: { email: 'ana@example.com', workspace: 'Acme' } } }),
      '/invitation/accept': () => ({ body: { status: 'signed_in', session: null } }),
    }
    window.history.replaceState(null, '', '/accept-invite?token=t1')
    const saved = vi.fn()
    const done = vi.fn()
    const html = await show(h(AcceptInvite, { onSaved: saved, onSuccess: done }))
    await type(html, 'password', 'a brand new long password')
    await submit(html.querySelector('form'))
    expect(saved).toHaveBeenCalledWith({ kind: 'invitation.accepted', email: 'ana@example.com' })
    expect(done).toHaveBeenCalled()
  })
})

describe('<PendingTerms />', () => {
  it('shows what is owed, accepts it, and then shows nothing', async () => {
    routes = {
      '/me/legal': () => ({ body: { pending: [{ kind: 'terms', version: '2', url: 'https://example.com/terms' }, { kind: 'privacy', version: '3', url: 'https://example.com/privacy' }] } }),
      '/me/legal/accept': () => ({ body: { status: 'accepted' } }),
    }
    const done = vi.fn()
    const html = await show(h(PendingTerms, { onSuccess: done }))
    expect([...html.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://example.com/terms', 'https://example.com/privacy'])
    await click(button(html, 'Accept'))
    expect(sent.map(({ path, body }) => ({ path, body }))).toEqual([{ path: '/me/legal/accept', body: { kinds: ['terms', 'privacy'] } }])
    expect(done).toHaveBeenCalled()
    expect(html.innerHTML).toBe('')
  })

  it('shows nothing when nothing is owed', async () => {
    routes = { '/me/legal': () => ({ body: { pending: [] } }) }
    const html = await show(h(PendingTerms, {}))
    expect(html.innerHTML).toBe('')
  })
})

describe('the application\'s Form', () => {
  // A form layout that sends: what an application's stack component would render.
  const Form: AuthComponents['Form'] = (p) => h(p.as, { 'data-own': '', onSubmit: p.onSubmit, noValidate: p.noValidate, 'aria-busy': p['aria-busy'] }, p.children)

  it('stands in for every step of <SignIn />, the second step included', async () => {
    routes = {
      '/methods': () => ({ body: methods }),
      '/sign-in/email': () => ({ body: { status: 'mfa_required' } }),
      '/sign-in/mfa/methods': () => ({ body: { totp: true, phone: null, push: null, email: null } }),
    }
    const html = await show(h(SignIn, { unstyled: true, components: { Form } }))
    expect(html.querySelector('form[data-own]')).toBeTruthy()
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'the right one')
    await submit(html.querySelector('form'))
    expect(sent.map((s) => s.path)).toContain('/sign-in/email')
    // The second step: the application's form again, sending the code.
    expect(html.querySelector('input[name="code"]')?.closest('form')?.hasAttribute('data-own')).toBe(true)
    expect([...html.querySelectorAll('form')].map((e) => e.hasAttribute('data-own'))).toEqual([true])
  })

  it('stands in for the step a sign-in link opens, and for the code it asks', async () => {
    const opening = held({ body: { status: 'signed_in' } })
    routes = { '/methods': () => ({ body: methods }), '/sign-in/magic-link/verify': opening.route }
    window.history.replaceState(null, '', '/sign-in?ml_token=t1')
    const html = await show(h(SignIn, { unstyled: true, components: parts, onSuccess: () => {} }))
    expect(html.querySelector('x-form')?.getAttribute('aria-busy')).toBe('true')
    expect(rawWrappers(html)).toEqual([])
    opening.release()
    await settle()
  })

  it('opens a mailed link with the choice it carries to stay signed in', async () => {
    routes = { '/methods': () => ({ body: methods }), '/sign-in/magic-link/verify': () => ({ body: { status: 'signed_in' } }) }
    window.history.replaceState(null, '', '/sign-in?ml_token=t1&remember=1')
    await show(h(SignIn, { unstyled: true, components: parts, onSuccess: () => {} }))
    await settle()
    act(() => root!.unmount())
    root = null
    window.history.replaceState(null, '', '/sign-in?ml_token=t2')
    await show(h(SignIn, { unstyled: true, components: parts, onSuccess: () => {} }))
    await settle()
    expect(sent.filter((s) => s.path === '/sign-in/magic-link/verify').map((s) => s.body)).toEqual([{ token: 't1', remember: true }, { token: 't2' }])
  })

  it('stands in for <ForgotPassword />, <ResetPassword /> and <VerifyEmail />', async () => {
    routes = { '/methods': () => ({ body: methods }), '/verify-email': () => ({ body: { status: 'verified' } }) }
    const forgot = await show(h(ForgotPassword, { unstyled: true, components: parts }))
    expect(forgot.querySelector('x-form')?.getAttribute('data-as')).toBe('form')
    expect(rawWrappers(forgot)).toEqual([])
    act(() => root!.unmount())
    root = null

    window.history.replaceState(null, '', '/reset?token=t1')
    const reset = await show(h(ResetPassword, { unstyled: true, components: parts }))
    expect(reset.querySelector('x-form')?.getAttribute('data-as')).toBe('form')
    expect(rawWrappers(reset)).toEqual([])
    act(() => root!.unmount())
    root = null

    window.history.replaceState(null, '', '/verify?token=t1')
    const verify = await show(h(VerifyEmail, { unstyled: true, components: parts }))
    expect(verify.querySelector('x-form')?.getAttribute('data-as')).toBe('div')
    expect(verify.querySelector('x-form')?.getAttribute('aria-busy')).toBe('false')
    expect(rawWrappers(verify)).toEqual([])
  })

  it('is handed the class the application gave the part, and never Cauthy\'s', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(ForgotPassword, { unstyled: true, components: parts, classNames: { form: 'stack gap-3' } }))
    expect(html.querySelector('x-form')?.getAttribute('data-class')).toBe('stack gap-3')
    act(() => root!.unmount())
    root = null
    const plain = await show(h(ForgotPassword, { unstyled: true, components: parts }))
    expect(plain.querySelector('x-form')?.hasAttribute('data-class')).toBe(false)
  })

  it('keeps the look of styles.css on a plain element around it, when the form is not unstyled', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(ForgotPassword, { components: { Form } }))
    const mark = html.querySelector('[data-cauthy]')
    expect(mark?.tagName).toBe('DIV')
    expect(mark?.firstElementChild?.matches('form[data-own]')).toBe(true)
  })

  it('leaves today\'s elements when it is not given', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(ForgotPassword, {}))
    expect(html.querySelector('form.cauthy-form[data-cauthy]')).toBeTruthy()
  })
})

describe('the kinds of buttons', () => {
  it('says which sends the form, which is another way, and which removes', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const signIn = await show(h(SignIn, { unstyled: true, components: parts }))
    const kind = (where: Element, text: string) => [...where.querySelectorAll('button')].find((b) => b.textContent?.includes(text))?.getAttribute('data-variant')
    expect(kind(signIn, 'Sign in with a passkey')).toBe('secondary')
    expect(kind(signIn, 'Continue with Google')).toBe('secondary')
    expect(signIn.querySelector('button[type="submit"]')?.getAttribute('data-variant')).toBe('primary')
    act(() => root!.unmount())
    root = null

    routes = memberRoutes()
    const members = await show(h(OrganizationMembers, { organizationId: 'o1', components: parts }))
    expect(kind(members, 'Remove')).toBe('danger')
    expect(kind(members, 'Leave')).toBe('danger')
    expect(kind(members, 'Delete organization')).toBe('danger')
    expect(kind(members, 'Send the invitation again')).toBe('secondary')
    // The button that opens the form is another way; the one that sends it, the primary.
    expect(kind(members, 'Add member')).toBe('secondary')
    await click(button(members, 'Add member'))
    expect(kind(members, 'Add member')).toBe('primary')
  })

  it('says loading on the pressed one alone, while every one waits', async () => {
    const again = held({ status: 401, body: { error: { code: 'invalid_credentials', message: 'no' } } })
    routes = { '/methods': () => ({ body: methods }), '/sign-in/email': again.route }
    const Button = parts.Button!
    const plain = await show(h(SignIn, { components: { Button } }))
    await type(plain, 'email', 'ana@example.com')
    await type(plain, 'password', 'the wrong one')
    await act(async () => { (plain.querySelector('form') as HTMLFormElement).requestSubmit() })
    const submitButton = plain.querySelector('button[type="submit"]')!
    const passkey = [...plain.querySelectorAll('button')].find((b) => b.textContent === 'Sign in with a passkey')!
    expect(submitButton.hasAttribute('data-loading')).toBe(true)
    expect(passkey.hasAttribute('data-loading')).toBe(false)
    expect((passkey as HTMLButtonElement).disabled).toBe(true)
    again.release()
    await settle()
    expect(submitButton.hasAttribute('data-loading')).toBe(false)
    expect((passkey as HTMLButtonElement).disabled).toBe(false)
  })

  it('says loading on the member\'s button whose action runs', async () => {
    const answer = held({ body: { status: 'sent', userId: 'u2' } })
    routes = { ...memberRoutes(), '/me/organizations/members/invite': answer.route }
    const html = await show(h(OrganizationMembers, { organizationId: 'o1', components: { Button: parts.Button } }))
    const again = button(html, 'Send the invitation again')!
    await act(async () => { again.click() })
    expect(again.hasAttribute('data-loading')).toBe(true)
    expect([...html.querySelectorAll('button[data-loading]')]).toHaveLength(1)
    answer.release()
    await settle()
    expect(html.querySelectorAll('button[data-loading]')).toHaveLength(0)
  })

  it('draws the plain button as before, with no attribute of the kind', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(SignIn, {}))
    expect(html.querySelector('button[type="submit"]')?.outerHTML).toBe('<button type="submit" class="cauthy-button">Sign in</button>')
  })
})

describe('<CauthyProvider locale />', () => {
  it('goes with what the forms send, for the mails to follow it', async () => {
    routes = { '/methods': () => ({ body: methods }), '/forgot-password': () => ({ body: { status: 'sent' } }) }
    document.documentElement.lang = 'en'
    const html = await show(h(ForgotPassword, {}), null, { locale: 'es-CO' })
    await type(html, 'email', 'ana@example.com')
    await submit(html.querySelector('form'))
    expect(sent.find((s) => s.path === '/forgot-password')?.headers['x-cauthy-locale']).toBe('es-CO')
  })

  it('is asked again on every request when it is a function', async () => {
    routes = { '/methods': () => ({ body: methods }), '/forgot-password': () => ({ body: { status: 'sent' } }) }
    let now = 'pt-BR'
    const html = await show(h(ForgotPassword, {}), null, { locale: () => now })
    await type(html, 'email', 'ana@example.com')
    now = 'es'
    await submit(html.querySelector('form'))
    expect(sent.find((s) => s.path === '/forgot-password')?.headers['x-cauthy-locale']).toBe('es')
  })

  it('leaves the page\'s language when it is not given', async () => {
    routes = { '/methods': () => ({ body: methods }), '/forgot-password': () => ({ body: { status: 'sent' } }) }
    document.documentElement.lang = 'fr'
    const html = await show(h(ForgotPassword, {}))
    await type(html, 'email', 'ana@example.com')
    await submit(html.querySelector('form'))
    expect(sent.find((s) => s.path === '/forgot-password')?.headers['x-cauthy-locale']).toBe('fr')
    document.documentElement.lang = ''
  })
})

describe('every error at once', () => {
  const company = { ...methods, organization: { ask: true, required: true } }

  it('<SignUp /> says each empty field, in the order drawn, and focuses the first', async () => {
    routes = { '/methods': () => ({ body: company }) }
    const html = await show(h(SignUp, { components: { Field: parts.Field } }))
    await submit(html.querySelector('form'))
    expect([...html.querySelectorAll('x-field[data-error]')].map((e) => e.getAttribute('data-label'))).toEqual(["Your company's name", 'Email', 'Password'])
    expect(document.activeElement?.getAttribute('name')).toBe('organization')
    expect(sent).toEqual([])
  })

  it('<SignUp /> moves the focus to the first field still wrong, and sends once all are right', async () => {
    routes = { '/methods': () => ({ body: company }), '/sign-up/email': () => ({ body: { status: 'verification_required', email: 'ana@example.com' } }) }
    const html = await show(h(SignUp, {}))
    await type(html, 'organization', 'Acme')
    await submit(html.querySelector('form'))
    expect([...html.querySelectorAll('[role="alert"].cauthy-fieldError')].map((e) => e.textContent)).toEqual(['This is required.', 'This is required.'])
    expect(document.activeElement?.getAttribute('name')).toBe('email')
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'short')
    await submit(html.querySelector('form'))
    expect(document.activeElement?.getAttribute('name')).toBe('password')
    expect(html.querySelectorAll('.cauthy-fieldError')).toHaveLength(1)
    await type(html, 'password', 'a brand new long password')
    await submit(html.querySelector('form'))
    expect(sent.map((s) => s.path)).toEqual(['/sign-up/email'])
  })

  it('<SignIn /> says both the address and the password', async () => {
    routes = { '/methods': () => ({ body: methods }) }
    const html = await show(h(SignIn, { components: { Field: parts.Field } }))
    await submit(html.querySelector('form'))
    expect([...html.querySelectorAll('x-field[data-error]')].map((e) => e.getAttribute('data-label'))).toEqual(['Email', 'Password'])
    expect(document.activeElement?.getAttribute('name')).toBe('email')
    expect(sent).toEqual([])
  })

  it('the password part of <Account /> says both passwords', async () => {
    routes = accountRoutes()
    const html = await show(h(Account, { sections: ['password'], components: { Field: parts.Field } }))
    await click(button(html, 'Change password'))
    await submit(html.querySelector('form'))
    expect([...html.querySelectorAll('x-field[data-error]')].map((e) => e.getAttribute('data-label'))).toEqual(['Current password', 'New password'])
    expect(sent).toEqual([])
  })

  it('<SignUp /> shows no field while the workspace has not said what it asks', async () => {
    const answer = held({ body: company })
    routes = { '/methods': answer.route }
    const html = await show(h(SignUp, {}))
    expect(html.querySelector('input')).toBeNull()
    expect(html.querySelector('.cauthy-form')?.getAttribute('aria-busy')).toBe('true')
    answer.release()
    await settle()
    expect([...html.querySelectorAll('input')].map((e) => e.getAttribute('name'))).toEqual(['organization', 'name', 'email', 'password', 'acceptLegal', 'consent_news'])
  })
})

describe('the button pressed, until the work is over', () => {
  const signedIn = () => ({ body: { status: 'signed_in', session: null } })
  async function signIn(props: Record<string, unknown>) {
    routes = { '/methods': () => ({ body: methods }), '/sign-in/email': signedIn }
    const html = await show(h(SignIn, props))
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'the right one')
    await submit(html.querySelector('form'))
    return html
  }
  const controls = (where: Element) => [...where.querySelectorAll('button, input')] as (HTMLButtonElement | HTMLInputElement)[]

  it('stays loading after the sign-in, with every control disabled, until the form leaves', async () => {
    const onSuccess = vi.fn()
    const html = await signIn({ onSuccess })
    expect(onSuccess).toHaveBeenCalledTimes(1)
    const submitButton = html.querySelector('button[type="submit"]')!
    expect(submitButton.getAttribute('aria-busy')).toBe('true')
    expect(submitButton.querySelector('span.cauthy-spinner[aria-hidden="true"]')).toBeTruthy()
    expect(submitButton.textContent).toBe('Sign in')
    expect(html.querySelector('form')?.getAttribute('aria-busy')).toBe('true')
    expect(controls(html).every((c) => c.disabled)).toBe(true)
    // Still so a while later: nothing frees it but leaving.
    await settle()
    expect(submitButton.getAttribute('aria-busy')).toBe('true')
  })

  it('waits for the Promise onSuccess returns, then is free again while still shown', async () => {
    let moved!: () => void
    const html = await signIn({ onSuccess: () => new Promise<void>((resolve) => { moved = resolve }) })
    const submitButton = html.querySelector('button[type="submit"]')!
    expect(submitButton.getAttribute('aria-busy')).toBe('true')
    expect(controls(html).every((c) => c.disabled)).toBe(true)
    await act(async () => { moved() })
    await settle()
    expect(submitButton.hasAttribute('aria-busy')).toBe(false)
    expect(controls(html).some((c) => c.disabled)).toBe(false)
    expect(html.querySelector('form')?.hasAttribute('aria-busy')).toBe(false)
  })

  it('is free again when the onSuccess Promise fails, and quiet once the form left', async () => {
    let refuse!: () => void
    const html = await signIn({ onSuccess: () => new Promise<void>((_, reject) => { refuse = () => reject(new Error('no route')) }) })
    await act(async () => { refuse() })
    await settle()
    expect((html.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false)
  })

  it('is free again after a refusal, as before', async () => {
    routes = { '/methods': () => ({ body: methods }), '/sign-in/email': () => ({ status: 401, body: { error: { code: 'invalid_credentials', message: 'no' } } }) }
    const html = await show(h(SignIn, { onSuccess: vi.fn() }))
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'the wrong one')
    await submit(html.querySelector('form'))
    expect(html.querySelector('[role="alert"]')).toBeTruthy()
    expect(controls(html).some((c) => c.disabled)).toBe(false)
    expect(html.querySelector('button[aria-busy]')).toBeNull()
  })

  it('disables every field while the request runs', async () => {
    const answer = held({ status: 401, body: { error: { code: 'invalid_credentials', message: 'no' } } })
    routes = { '/methods': () => ({ body: methods }), '/sign-in/email': answer.route }
    const html = await show(h(SignIn, {}))
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'the wrong one')
    await act(async () => { (html.querySelector('form') as HTMLFormElement).requestSubmit() })
    expect([...html.querySelectorAll('input')].every((i) => i.disabled)).toBe(true)
    answer.release()
    await settle()
    expect([...html.querySelectorAll('input')].some((i) => i.disabled)).toBe(false)
  })

  it('shows an icon and no words on the styled button', async () => {
    const html = await signIn({ onSuccess: vi.fn() })
    const submitButton = html.querySelector('button[type="submit"]')!
    expect(submitButton.textContent).toBe('Sign in')
    expect(submitButton.querySelector('.cauthy-spinner')?.textContent).toBe('')
  })

  it('draws an icon that turns by itself when the form is unstyled, and no words', async () => {
    const html = await signIn({ unstyled: true, onSuccess: vi.fn() })
    const submitButton = html.querySelector('button[type="submit"]')!
    expect(submitButton.textContent?.trim()).toBe('Sign in')
    expect(submitButton.getAttribute('aria-busy')).toBe('true')
    expect(submitButton.querySelector('.cauthy-spinner')).toBeNull()
    const icon = submitButton.querySelector('svg')!
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.textContent).toBe('')
    expect(icon.querySelector('animateTransform')?.getAttribute('repeatCount')).toBe('indefinite')
  })

  it('keeps the unstyled icon still for a person who asked for less motion', async () => {
    const was = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia
    try {
      const html = await signIn({ unstyled: true, onSuccess: vi.fn() })
      const icon = html.querySelector('button[type="submit"] svg')!
      expect(icon).toBeTruthy()
      expect(icon.querySelector('animateTransform')).toBeNull()
    } finally {
      window.matchMedia = was
    }
  })

  it('hands the application\'s Button loading until the form leaves', async () => {
    const html = await signIn({ components: { Button: parts.Button }, onSuccess: vi.fn() })
    expect(html.querySelector('button[type="submit"]')?.hasAttribute('data-loading')).toBe(true)
  })

  it('shows the usual form waiting until the workspace says what it offers', async () => {
    const answer = held({ body: methods })
    routes = { '/methods': answer.route }
    const html = await show(h(SignIn, {}))
    expect(html.querySelector('form')?.getAttribute('aria-busy')).toBe('true')
    expect(controls(html).every((c) => c.disabled)).toBe(true)
    answer.release()
    await settle()
    expect(html.querySelector('form')?.hasAttribute('aria-busy')).toBe(false)
    expect(controls(html).some((c) => c.disabled)).toBe(false)
  })

  it('loads on the provider pressed, the others waiting, on the way to it', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {}) // jsdom does not navigate
    routes = { '/methods': () => ({ body: { ...methods, providers: [{ id: 'google', name: 'Google' }, { id: 'github', name: 'GitHub' }] } }) }
    const html = await show(h(SignIn, {}))
    await click(button(html, 'Continue with Google'))
    const google = [...html.querySelectorAll('button')].find((b) => b.textContent?.includes('Google'))!
    const github = [...html.querySelectorAll('button')].find((b) => b.textContent?.includes('GitHub'))!
    expect(google.getAttribute('aria-busy')).toBe('true')
    expect(google.disabled).toBe(true)
    expect(github.hasAttribute('aria-busy')).toBe(false)
    expect(github.disabled).toBe(true)
    // Back to the page the browser kept: free again.
    await act(async () => { window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })) })
    expect(google.hasAttribute('aria-busy')).toBe(false)
    expect(google.disabled).toBe(false)
    quiet.mockRestore()
  })

  it('loads on the passkey button until the form leaves', async () => {
    const answer = held({ body: {} })
    routes = { '/methods': () => ({ body: methods }), '/sign-in/passkey/begin': answer.route }
    const html = await show(h(SignIn, {}))
    const passkey = button(html, 'Sign in with a passkey')!
    await act(async () => { passkey.click() })
    expect(passkey.getAttribute('aria-busy')).toBe('true')
    expect(controls(html).every((c) => c.disabled)).toBe(true)
    answer.release()
    await settle()
  })

  it('<SignUp /> stays loading once the account is made', async () => {
    routes = { '/methods': () => ({ body: { ...methods, legal: undefined } }), '/sign-up/email': signedIn }
    const html = await show(h(SignUp, { onSuccess: vi.fn() }))
    await type(html, 'name', 'Ana')
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'a long enough password 1A!')
    await submit(html.querySelector('form'))
    expect(html.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true')
    expect(controls(html).every((c) => c.disabled)).toBe(true)
  })

  it('<SignUp /> is free again once it asks to confirm the address', async () => {
    routes = { '/methods': () => ({ body: { ...methods, legal: undefined } }), '/sign-up/email': () => ({ body: { status: 'verification_required' } }) }
    const html = await show(h(SignUp, { onSuccess: vi.fn() }))
    await type(html, 'name', 'Ana')
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'a long enough password 1A!')
    await submit(html.querySelector('form'))
    expect(html.textContent).toContain('Almost there')
    expect(html.querySelector('[aria-busy]')).toBeNull()
  })

  it('<PendingTerms /> keeps its button loading until the application\'s Promise settles', async () => {
    let moved!: () => void
    routes = { '/me/legal': () => ({ body: { pending: [{ kind: 'terms', version: '2', url: 'https://example.com/terms' }] } }), '/me/legal/accept': () => ({ body: { status: 'accepted' } }) }
    const html = await show(h(PendingTerms, { onSuccess: () => new Promise<void>((resolve) => { moved = resolve }) }))
    await click(button(html, 'Accept and continue') ?? html.querySelector('button'))
    expect(html.querySelector('button')?.getAttribute('aria-busy')).toBe('true')
    await act(async () => { moved() })
    await settle()
    expect(html.querySelector('button')).toBeNull()
  })

  it('"sign out everywhere" keeps its button loading while the application moves on', async () => {
    let moved!: () => void
    routes = { ...accountRoutes(), '/me/sessions/end': () => ({ body: { status: 'signed_out' } }) }
    const html = await show(h(Account, { sections: ['sessions'], onSignedOut: () => new Promise<void>((resolve) => { moved = resolve }) }))
    const end = button(html, 'Sign out everywhere')!
    await click(end)
    expect(end.getAttribute('aria-busy')).toBe('true')
    await act(async () => { moved() })
    await settle()
    expect(end.hasAttribute('aria-busy')).toBe(false)
  })
})

describe('<SignIn />: the quick ways in first, then the form', () => {
  const withLink = { ...methods, magicLink: true }
  const before = (a: Element | null | undefined, b: Element | null | undefined) =>
    !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

  it('draws the passkey, the providers and the sign-in link above the "or", and the form below it', async () => {
    routes = { '/methods': () => ({ body: withLink }) }
    const html = await show(h(SignIn, { unstyled: true, components: parts, links: { signUp: '/sign-up' } }))
    const quick = [...html.querySelectorAll('button[type="button"]')].map((b) => b.textContent)
    expect(quick).toEqual(['Sign in with a passkey', 'Continue with Google', 'Email me a sign-in link'])
    for (const text of quick) expect(button(html, text!)?.getAttribute('data-variant')).toBe('secondary')
    const or = html.querySelector('x-divider')
    expect(before(button(html, 'Email me a sign-in link'), or)).toBe(true)
    expect(before(or, html.querySelector('input[name="email"]'))).toBe(true)
    expect(before(html.querySelector('input[name="password"]'), html.querySelector('button[type="submit"]'))).toBe(true)
    expect(html.querySelector('button[type="submit"]')?.getAttribute('data-variant')).toBe('primary')
    expect(before(html.querySelector('button[type="submit"]'), html.querySelector('x-link[data-href="/sign-up"]'))).toBe(true)
  })

  it('opens the sign-in link\'s step with the address typed, sends it, and comes back', async () => {
    const sending = held({ body: { status: 'sent' } })
    routes = { '/methods': () => ({ body: withLink }), '/sign-in/magic-link': sending.route }
    const html = await show(h(SignIn, { components: { Button: parts.Button } }))
    await type(html, 'email', 'ana@example.com')
    await click(button(html, 'Email me a sign-in link'))
    expect((html.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('ana@example.com')
    expect(html.querySelector('input[name="password"]')).toBeNull()
    expect(button(html, 'Sign in with a passkey')).toBeUndefined()

    // Back: the quick ways in and the form, the address kept.
    await click(button(html, 'Back'))
    expect(button(html, 'Sign in with a passkey')).toBeTruthy()
    expect((html.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('ana@example.com')

    await click(button(html, 'Email me a sign-in link'))
    const send = html.querySelector('button[type="submit"]')!
    expect(send.textContent).toBe('Send me the link')
    expect(send.getAttribute('data-variant')).toBe('primary')
    await act(async () => { (html.querySelector('form') as HTMLFormElement).requestSubmit() })
    expect(send.hasAttribute('data-loading')).toBe(true)
    sending.release()
    await settle()
    expect(sent.find((s) => s.path === '/sign-in/magic-link')?.body).toMatchObject({ email: 'ana@example.com' })
    expect(html.querySelector('input[name="code"]')).toBeTruthy()
  })

  it('says an empty address in the link\'s step, and sends nothing', async () => {
    routes = { '/methods': () => ({ body: withLink }) }
    const html = await show(h(SignIn, { components: { Field: parts.Field } }))
    await click(button(html, 'Email me a sign-in link'))
    await submit(html.querySelector('form'))
    expect([...html.querySelectorAll('x-field[data-error]')].map((e) => e.getAttribute('data-label'))).toEqual(['Email'])
    expect(sent).toEqual([])
  })

  it('without the password, makes the address the sign-in link\'s, with no second link button', async () => {
    routes = { '/methods': () => ({ body: { ...withLink, passwordSignIn: false } }), '/sign-in/magic-link': () => ({ body: { status: 'sent' } }) }
    const html = await show(h(SignIn, { components: { Button: parts.Button, Divider: parts.Divider } }))
    expect(html.querySelector('input[name="password"]')).toBeNull()
    expect(button(html, 'Email me a sign-in link')).toBeUndefined()
    expect([...html.querySelectorAll('button[type="button"]')].map((b) => b.textContent)).toEqual(['Sign in with a passkey', 'Continue with Google'])
    const send = html.querySelector('button[type="submit"]')!
    expect(send.textContent).toBe('Send me the link')
    expect(before(html.querySelector('x-divider'), html.querySelector('input[name="email"]'))).toBe(true)
    await type(html, 'email', 'ana@example.com')
    await submit(html.querySelector('form'))
    expect(sent.map((s) => s.path)).toEqual(['/sign-in/magic-link'])
    expect(html.querySelector('input[name="code"]')).toBeTruthy()
  })

  it('with only the sign-in link, asks the address alone, with no "or"', async () => {
    routes = { '/methods': () => ({ body: { ...withLink, passwordSignIn: false, passkey: false, providers: [] } }) }
    const html = await show(h(SignIn, { unstyled: true, components: parts }))
    expect(html.querySelector('x-divider')).toBeNull()
    expect([...html.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Send me the link'])
    expect(html.querySelector('input[name="email"]')).toBeTruthy()
  })
})

// A setup form shows only while nothing is set. Once something is, the part
// shows what is set with its actions, and the form opens on the action, with
// a Cancel back to what is set.
describe('<Account />: what is set, then the form on its action', () => {
  const field = (where: Element, name: string) => where.querySelector(`input[name="${name}"]`)

  it('shows the name and opens its form on Change; an empty name shows the form, with no Cancel', async () => {
    routes = accountRoutes()
    const html = await show(h(Account, { sections: ['profile'] }))
    expect(html.textContent).toContain('Ana')
    expect(field(html, 'name')).toBeNull()
    await click(button(html, 'Change'))
    expect((field(html, 'name') as HTMLInputElement).value).toBe('Ana')
    await click(button(html, 'Cancel'))
    expect(field(html, 'name')).toBeNull()
    expect(sent).toEqual([])
    act(() => root!.unmount())
    root = null

    routes = { ...accountRoutes(), '/me': () => ({ body: { account: { ...me, name: '' } } }) }
    const empty = await show(h(Account, { sections: ['profile'] }))
    expect(field(empty, 'name')).toBeTruthy()
    expect(button(empty, 'Cancel')).toBeUndefined()
  })

  it('shows the address and opens its form on Change email', async () => {
    routes = accountRoutes()
    const html = await show(h(Account, { sections: ['email'] }))
    expect(html.textContent).toContain('ana@example.com')
    expect(field(html, 'email')).toBeNull()
    await click(button(html, 'Change email'))
    expect(field(html, 'email')).toBeTruthy()
    expect(field(html, 'password')).toBeTruthy()
    await click(button(html, 'Cancel'))
    expect(field(html, 'email')).toBeNull()
  })

  it('says the account has a password and opens its form on Change password', async () => {
    routes = accountRoutes()
    const html = await show(h(Account, { sections: ['password'], locale: 'es' }))
    expect(html.querySelector('h2')?.textContent).toBe('Contraseña')
    expect(html.textContent).toContain('Tu cuenta tiene contraseña.')
    expect(field(html, 'newPassword')).toBeNull()
    await click(button(html, 'Cambiar contraseña'))
    expect(field(html, 'newPassword')).toBeTruthy()
    await click(button(html, 'Cancelar'))
    expect(field(html, 'newPassword')).toBeNull()
  })

  it('second step: the steps while it is off; once on, Turn off and New recovery codes ask for the password only when pressed', async () => {
    routes = accountRoutes()
    const off = await show(h(Account, { sections: ['secondStep'] }))
    expect(field(off, 'password')).toBeTruthy()
    expect(button(off, 'Turn on')).toBeTruthy()
    act(() => root!.unmount())
    root = null

    routes = { ...accountRoutes(), '/me': () => ({ body: { account: { ...me, mfaEnabled: true } } }), '/me/mfa/disable': () => ({ body: { status: 'disabled' } }) }
    const saved = vi.fn()
    const on = await show(h(Account, { sections: ['secondStep'], onSaved: saved }))
    expect(on.textContent).toContain('On: signing in also asks for a code')
    expect(field(on, 'password')).toBeNull()
    expect(button(on, 'New recovery codes')).toBeTruthy()
    await click(button(on, 'Turn off'))
    expect(field(on, 'password')).toBeTruthy()
    await click(button(on, 'Cancel'))
    expect(field(on, 'password')).toBeNull()
    expect(sent).toEqual([])
    await click(button(on, 'Turn off'))
    await type(on, 'password', 'the current one')
    await submit(on.querySelector('form'))
    expect(sent.map((s) => [s.path, s.body])).toEqual([['/me/mfa/disable', { password: 'the current one' }]])
    expect(saved).toHaveBeenCalledWith({ kind: 'mfa.disabled' })
  })

  it('second step: turning it on shows the QR Cauthy drew, the key and the link', async () => {
    const qr = 'data:image/png;base64,iVBORw0KGgo='
    routes = { ...accountRoutes(), '/me/mfa/setup': () => ({ body: { status: 'started', secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Acme:ana?secret=JBSWY3DPEHPK3PXP', qr } }) }
    const html = await show(h(Account, { sections: ['secondStep'], classNames: { qr: 'acme-qr' } }))
    await type(html, 'password', 'the current one')
    await submit(html.querySelector('form'))
    const img = html.querySelector('img.acme-qr') as HTMLImageElement
    expect(img?.getAttribute('src')).toBe(qr)
    expect(img?.getAttribute('alt')).toBe('QR code to add this account to an authenticator app')
    expect(html.textContent).toContain('JBSWY3DPEHPK3PXP')
    expect(html.querySelector('a[href^="otpauth://"]')).toBeTruthy()
  })

  it('second step: from an older Cauthy with no QR, the key and the link still show', async () => {
    routes = { ...accountRoutes(), '/me/mfa/setup': () => ({ body: { status: 'started', secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Acme:ana?secret=JBSWY3DPEHPK3PXP' } }) }
    const html = await show(h(Account, { sections: ['secondStep'] }))
    await type(html, 'password', 'the current one')
    await submit(html.querySelector('form'))
    expect(html.querySelector('img')).toBeNull()
    expect(html.textContent).toContain('JBSWY3DPEHPK3PXP')
  })

  it('second step on, for an account without a password: the action runs at once', async () => {
    routes = { ...accountRoutes(), '/me': () => ({ body: { account: { ...me, hasPassword: false, mfaEnabled: true } } }), '/me/mfa/recovery-codes': () => ({ body: { status: 'renewed', recoveryCodes: ['aaaa-1111', 'bbbb-2222'] } }) }
    const html = await show(h(Account, { sections: ['secondStep'] }))
    await click(button(html, 'New recovery codes'))
    expect(sent.map((s) => s.path)).toEqual(['/me/mfa/recovery-codes'])
    expect([...html.querySelectorAll('ul code')].map((e) => e.textContent)).toEqual(['aaaa-1111', 'bbbb-2222'])
  })

  it('phone: the form while there is none; once there, the masked number and its channel, and Remove phone asks for the password', async () => {
    routes = accountRoutes()
    const none = await show(h(Account, { sections: ['phone'] }))
    expect(field(none, 'phone')).toBeTruthy()
    act(() => root!.unmount())
    root = null

    routes = { ...accountRoutes(), '/me/mfa/factors': () => ({ body: { totp: false, phone: { number: '+57 ••• ••• 4567', channel: 'whatsapp' }, phoneChannels: ['sms', 'whatsapp'] } }) }
    const html = await show(h(Account, { sections: ['phone'] }))
    expect(html.textContent).toContain('Codes go to +57 ••• ••• 4567. · WhatsApp')
    expect(field(html, 'phone')).toBeNull()
    expect(field(html, 'password')).toBeNull()
    await click(button(html, 'Remove phone'))
    expect(field(html, 'password')).toBeTruthy()
    await click(button(html, 'Cancel'))
    expect(field(html, 'password')).toBeNull()
    expect(sent).toEqual([])
  })

  it('passkeys: the form while there is none; once there, the list and Add a passkey', async () => {
    vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {})
    if (!navigator.credentials) Object.defineProperty(navigator, 'credentials', { value: { get: () => null, create: () => null }, configurable: true })
    const here = { ...methods, passkeyHere: true }
    routes = { ...accountRoutes(), '/methods': () => ({ body: here }), '/me/passkeys': () => ({ body: { passkeys: [] } }) }
    const none = await show(h(Account, { sections: ['passkeys'] }))
    expect(none.textContent).toContain('No passkey yet.')
    expect(field(none, 'name')).toBeTruthy()
    expect(button(none, 'Cancel')).toBeUndefined()
    act(() => root!.unmount())
    root = null

    routes = { ...accountRoutes(), '/methods': () => ({ body: here }), '/me/passkeys': () => ({ body: { passkeys: [{ id: 'p1', name: 'My laptop', kind: 'synced', createdAt: '2026-10-28T12:00:00Z', lastUsedAt: null }] } }) }
    const html = await show(h(Account, { sections: ['passkeys'] }))
    expect(html.textContent).toContain('My laptop')
    expect(field(html, 'name')).toBeNull()
    expect(button(html, 'Remove')).toBeTruthy()
    await click(button(html, 'Add a passkey'))
    expect(field(html, 'name')).toBeTruthy()
    expect(button(html, 'Add a security key')).toBeTruthy()
    await click(button(html, 'Cancel'))
    expect(field(html, 'name')).toBeNull()
  })
})

describe('<OrganizationMembers />: what is set, then the form on its action', () => {
  it('shows the form to add the first member as it is, and opens it on Add member once others belong', async () => {
    routes = { ...memberRoutes(), '/me/organizations/members': () => ({ body: { members: [person('u1', 'owner', { you: true, manager: true })] } }) }
    const alone = await show(h(OrganizationMembers, { organizationId: 'o1' }))
    expect(alone.querySelector('input[name="email"]')).toBeTruthy()
    expect(button(alone, 'Cancel')).toBeUndefined()
    act(() => root!.unmount())
    root = null

    routes = memberRoutes()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1' }))
    expect(html.querySelector('input[name="email"]')).toBeNull()
    await click(button(html, 'Add member'))
    expect(html.querySelector('input[name="email"]')).toBeTruthy()
    await click(button(html, 'Cancel'))
    expect(html.querySelector('input[name="email"]')).toBeNull()
  })

  it('shows the name and opens the rename form on Rename', async () => {
    routes = memberRoutes()
    const html = await show(h(OrganizationMembers, { organizationId: 'o1' }))
    expect(html.querySelector('input[name="name"]')).toBeNull()
    await click(button(html, 'Rename'))
    expect((html.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Acme')
    await click(button(html, 'Cancel'))
    expect(html.querySelector('input[name="name"]')).toBeNull()
    expect(sent).toEqual([])
  })
})

describe('recovery codes: Copy all and Download .txt', () => {
  const codes = ['aaaa-1111', 'bbbb-2222', 'cccc-3333']
  const on = () => ({ ...accountRoutes(), '/me': () => ({ body: { account: { ...me, mfaEnabled: true } } }), '/me/mfa/recovery-codes': () => ({ body: { status: 'renewed', recoveryCodes: codes } }) })
  async function freshCodes(locale?: 'en' | 'es') {
    routes = on()
    const html = await show(h(Account, { sections: ['secondStep'], locale }))
    await click(button(html, locale === 'es' ? 'Nuevos códigos de recuperación' : 'New recovery codes'))
    await type(html, 'password', 'the current one')
    await submit(html.querySelector('form'))
    return html
  }

  it('copies every code, one per line, and says so', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const html = await freshCodes()
    expect([...html.querySelectorAll('ul code')].map((e) => e.textContent)).toEqual(codes)
    await click(button(html, 'Copy all'))
    expect(writeText).toHaveBeenCalledWith('aaaa-1111\nbbbb-2222\ncccc-3333')
    expect(html.textContent).toContain('The codes were copied.')
  })

  it('says so when the browser will not copy, and the codes stay on screen', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied') } }, configurable: true })
    const html = await freshCodes('es')
    await click(button(html, 'Copiar todos'))
    expect(html.textContent).toContain('No se pudieron copiar los códigos.')
    expect(html.querySelectorAll('ul code')).toHaveLength(3)
  })

  it('saves them as recovery-codes.txt, and keeps them out of logs and storage', async () => {
    let file: Blob | null = null
    const made = vi.fn((b: Blob) => { file = b; return 'blob:codes' })
    const freed = vi.fn()
    const before = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }
    Object.assign(URL, { createObjectURL: made, revokeObjectURL: freed })
    const clicked: { href: string; download: string }[] = []
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push({ href: this.href, download: this.download }) })
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m))
    try {
      const html = await freshCodes()
      await click(button(html, 'Download .txt'))
      expect(clicked).toEqual([{ href: 'blob:codes', download: 'recovery-codes.txt' }])
      const read = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(file!) })
      expect(read).toBe('Recovery codes\n\naaaa-1111\nbbbb-2222\ncccc-3333\n')
      expect(freed).toHaveBeenCalledWith('blob:codes')
      // The link was only there for the click.
      expect(document.querySelector('a[download]')).toBeNull()
      expect(window.localStorage.length).toBe(0)
      expect(window.sessionStorage.length).toBe(0)
      for (const spy of logs) expect(JSON.stringify(spy.mock.calls)).not.toContain('aaaa-1111')
    } finally {
      Object.assign(URL, before)
      anchorClick.mockRestore()
      for (const spy of logs) spy.mockRestore()
    }
  })

  it('come with the phone\'s first second step too', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true })
    let phone: { number: string; channel: string } | null = null
    routes = {
      ...accountRoutes(),
      '/me/mfa/factors': () => ({ body: { totp: false, phone, phoneChannels: ['sms'] } }),
      '/me/mfa/phone': () => ({ body: { status: 'sent', sentTo: '+57 ••• ••• 4567' } }),
      '/me/mfa/phone/verify': () => { phone = { number: '+57 ••• ••• 4567', channel: 'sms' }; return { body: { status: 'enabled', recoveryCodes: codes } } },
    }
    const html = await show(h(Account, { sections: ['phone'], locale: 'es' }))
    await type(html, 'phone', '+57 300 000 4567')
    await type(html, 'password', 'the current one')
    await submit(html.querySelector('form'))
    await type(html, 'code', '123456')
    await submit(html.querySelector('form'))
    expect([...html.querySelectorAll('ul code')].map((e) => e.textContent)).toEqual(codes)
    expect(button(html, 'Copiar todos')).toBeTruthy()
    expect(button(html, 'Descargar .txt')).toBeTruthy()
    expect(button(html, 'Quitar teléfono')).toBeTruthy()
    expect(html.querySelector('input[name="phone"]')).toBeNull()
  })
})

describe('keeping the person signed in', () => {
  const remember = (where: Element) => where.querySelector('input[name="remember"]') as HTMLInputElement | null

  it('offers the box only where the application\'s client allows it', async () => {
    routes = { '/methods': () => ({ body: { ...methods, persistentSessions: false } }) }
    expect(remember(await show(h(SignIn, {})))).toBeNull()
    act(() => root?.unmount())
    box.remove()
    routes = { '/methods': () => ({ body: methods }) }
    expect(remember(await show(h(SignIn, {})))).toBeNull()
    act(() => root?.unmount())
    box.remove()
    routes = { '/methods': () => ({ body: { ...methods, persistentSessions: true } }) }
    expect(remember(await show(h(SignIn, {})))).toBeTruthy()
  })

  it('posts the choice with the sign-in, and only when ticked', async () => {
    routes = { '/methods': () => ({ body: { ...methods, persistentSessions: true } }), '/sign-in/email': () => ({ body: { status: 'signed_in', session: null } }) }
    const html = await show(h(SignIn, {}))
    await type(html, 'email', 'ana@example.com')
    await type(html, 'password', 'the right one')
    await submit(html.querySelector('form'))
    expect(sent.find((s) => s.path === '/sign-in/email')!.body.remember).toBeUndefined()
    act(() => root?.unmount())
    box.remove()
    sent = []
    const again = await show(h(SignIn, {}))
    await type(again, 'email', 'ana@example.com')
    await type(again, 'password', 'the right one')
    await click(remember(again))
    expect(remember(again)!.checked).toBe(true)
    await submit(again.querySelector('form'))
    expect(sent.find((s) => s.path === '/sign-in/email')!.body.remember).toBe(true)
  })

  it('puts the box before every way of signing in, once', async () => {
    routes = { '/methods': () => ({ body: { ...methods, persistentSessions: true } }) }
    const html = await show(h(SignIn, {}))
    expect(html.querySelectorAll('input[name="remember"]')).toHaveLength(1)
    const box = remember(html)!
    const before = (el: Element | null | undefined) => !!el && !!(box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(before(button(html, 'Google') ?? [...html.querySelectorAll('button')].find((b) => b.textContent?.includes('Google')))).toBe(true)
    expect(before(html.querySelector('input[name="email"]'))).toBe(true)
    expect(before(html.querySelector('input[name="password"]'))).toBe(true)
  })

  it('asks a provider with the choice in the link', () => {
    const client = createAuthClient()
    expect(client.signIn.socialUrl('google', { returnTo: '/books', remember: true })).toBe('/api/auth/sign-in/social/google?return_to=%2Fbooks&remember=1')
    expect(client.signIn.socialUrl('google')).toBe('/api/auth/sign-in/social/google')
    expect(client.signIn.ssoUrl({ connection: 'okta' }, { remember: true })).toBe('/api/auth/sign-in/sso?connection=okta&remember=1')
  })
})
