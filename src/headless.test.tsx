// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicSession } from '@cauthyhq/js'
import { useSignInFlow } from './headless'
import { CauthyProvider, useSession } from './react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ana: PublicSession = { user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false }, tenantId: 't1', roles: [], organizations: [], expiresAt: new Date(Date.now() + 600_000).toISOString() }
let current: PublicSession | null
beforeEach(() => {
  current = null
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace(/^\/api\/auth/, '')
    const headers = { 'cauthy-protocol': '1' }
    if (path === '/sign-in/email') return Response.json({ status: 'mfa_required', next: 'mfa' }, { headers })
    if (path === '/sign-in/mfa') {
      current = ana
      return Response.json({ status: 'signed_in', session: ana, next: 'done' }, { headers })
    }
    return Response.json({ session: current, status: current ? 'authenticated' : 'unauthenticated' }, { headers })
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

let flow: ReturnType<typeof useSignInFlow> | null = null
function Flow() {
  flow = useSignInFlow()
  const { session } = useSession()
  return h('p', null, `${flow.step.name}|${flow.busy}|${flow.error?.code ?? '-'}|${session?.user.name ?? '-'}`)
}

describe('useSignInFlow', () => {
  it('walks the second step, and the provider hears the session', async () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    root = createRoot(box)
    act(() => root!.render(h(CauthyProvider, { initialSession: null, children: h(Flow) })))
    await settle()
    expect(box.textContent).toBe('start|false|-|-')
    await act(async () => { await flow!.password({ email: 'ana@acme.com', password: 'right-password' }) })
    expect(box.textContent).toBe('mfa|false|-|-')
    await act(async () => { await flow!.code('123456') })
    await settle()
    expect(box.textContent).toBe('done|false|-|Ana')
  })
})
