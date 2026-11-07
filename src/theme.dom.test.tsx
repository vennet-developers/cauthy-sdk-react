// @vitest-environment jsdom
// The look: the application's theme from the provider, over the workspace's
// from Cauthy's dashboard. The look is read once per page and mount point, so
// each test that reads it uses a mount point of its own.
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignIn } from './components'
import { CauthyProvider } from './react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let asked: string[]
beforeEach(() => {
  asked = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace(/^\/(api\/auth|merged)/, '')
    asked.push(`${init?.method ?? 'GET'} ${path}`)
    const headers = { 'cauthy-protocol': '1' }
    if (path === '/look') return Response.json({ primary: '#123456', accent: '#abcdef' }, { headers })
    if (path === '/methods') return Response.json({ providers: [], passwordSignIn: true, signUp: true }, { headers })
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
async function show(el: ReturnType<typeof h>) {
  const box = document.createElement('div')
  document.body.appendChild(box)
  root = createRoot(box)
  act(() => root!.render(el))
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  return box
}

describe('the look of the ready-made parts', () => {
  it("lays the application's theme over the workspace's: what it gives wins, the rest stays", async () => {
    const box = await show(h(CauthyProvider, { basePath: '/merged', initialSession: null, theme: { primary: '#e8590c', radius: 12 }, children: h(SignIn) }))
    const form = box.querySelector('[data-cauthy]') as HTMLElement
    expect(asked).toContain('GET /look')
    expect(form.style.getPropertyValue('--cauthy-primary')).toBe('#e8590c')
    expect(form.style.getPropertyValue('--cauthy-radius')).toBe('12px')
    expect(form.style.getPropertyValue('--cauthy-accent')).toBe('#abcdef')
  })

  it("asks for no look when the form keeps none of the workspace's", async () => {
    await show(h(CauthyProvider, { initialSession: null, theme: { primary: '#e8590c' }, children: h(SignIn, { workspaceLook: false }) }))
    expect(asked).not.toContain('GET /look')
  })

  it("reads the workspace's look when the application gives none", async () => {
    const box = await show(h(CauthyProvider, { initialSession: null, children: h(SignIn) }))
    const form = box.querySelector('[data-cauthy]') as HTMLElement
    expect(asked).toContain('GET /look')
    expect(form.style.getPropertyValue('--cauthy-primary')).toBe('#123456')
  })

  it("asks for the workspace's look with the provider's fetch, and its protocol check", async () => {
    const own: string[] = []
    const onProtocolMismatch = vi.fn()
    const ownFetch = (async (url: string) => {
      own.push(String(url))
      // No Cauthy-Protocol header: the provider's handler hears it.
      if (String(url) === '/own-auth/look') return Response.json({ primary: '#654321' })
      return Response.json({ providers: [], passwordSignIn: true, signUp: true }, { headers: { 'cauthy-protocol': '1' } })
    }) as typeof fetch
    const box = await show(h(CauthyProvider, { basePath: '/own-auth', initialSession: null, fetch: ownFetch, onProtocolMismatch, children: h(SignIn) }))
    const form = box.querySelector('[data-cauthy]') as HTMLElement
    expect(own).toContain('/own-auth/look')
    expect(asked.some((a) => a.includes('look'))).toBe(false)
    expect(onProtocolMismatch).toHaveBeenCalledWith(null)
    expect(form.style.getPropertyValue('--cauthy-primary')).toBe('#654321')
  })
})
