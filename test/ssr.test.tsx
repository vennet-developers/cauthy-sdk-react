import { createElement as h, type ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PublicSession } from '@cauthyhq/js'
import { AcceptInvite, Account, CauthyProvider, ForgotPassword, OrganizationMembers, Organizations, ResetPassword, SignIn, SignUp, UserButton, VerifyEmail } from '../src/index'

const ana: PublicSession = { user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false }, tenantId: 't1', roles: [], organizations: [], expiresAt: '2026-11-07T20:00:00Z' }
const parts: [string, ComponentType<any>, Record<string, unknown>][] = [
  ['SignIn', SignIn, {}], ['SignUp', SignUp, {}], ['ForgotPassword', ForgotPassword, {}], ['ResetPassword', ResetPassword, {}],
  ['VerifyEmail', VerifyEmail, {}], ['AcceptInvite', AcceptInvite, {}], ['Account', Account, {}],
  ['OrganizationMembers', OrganizationMembers, { organizationId: '3b2f6c1e-8d4a-4c7e-9f10-2a6b5c8d9e01' }], ['Organizations', Organizations, {}], ['UserButton', UserButton, {}],
]

describe('rendering on the server', () => {
  it('has no browser around', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it.each(parts)('draws <%s /> with nobody signed in and with a session', (_name, Part, props) => {
    for (const session of [null, ana]) {
      expect(() => renderToString(h(CauthyProvider, { initialSession: session, children: h(Part, props) }))).not.toThrow()
    }
  })

  it("never writes a theme value that is more than a value into the page's style attribute", () => {
    const evil = 'red;background:url(https://evil.example.com/x.png)'
    const theme = {
      primary: evil,
      accent: '#123456</style><script>alert(1)</script>',
      surface: 'expression(alert(1))',
      text: 'javascript:alert(1)',
      radius: '4px;behavior:url(https://evil.example.com/x.htc)' as unknown as number,
      fontFamily: 'Inter"; } body { background:url(https://evil.example.com/y)',
      border: '#00ff00',
    }
    for (const Part of [SignIn, UserButton, Organizations] as ComponentType<any>[]) {
      const html = renderToString(h(CauthyProvider, { initialSession: ana, theme, children: h(Part, {}) }))
      const styles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]).join(' ')
      for (const bad of ['evil', 'url(', 'expression', 'javascript', '&lt;', 'script', 'behavior', '}']) expect(styles, bad).not.toContain(bad)
      expect(html).not.toContain('evil.example.com')
      // What is a value gets through.
      expect(styles).toContain('--cauthy-border:#00ff00')
    }
  })

  it('draws who is signed in from the session the server read, with no loading', () => {
    expect(renderToString(h(CauthyProvider, { initialSession: ana, children: h(UserButton) }))).toContain('aria-label="Account menu for Ana"')
    expect(renderToString(h(CauthyProvider, { initialSession: null, children: h(UserButton) }))).toContain('>Sign in</button>')
  })
})
