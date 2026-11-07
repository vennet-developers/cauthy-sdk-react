import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createAuthClient } from '@cauthyhq/js'
import { AcceptInvite, Account, memberActions, OrganizationMembers, ProviderButtons, ResetPassword, rolesToGive, SignIn, signInOffers, SignUp, useForm } from './components'
import type { AuthMethods, OrganizationPerson, OrganizationSeat } from '@cauthyhq/js'
import type { AuthFormProps } from './components'
import { CauthyProvider } from './react'

const render = (el: ReturnType<typeof createElement>) =>
  renderToString(createElement(CauthyProvider, { initialSession: null, children: el }))

describe('the ready-made forms and styles.css', () => {
  it('carry the mark styles.css draws, unless they are unstyled', () => {
    expect(render(createElement(SignIn))).toMatch(/<form class="cauthy-form" data-cauthy=""/)
    expect(render(createElement(SignIn, { unstyled: true }))).not.toContain('data-cauthy')
    expect(render(createElement(Account))).toMatch(/class="cauthy-account" data-cauthy=""/)
  })

  it('leave a part with a class of its own to it', () => {
    const html = render(createElement(SignIn, { classNames: { button: 'btn btn-primary' } }))
    expect(html).toContain('class="btn btn-primary"')
    expect(html).not.toContain('cauthy-button')
  })
})

describe('the button hierarchy', () => {
  it('underlines a link always, not only under the pointer', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
    const rule = css.match(/:where\(\[data-cauthy\] \.cauthy-link\) \{([^}]*)\}/)
    expect(rule?.[1]).toContain('text-decoration: underline;')
    expect(rule?.[1]).not.toContain('text-decoration: none')
  })

  it('makes the submit the primary button and a link the footer', () => {
    const html = render(createElement(SignIn, { links: { signUp: '/sign-up', forgotPassword: '/forgot' } }))
    expect(html).toMatch(/<button type="submit"[^>]*class="cauthy-button"/)
    expect(html).toMatch(/<a class="cauthy-link" href="\/sign-up">/)
  })
})

describe('the workspace\'s look, in the browser', () => {
  it('is read once per page, in this package\'s names', async () => {
    const asked: string[] = []
    const client = createAuthClient({
      fetch: (async (url: string) => {
        asked.push(url)
        return new Response(JSON.stringify({ primary: '#0e7c9e', button_radius: 4 }), { status: 200 })
      }) as typeof fetch,
    })
    expect(await client.look()).toEqual({ primary: '#0e7c9e', buttonRadius: 4 })
    await client.look()
    expect(asked).toEqual(['/api/auth/look'])
  })

  it('is null when it cannot be read, and the forms keep styles.css\'s own', async () => {
    const client = createAuthClient({ fetch: (async () => new Response('', { status: 503 })) as unknown as typeof fetch })
    expect(await client.look()).toBeNull()
  })
})

describe('<OrganizationMembers />', () => {
  it('carries the mark and waits for the people while it reads them', () => {
    const html = render(createElement(OrganizationMembers, { organizationId: 'a1b2c3d4-0000-4000-8000-000000000001' }))
    expect(html).toMatch(/class="cauthy-account" data-cauthy="" aria-busy="true"/)
  })

  it("reads the organization's people through the application, and nothing when the person may not see them", async () => {
    const asked: string[] = []
    const client = createAuthClient({
      fetch: (async (url: string) => {
        asked.push(url)
        if (url.includes('/members')) return new Response(JSON.stringify({ error: { code: 'not_allowed' } }), { status: 403 })
        return new Response(JSON.stringify({ roles: [{ role: 'owner', name: 'Owner', description: '', manager: true }] }), { status: 200 })
      }) as typeof fetch,
    })
    expect(await client.organizations.members('o1')).toBeNull()
    expect(await client.organizations.roles('o1')).toEqual([{ role: 'owner', name: 'Owner', description: '', manager: true }])
    expect(asked).toEqual(['/api/auth/me/organizations/members?id=o1', '/api/auth/me/organizations/roles?id=o1'])
  })

  const none = { readMembers: true, manageMembers: false, removeMembers: false, update: false, archive: false, delete: false }
  const seat = (role: string, can: Partial<OrganizationSeat['can']>): OrganizationSeat => ({ id: 'o1', system: 'acme-crm', name: 'Acme', kind: 'business', role, can: { ...none, ...can } })
  const member = (role: string, more: Partial<OrganizationPerson> = {}): OrganizationPerson =>
    ({ userId: 'u2', email: 'beto@example.com', name: '', role, status: 'active', invited: false, manager: false, you: false, since: '2026-10-21T12:00:00Z', ...more })

  it('offers Remove only to whom cauthy:members:remove lets, and Leave to everybody', () => {
    expect(memberActions(seat('admin', { manageMembers: true }), member('reader'))).toEqual({ changeRole: true, remove: false, inviteAgain: false })
    expect(memberActions(seat('admin', { removeMembers: true }), member('reader'))).toEqual({ changeRole: false, remove: true, inviteAgain: false })
    expect(memberActions(seat('reader', {}), member('reader', { you: true })).remove).toBe(true)
    expect(memberActions(seat('admin', { manageMembers: true }), member('reader', { invited: true })).inviteAgain).toBe(true)
  })

  it('leaves an owner to the owners', () => {
    const admin = seat('admin', { manageMembers: true, removeMembers: true })
    expect(memberActions(admin, member('owner'))).toMatchObject({ changeRole: false, remove: false })
    expect(memberActions(seat('owner', { manageMembers: true, removeMembers: true }), member('owner'))).toMatchObject({ changeRole: true, remove: true })
    const roles = [{ role: 'owner', name: 'Owner', description: '', manager: true }, { role: 'reader', name: 'Reader', description: '', manager: false }]
    expect(rolesToGive(admin, roles).map((r) => r.role)).toEqual(['reader'])
    expect(rolesToGive(seat('owner', {}), roles).map((r) => r.role)).toEqual(['owner', 'reader'])
  })

  it('renames, archives and deletes the organization through the application', async () => {
    const asked: { url: string; body: unknown }[] = []
    const client = createAuthClient({
      fetch: (async (url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body))
        asked.push({ url, body })
        if (url.endsWith('/rename')) return new Response(JSON.stringify({ status: 'renamed', organization: { ...seat('owner', {}), name: body.name } }), { status: 200 })
        if (url.endsWith('/archive')) return new Response(JSON.stringify({ error: { code: 'not_allowed', message: 'no' } }), { status: 403 })
        return new Response(JSON.stringify({ status: 'deleted', organizationId: body.organizationId }), { status: 200 })
      }) as unknown as typeof fetch,
    })
    expect(await client.organizations.rename('o1', 'Acme Books')).toMatchObject({ ok: true, status: 'renamed', organization: { name: 'Acme Books' } })
    expect(await client.organizations.archive('o1')).toMatchObject({ ok: false, error: { code: 'not_allowed' } })
    expect(await client.organizations.delete('o1')).toEqual({ ok: true, status: 'deleted', organizationId: 'o1' })
    expect(asked).toEqual([
      { url: '/api/auth/me/organizations/rename', body: { organizationId: 'o1', name: 'Acme Books' } },
      { url: '/api/auth/me/organizations/archive', body: { organizationId: 'o1' } },
      { url: '/api/auth/me/organizations/delete', body: { organizationId: 'o1' } },
    ])
    // A name left empty is said here, with nothing sent.
    expect(await client.organizations.rename('o1', ' ')).toMatchObject({ ok: false, error: { code: 'required', field: 'name' } })
    expect(asked.length).toBe(3)
  })
})

describe('a new password\'s field', () => {
  it('says the rule under it, in the form\'s language', () => {
    // <SignUp /> waits for methods() before its fields (tested in the browser); the rule is the same one.
    const html = render(createElement(ResetPassword))
    expect(html).toContain('class="cauthy-hint"')
    expect(html).toContain('Between 12 and 128 characters.')
    expect(render(createElement(ResetPassword, { locale: 'es' }))).toContain('Entre 12 y 128 caracteres.')
  })

  it('<SignUp /> draws no field until the workspace says what it asks, and shows a spinner and no words', () => {
    expect(render(createElement(SignUp))).toBe(
      '<div class="cauthy-form" data-cauthy="" aria-busy="true"><div class="cauthy-pending"><span class="cauthy-spinner" aria-hidden="true"></span></div></div>')
    // Unstyled, an icon that needs no stylesheet. The server draws it still:
    // only the browser knows whether the person asked for less motion.
    const plain = render(createElement(SignUp, { unstyled: true }))
    expect(plain).toMatch(/^<div class="cauthy-form" aria-busy="true"><div class="cauthy-pending"><svg [^>]*aria-hidden="true"[^>]*>.*<\/svg><\/div><\/div>$/)
    expect(plain).not.toContain('animateTransform')
    expect(plain.replace(/<[^>]*>/g, '')).toBe('')
    expect(render(createElement(SignUp, { locale: 'es' }))).not.toMatch(/Cargando|Loading/)
  })

  it('<Account /> and <OrganizationMembers /> wait with a spinner and no words', () => {
    for (const el of [createElement(Account), createElement(OrganizationMembers)]) {
      const html = render(el)
      expect(html).toContain('aria-busy="true"')
      expect(html).toContain('<div class="cauthy-pending"><span class="cauthy-spinner" aria-hidden="true"></span></div>')
      expect(html.replace(/<[^>]*>/g, '')).toBe('')
    }
  })

  it('<SignIn /> shows the usual form, busy and with nothing to press, until the workspace says what it offers', () => {
    const html = render(createElement(SignIn))
    expect(html).toMatch(/<form class="cauthy-form" data-cauthy="" noValidate="" aria-busy="true"/)
    expect(html.match(/<input [^>]*>/g)?.every((i) => i.includes('disabled=""'))).toBe(true)
    expect(html).toMatch(/<button type="submit" disabled="" class="cauthy-button">Sign in<\/button>/)
  })

  it('hears which rules Cauthy refused it for', async () => {
    const client = createAuthClient({
      fetch: (async () => new Response(JSON.stringify({ error: { code: 'weak_password', message: 'no', field: 'password', reasons: ['too_short', 'needs_digit'] } }), { status: 400 })) as unknown as typeof fetch,
    })
    const r = await client.resetPassword({ token: 't', password: 'a long enough one' })
    expect(r).toMatchObject({ ok: false, error: { code: 'weak_password', reasons: ['too_short', 'needs_digit'] } })
  })
})

describe('the provider buttons', () => {
  const providers = [{ id: 'google', name: 'Google', iconUrl: 'https://id.example.com/v1/social/icons/google.svg' }, { id: 'custom:acme-sso', name: 'Acme SSO' }]
  const Probe = (props: AuthFormProps) => createElement(ProviderButtons, { f: useForm(props), providers, onPick: () => {} })

  it("draw each provider's logo before its name, and none where Cauthy serves none", () => {
    const html = render(createElement(Probe))
    expect(html).toContain('<img src="https://id.example.com/v1/social/icons/google.svg" alt="" width="18" height="18" class="cauthy-providerIcon"/>Continue with<!-- --> <!-- -->Google')
    expect(html.match(/<img /g)).toHaveLength(1)
    expect(render(createElement(Probe, { classNames: { providerIcon: 'acme-logo' }, locale: 'es' }))).toMatch(/class="acme-logo"\/>Continuar con/)
  })
})

describe('what <SignIn /> offers', () => {
  const methods = (m: Partial<AuthMethods>): AuthMethods =>
    ({ providers: [], signUp: true, passwordSignIn: true, magicLink: false, passkey: false, passkeyHere: false, passkeyOnCauthy: false, sso: false, ...m })

  it('is the usual form until the workspace says otherwise', () => {
    expect(signInOffers(null)).toEqual({ password: true, email: true, passkey: false })
    expect(signInOffers(methods({ passkey: true }))).toEqual({ password: true, email: true, passkey: true })
  })

  it('leaves the password out where it is off, and the address where nothing uses it', () => {
    expect(signInOffers(methods({ passwordSignIn: false }))).toEqual({ password: false, email: false, passkey: false })
    expect(signInOffers(methods({ passwordSignIn: false, magicLink: true }))).toMatchObject({ password: false, email: true })
    expect(signInOffers(methods({ passwordSignIn: false, sso: true }))).toMatchObject({ password: false, email: true })
  })
})

describe('<AcceptInvite />', () => {
  it('opens the invitation before it asks anything', () => {
    expect(render(createElement(AcceptInvite))).toMatch(/class="cauthy-form" data-cauthy="" aria-busy="true"><p class="cauthy-notice">Opening your invitation…/)
    expect(render(createElement(AcceptInvite, { locale: 'es', unstyled: true }))).toContain('Abriendo tu invitación…')
  })
})
