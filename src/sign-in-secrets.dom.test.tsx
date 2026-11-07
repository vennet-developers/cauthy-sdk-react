// @vitest-environment jsdom
// What <SignIn /> keeps once the password has done its work: nothing of it.
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignIn } from './components'
import { CauthyProvider } from './react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SECRET = 'right-password-1234'
beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace(/^\/api\/auth/, '')
    const headers = { 'cauthy-protocol': '1' }
    if (path === '/methods') return Response.json({ providers: [], passwordSignIn: true, signUp: true }, { headers })
    if (path === '/sign-in/email') return Response.json({ status: 'mfa_required', next: 'mfa' }, { headers })
    if (path === '/sign-in/mfa/methods') return Response.json({ totp: true, phone: null, push: null, email: null }, { headers })
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
const settle = async () => {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}

interface Fiber { child: Fiber | null; sibling: Fiber | null; memoizedState: unknown }
interface Hook { memoizedState: unknown; next: Hook | null }
/** Every value a hook of the tree under `box` holds. */
function heldStates(box: Element): unknown[] {
  const key = Object.keys(box).find((k) => k.startsWith('__reactContainer$'))!
  const out: unknown[] = []
  const walk = (f: Fiber | null) => {
    for (; f; f = f.sibling) {
      let hook = f.memoizedState as Hook | null
      while (hook && typeof hook === 'object' && 'next' in hook) {
        out.push(hook.memoizedState)
        hook = hook.next
      }
      walk(f.child)
    }
  }
  walk((box as unknown as Record<string, { child: Fiber | null }>)[key].child)
  return out
}

describe('<SignIn /> and the second step', () => {
  it('forgets the password once the server asks for the second step', async () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    root = createRoot(box)
    act(() => root!.render(h(CauthyProvider, { initialSession: null, children: h(SignIn) })))
    await settle()
    const set = async (name: string, value: string) => {
      const input = box.querySelector(`input[name="${name}"]`) as HTMLInputElement
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    await set('email', 'ana@acme.com')
    await set('password', SECRET)
    expect(heldStates(box)).toContain(SECRET)
    await act(async () => { (box.querySelector('form') as HTMLFormElement).requestSubmit() })
    await settle()
    expect(box.querySelector('input[name="code"]')).not.toBeNull()
    expect(heldStates(box)).not.toContain(SECRET)
  })
})
