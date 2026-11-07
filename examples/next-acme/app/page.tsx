import { Organizations, SignIn, UserButton } from '@cauthyhq/react'

export default function Home() {
  return (
    <main>
      <header>
        <UserButton signInHref="/" />
      </header>
      <SignIn returnTo="/" />
      <Organizations />
    </main>
  )
}
