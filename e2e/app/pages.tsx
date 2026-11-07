// Acme CRM, as small as the suite needs: one page per part, by path.
import { useState, type JSX } from 'react'
import { AccountProfile, can, Organizations, SignIn, SignUp, UserButton, useSession, useSignInFlow } from '@cauthyhq/react'

function Home() {
  const { session, status } = useSession()
  const org = session?.organizations[0]
  return (
    <section>
      <h1>Acme CRM</h1>
      {status === 'authenticated' && <p data-testid="who">Signed in as {session!.user.name}</p>}
      {status === 'unauthenticated' && <p data-testid="who">Signed out</p>}
      {org && <p data-testid="can-write">{can(org, 'deals', 'write') ? 'can write deals' : 'cannot write deals'}</p>}
    </section>
  )
}

function Flow() {
  const flow = useSignInFlow()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  return (
    <section>
      <p data-testid="step">{flow.step.name}</p>
      {flow.error && <p role="alert">{flow.error.message}</p>}
      {flow.step.name === 'start' && (
        <form onSubmit={(e) => { e.preventDefault(); void flow.password({ email, password }) }}>
          <label>Email <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button type="submit" disabled={flow.busy}>Continue</button>
        </form>
      )}
      {flow.step.name === 'mfa' && (
        <form onSubmit={(e) => { e.preventDefault(); void flow.code(code) }}>
          <label>Code <input name="code" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <button type="submit" disabled={flow.busy}>Verify</button>
        </form>
      )}
      {flow.step.name === 'done' && <p>Signed in as {flow.step.session?.user.name}</p>}
    </section>
  )
}

const PAGES: Record<string, () => JSX.Element> = {
  '/': Home,
  '/sign-in': () => <SignIn returnTo="/" links={{ signUp: '/sign-up' }} />,
  '/sign-up': () => <SignUp returnTo="/" links={{ signIn: '/sign-in' }} />,
  '/account': () => <AccountProfile />,
  '/organizations': () => <Organizations />,
  '/flow': Flow,
}

export function App() {
  const Page = PAGES[window.location.pathname] ?? Home
  return (
    <>
      <header>
        <a href="/">Acme CRM</a>
        <UserButton signInHref="/sign-in" accountHref="/account" />
      </header>
      <main>
        <Page />
      </main>
    </>
  )
}
