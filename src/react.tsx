// React: who is signed in, in the browser.
//
//   <CauthyProvider>            // once, at the root
//     <App />
//   </CauthyProvider>
//
//   const { session, status, signIn, signOut } = useSession()
//
// The browser never holds a token: it asks the application's own server
// (`/api/auth/session`), which answers who is signed in and their
// organizations. The session store of @cauthyhq/js keeps it current: it asks
// again a little before the session expires and when the window comes back
// into view.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { createSessionStore, errorFrom, UNAVAILABLE, type AuthClient, type AuthError, type PublicSession, type SessionStore } from '@cauthyhq/js'
import { themeVariables, type CauthyTheme } from '@cauthyhq/js/theme'

export interface SessionContext {
  /** The signed-in person and their organizations, or null. */
  session: PublicSession | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  /** Sends the browser to sign in, and back to `returnTo` (default: where it is now). */
  signIn(options?: { returnTo?: string; locale?: string; prompt?: 'login' }): void
  /** Signs out of this application and of Cauthy in this browser. */
  signOut(): void
  /** Asks the server again who is signed in. */
  refresh(): Promise<PublicSession | null>
  /** Where the person looks after their account: password, second step, passkeys. */
  accountUrl(returnTo?: string): string
  /** Where the server mounted the routes. */
  basePath: string
}

export interface CauthyProviderProps {
  children: ReactNode
  /**
   * Where the server mounted the routes. Default: `/api/auth`. Fixed for the
   * life of the provider: it is the session store's address, so a different
   * one means another store, with the session asked again and every flow
   * started over. To move it, remount the provider (`key={basePath}`).
   */
  basePath?: string
  /**
   * The session the server already read while rendering (SSR): the first
   * paint is then right, with no "loading". `null` means "nobody"; leave it
   * out when the server did not look.
   */
  initialSession?: PublicSession | null
  /**
   * The language the person reads, for what Cauthy mails them from
   * `useAuth()` and the ready-made forms (a sign-in link, a new password, a
   * confirmation): a tag like `es` or `es-CO`, or a function that answers it
   * when the person can change it. Default: the page's own (`<html lang>`),
   * else the browser's.
   */
  locale?: string | (() => string | undefined)
  /**
   * The application's own look for every ready-made part, over the one set in
   * Cauthy's dashboard: colours, corners, typeface. An application built with
   * stackmyth passes its tokens: `theme={themeFromStackmyth(css).theme}`.
   */
  theme?: CauthyTheme
  /** The fetch the routes are called with. Default: the page's own. */
  fetch?: typeof fetch
  /** Called once when the server does not say `Cauthy-Protocol: 1`. Default: one console warning. */
  onProtocolMismatch?: (seen: string | null) => void
}

// A layout effect in the browser, where it runs before anything the commit
// set off; on the server nothing is committed, and an effect is the same no-op.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const StoreCtx = createContext<SessionStore | null>(null)
// What became of each request the store sent: a hook whose client call answers
// only data (an empty list, say) learns here whether the server refused it.
type Outcome = (path: string, error: AuthError | null) => void
const OutcomesCtx = createContext<Set<Outcome> | null>(null)
const ThemeCtx = createContext<CauthyTheme | undefined>(undefined)

export function CauthyProvider({ children, basePath = '/api/auth', initialSession, locale, theme, fetch, onProtocolMismatch }: CauthyProviderProps) {
  // The latest of each, read when a request goes out: a new language or fetch
  // reaches the next request without making the store again. Taken once the
  // render is committed: a render React throws away (a transition that never
  // finished) changes nothing.
  const latest = useRef({ locale, fetch, onProtocolMismatch })
  useIsomorphicLayoutEffect(() => {
    latest.current = { locale, fetch, onProtocolMismatch }
  })
  const readLocale = useCallback(() => {
    const l = latest.current.locale
    return typeof l === 'function' ? l() : l
  }, [])
  // What the server rendered with seeds the store once; later renders do not reset it.
  const first = useRef(initialSession)
  const handsMismatch = useRef(onProtocolMismatch !== undefined)
  const [outcomes] = useState(() => new Set<Outcome>())
  const store = useMemo(
    () => createSessionStore({
      basePath,
      initialSession: first.current,
      locale: readLocale,
      fetch: async (...args: Parameters<typeof globalThis.fetch>) => {
        const [input] = args
        const path = (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).split('?')[0]
        try {
          const res = await (latest.current.fetch ?? globalThis.fetch)(...args)
          if (outcomes.size > 0) {
            const error = res.ok ? null : errorFrom(res.status, await res.clone().json().catch(() => null))
            for (const o of [...outcomes]) o(path, error)
          }
          return res
        } catch (e) {
          for (const o of [...outcomes]) o(path, UNAVAILABLE)
          throw e
        }
      },
      ...(handsMismatch.current ? { onProtocolMismatch: (seen: string | null) => latest.current.onProtocolMismatch?.(seen) } : {}),
    }),
    [basePath, readLocale, outcomes],
  )
  // The provider listens for as long as it is mounted: the session is asked
  // for and kept current even before a part reads it.
  useEffect(() => store.subscribe(() => {}), [store])
  return (
    <StoreCtx.Provider value={store}>
      <OutcomesCtx.Provider value={outcomes}>
        <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>
      </OutcomesCtx.Provider>
    </StoreCtx.Provider>
  )
}

/** The store under the nearest provider. For this package's own parts. */
export function useSessionStore(): SessionStore {
  const store = useContext(StoreCtx)
  if (store === null) throw new Error('@cauthyhq/react: useSession needs <CauthyProvider> above it')
  return store
}

/**
 * Runs `call` and answers what it answered, with the error of the last
 * request it sent to `route` (a path under basePath), or null when that went
 * through. For this package's own parts.
 */
export function useRequestOutcome(): <R>(route: string, call: () => Promise<R>) => Promise<{ value: R; error: AuthError | null }> {
  const outcomes = useContext(OutcomesCtx)
  const store = useSessionStore()
  return useCallback(async (route, call) => {
    let error: AuthError | null = null
    const hear: Outcome = (path, e) => { if (path === `${store.basePath}${route}`) error = e }
    outcomes?.add(hear)
    try {
      return { value: await call(), error }
    } finally {
      outcomes?.delete(hear)
    }
  }, [outcomes, store])
}

/** The provider's `theme`, or undefined. For this package's own parts. */
export function useProviderTheme(): CauthyTheme | undefined {
  return useContext(ThemeCtx)
}

/** The provider's `theme` as the variables styles.css reads, or undefined. For this package's own parts. */
export function useThemeVariables(): CSSProperties | undefined {
  const theme = useContext(ThemeCtx)
  return useMemo(() => (theme ? (themeVariables(theme) as CSSProperties) : undefined), [theme])
}

export function useSession(): SessionContext {
  const store = useSessionStore()
  const state = useSyncExternalStore(store.subscribe, store.get, store.get)
  return useMemo(
    () => ({ session: state.session, status: state.status, refresh: store.refresh, signIn: store.signIn, signOut: store.signOut, accountUrl: store.accountUrl, basePath: store.basePath }),
    [state, store],
  )
}

/**
 * The application's own sign-in screens: the functions a form calls.
 *
 *   const { signIn, signUp, forgotPassword, signOut, session } = useAuth()
 *   const r = await signIn.email({ email, password })
 *
 * They are `createAuthClient()`'s, and what is on screen follows them: after
 * a sign-in or a sign-out, `session` is the new one with no reload.
 */
export function useAuth(): AuthClient & Pick<SessionContext, 'session' | 'status' | 'refresh'> {
  const store = useSessionStore()
  const { session, status, refresh } = useSession()
  return useMemo(() => ({ ...store.auth, session, status, refresh }), [store, session, status, refresh])
}
