// @vitest-environment jsdom
import { act, createElement as h, startTransition, Suspense, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicSession } from '@cauthyhq/js'
import { CauthyProvider, useAuth, useSession } from './react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ana: PublicSession = {
  user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false },
  tenantId: 't1', roles: [], organizations: [], expiresAt: new Date(Date.now() + 600_000).toISOString(),
}
let asked: string[]
let current: PublicSession | null
beforeEach(() => {
  asked = []
  current = null
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace(/^\/api\/auth/, '')
    asked.push(`${init?.method ?? 'GET'} ${path}`)
    const headers = { 'cauthy-protocol': '1' }
    if (path === '/session') return Response.json({ session: current, status: current ? 'authenticated' : 'unauthenticated' }, { headers })
    if (path === '/sign-in/email') {
      current = ana
      return Response.json({ status: 'signed_in', session: ana }, { headers })
    }
    return Response.json({}, { status: 404, headers })
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
function Who() {
  const { session, status } = useSession()
  return h('p', null, `${status}:${session?.user.name ?? '-'}`)
}

describe('<CauthyProvider>', () => {
  it('must be above useSession, and says so', () => {
    expect(() => renderToString(h(Who))).toThrow('@cauthyhq/react: useSession needs <CauthyProvider> above it')
  })

  it('starts from the session the server rendered with, and asks nothing', async () => {
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(Who) }))
    expect(box.textContent).toBe('authenticated:Ana')
    expect(asked).toEqual([])
  })

  it('asks the server once when it was not told', async () => {
    const box = await show(h(CauthyProvider, { children: h(Who) }))
    expect(box.textContent).toBe('unauthenticated:-')
    expect(asked).toEqual(['GET /session'])
  })

  it('hears a sign-in made through useAuth, with no reload', async () => {
    let auth: ReturnType<typeof useAuth> | null = null
    function Form() {
      auth = useAuth()
      return h(Who)
    }
    const box = await show(h(CauthyProvider, { initialSession: null, children: h(Form) }))
    await act(async () => { await auth!.signIn.email({ email: 'ana@acme.com', password: 'right-password' }) })
    await settle()
    expect(box.textContent).toBe('authenticated:Ana')
    expect(auth!.session?.user.name).toBe('Ana')
  })

  it('keeps one store across renders, whatever new functions it is given', async () => {
    function App({ n }: { n: number }) {
      return h(CauthyProvider, { fetch: (...a: Parameters<typeof fetch>) => fetch(...a), onProtocolMismatch: () => {}, locale: () => `es-${n}`, children: h(Who) })
    }
    await show(h(App, { n: 1 }))
    act(() => root!.render(h(App, { n: 2 })))
    await settle()
    expect(asked).toEqual(['GET /session'])
  })

  it('takes a new fetch only from a render that was committed', async () => {
    const used: string[] = []
    const answer = (who: string) => (async () => {
      used.push(who)
      return Response.json({ session: null, status: 'unauthenticated' }, { headers: { 'cauthy-protocol': '1' } })
    }) as typeof fetch
    const committed = answer('committed')
    const abandoned = answer('abandoned')
    let ctx: ReturnType<typeof useSession> | null = null
    function Grab() {
      ctx = useSession()
      return null
    }
    const never = new Promise<never>(() => {})
    function Waits(): never {
      throw never
    }
    const app = (f: typeof fetch, wait: boolean) =>
      h(CauthyProvider, { initialSession: null, fetch: f, children: h(Suspense, { fallback: null }, h(Grab), wait ? h(Waits) : null) })
    await show(app(committed, false))
    // A transition that never finishes: React renders the provider with the new fetch, then throws that render away.
    act(() => startTransition(() => root!.render(app(abandoned, true))))
    await settle()
    await act(async () => { await ctx!.refresh() })
    expect(used).toEqual(['committed'])
  })

  it('answers the hosted addresses of its mount point', async () => {
    let ctx: ReturnType<typeof useSession> | null = null
    function Grab() {
      ctx = useSession()
      return null
    }
    await show(h(CauthyProvider, { basePath: '/auth/', initialSession: null, children: h(Grab) }))
    expect(ctx!.basePath).toBe('/auth')
    expect(ctx!.accountUrl('/deals')).toBe('/auth/account?return_to=%2Fdeals')
  })
})
