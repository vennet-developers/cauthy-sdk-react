// The Cauthy the suite signs in against when the backend is @cauthyhq/node:
// its in-memory FakeCauthy, taught a second step, a sign-up, the account and
// the organizations. Test-only: it checks nothing a real Cauthy does.
import { FakeCauthy } from '@cauthyhq/node/testing'
import { ACCOUNTS, MFA_CODE, ORGANIZATION } from '../accounts'

export function acmeCauthy(): FakeCauthy {
  const fake = new FakeCauthy()
  fake.ownScreens = true
  fake.settings = { ...fake.settings, allow_signup: true, persistent_sessions: true }
  for (const a of ACCOUNTS) {
    fake.users.set(a.sub, { sub: a.sub, email: a.email, name: a.name, active: true, restricted: false, verified: true })
    fake.passwords.set(a.email, a.password)
  }
  fake.orgs.set(ACCOUNTS[0].sub, [{
    id: ORGANIZATION.id, system: 'acme-crm', name: ORGANIZATION.name, kind: 'customer', role: 'owner', metadata: {},
    permissions: ['deals:read', 'deals:write', 'cauthy:members:*', 'cauthy:organization:*'], denied: [], conditional: [],
  }])

  const challenges = new Map<string, string>() // mfa token -> sub
  let n = 0
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const refuse = (status: number, code: string, message: string) => reply(status, { errors: [{ code, message }] })
  const tokens = (sub: string) => {
    const at = `e2e-at-${++n}`
    const rt = `e2e-rt-${n}`
    fake.access.set(at, sub)
    fake.refresh.set(rt, sub)
    return { access_token: at, refresh_token: rt, token_type: 'Bearer', expires_in: fake.expiresIn, scope: '' }
  }
  const account = (sub: string) => {
    const u = fake.users.get(sub)!
    return { id: u.sub, email: u.email, name: u.name, email_verified: true, has_password: fake.passwords.has(u.email), mfa_enabled: ACCOUNTS.some((a) => a.sub === sub && a.mfa) }
  }
  const can = { read_members: true, manage_members: true, remove_members: true, update: true, archive: true, delete: true }

  const base = fake.fetch
  fake.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = init?.method ?? 'GET'
    const p = url.pathname
    const body = () => JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    const sub = fake.access.get(new Headers(init?.headers).get('authorization')?.replace('Bearer ', '') ?? '')

    if (method === 'POST' && p === '/v1/auth/login') {
      const b = body()
      const a = ACCOUNTS.find((x) => x.mfa && x.email === b.email)
      if (a && b.password === a.password) {
        const token = `e2e-mfa-${++n}`
        challenges.set(token, a.sub)
        return reply(200, { data: { mfa_required: true, mfa_token: token } })
      }
    }
    if (method === 'POST' && p === '/v1/auth/mfa/methods') return reply(200, { data: { totp: true } })
    if (method === 'POST' && p === '/v1/auth/mfa/challenge') {
      const b = body()
      const who = challenges.get(String(b.mfa_token ?? ''))
      if (!who) return refuse(401, 'mfa_token_invalid', 'Sign in again.')
      if (b.code !== MFA_CODE) return refuse(401, 'invalid_code', 'That code is not right.')
      challenges.delete(String(b.mfa_token))
      return reply(200, { data: tokens(who) })
    }
    if (method === 'POST' && p === '/v1/auth/register') {
      const b = body()
      const email = String(b.email ?? '')
      const known = fake.passwords.get(email)
      // The suite runs again against the same process: the same sign-up is the same account.
      if (known !== undefined && known !== b.password) return refuse(409, 'email_taken', 'That address already has an account.')
      if (known === undefined) {
        const id = `u-new-${++n}`
        fake.users.set(id, { sub: id, email, name: String(b.display_name ?? ''), active: true, restricted: false, verified: true })
        fake.passwords.set(email, String(b.password))
      }
      return reply(200, { data: { verification_required: false } })
    }
    if (p === '/v1/auth/me' && sub) {
      if (method === 'PATCH') fake.users.get(sub)!.name = String(body().name ?? fake.users.get(sub)!.name)
      return reply(200, { data: account(sub) })
    }
    if (method === 'GET' && p === '/v1/auth/me/organizations' && sub) {
      return reply(200, { data: (fake.orgs.get(sub) ?? []).map((o) => ({ ...o, can })) })
    }
    const people = p.match(/^\/v1\/auth\/me\/organizations\/([^/]+)\/(members|roles)$/)
    if (method === 'GET' && people && sub) {
      if (!(fake.orgs.get(sub) ?? []).some((o) => o.id === people[1])) return refuse(404, 'organization_not_found', 'That organization no longer exists.')
      if (people[2] === 'roles') {
        return reply(200, { data: [{ role: 'owner', name: 'Owner', description: 'Runs the organization', manager: true }, { role: 'member', name: 'Member', description: 'Works the deals', manager: false }] })
      }
      const u = fake.users.get(sub)!
      return reply(200, { data: [{ user_id: u.sub, email: u.email, name: u.name, role: 'owner', status: 'active', invited: false, manager: true, you: true, since: '2026-11-01T12:00:00Z' }] })
    }
    return base(input, init)
  }
  return fake
}
