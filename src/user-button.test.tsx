// @vitest-environment jsdom
import { act, createElement as h, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicSession } from '@cauthyhq/js'
import { CauthyProvider } from './react'
import { initialsOf, UserButton } from './user-button'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ana: PublicSession = { user: { id: 'u1', email: 'ana@acme.com', name: 'Ana', emailVerified: true, restricted: false }, tenantId: 't1', roles: [], organizations: [], expiresAt: new Date(Date.now() + 600_000).toISOString() }
let current: PublicSession | null
let sent: { path: string; headers: Record<string, string> }[]
beforeEach(() => {
  current = ana
  sent = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace(/^\/api\/auth/, '')
    const headers = { 'cauthy-protocol': '1' }
    if (init?.method === 'POST') sent.push({ path, headers: { ...(init.headers as Record<string, string>) } })
    if (path === '/sign-out') {
      current = null
      return Response.json({ status: 'signed_out' }, { headers })
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
async function show(el: ReactNode) {
  const box = document.createElement('div')
  document.body.appendChild(box)
  root = createRoot(box)
  act(() => root!.render(el))
  await settle()
  return box
}
const key = async (target: Element, name: string) => {
  await act(async () => { target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true })) })
}

describe('initialsOf', () => {
  it('takes the first and last word of the name, else the address, else a question mark', () => {
    expect(initialsOf('Ana María Pérez', 'ana@acme.com')).toBe('AP')
    expect(initialsOf('Ana', 'ana@acme.com')).toBe('AN')
    expect(initialsOf('', 'bo@acme.com')).toBe('B')
    expect(initialsOf('  ', '')).toBe('?')
  })
})

describe('<UserButton />', () => {
  it('offers to sign in while nobody is: a link to the application\'s page, or the hosted one', async () => {
    current = null
    const box = await show(h(CauthyProvider, { initialSession: null, children: h(UserButton, { signInHref: '/sign-in' }) }))
    const link = box.querySelector('a')!
    expect(link.textContent).toBe('Sign in')
    expect(link.getAttribute('href')).toBe('/sign-in')
    act(() => root!.render(h(CauthyProvider, { initialSession: null, children: h(UserButton) })))
    expect(box.querySelector('button')!.textContent).toBe('Sign in')
  })

  it('waits, disabled, while the session is on its way', () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    root = createRoot(box)
    act(() => root!.render(h(CauthyProvider, { children: h(UserButton) })))
    const button = box.querySelector('button')!
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('names the person, opens its menu from the keyboard, moves through it and closes with Escape', async () => {
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(UserButton, { accountHref: '/account' }) }))
    const trigger = box.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    expect(trigger.getAttribute('aria-label')).toBe('Account menu for Ana')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent).toBe('AN')

    trigger.focus()
    await key(trigger, 'ArrowDown')
    await settle()
    const menu = box.querySelector('[role="menu"]') as HTMLElement
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id)
    const items = [...menu.querySelectorAll('[role="menuitem"]')] as HTMLElement[]
    expect(items.map((i) => i.textContent)).toEqual(['Manage account', 'Sign out'])
    expect(items[0].getAttribute('href')).toBe('/account')
    expect(document.activeElement).toBe(items[0])

    await key(menu, 'ArrowDown')
    expect(document.activeElement).toBe(items[1])
    await key(menu, 'ArrowDown')
    expect(document.activeElement).toBe(items[0])
    await key(menu, 'End')
    expect(document.activeElement).toBe(items[1])
    await key(menu, 'Escape')
    expect(box.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when the person clicks elsewhere', async () => {
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(UserButton) }))
    await act(async () => { (box.querySelector('button') as HTMLButtonElement).click() })
    expect(box.querySelector('[role="menu"]')).not.toBeNull()
    await act(async () => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })
    expect(box.querySelector('[role="menu"]')).toBeNull()
  })

  it('signs out through the server, with the protocol header, and tells the application', async () => {
    const onSignOut = vi.fn()
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(UserButton, { onSignOut }) }))
    await act(async () => { (box.querySelector('button') as HTMLButtonElement).click() })
    const out = [...box.querySelectorAll('[role="menuitem"]')].find((i) => i.textContent === 'Sign out') as HTMLButtonElement
    await act(async () => { out.click() })
    await settle()
    expect(sent).toEqual([expect.objectContaining({ path: '/sign-out' })])
    expect(sent[0].headers['x-cauthy-request']).toBe('1')
    expect(onSignOut).toHaveBeenCalledOnce()
    expect(box.querySelector('button')!.textContent).toBe('Sign in')
  })

  it('speaks Spanish, and carries no look of its own when unstyled', async () => {
    const box = await show(h(CauthyProvider, { initialSession: ana, children: h(UserButton, { locale: 'es', unstyled: true }) }))
    const trigger = box.querySelector('button') as HTMLButtonElement
    expect(trigger.getAttribute('aria-label')).toBe('Menú de la cuenta de Ana')
    expect(box.querySelector('[data-cauthy]')).toBeNull()
    expect(box.querySelector('[class]')).toBeNull()
  })
})
