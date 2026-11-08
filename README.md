# @cauthyhq/react

Cauthy for React: who is signed in, ready-made sign-in, account and organization screens in a default theme you can restyle, and headless hooks for screens of your own. Built on [`@cauthyhq/js`](https://github.com/vennet-developers/cauthy-sdk-js); talks only to your own server under `/api/auth` (served by [`@cauthyhq/node`](https://github.com/vennet-developers/cauthy-sdk-node) or `cauthy-sdk-go`). The browser never holds a token.

```bash
npm install @cauthyhq/react
```

React 18 or 19. ESM and CommonJS. Every part is marked `'use client'`.

## Five lines

```tsx
import { CauthyProvider, SignIn, UserButton } from '@cauthyhq/react'
import '@cauthyhq/react/styles.css'

<CauthyProvider>
  <UserButton accountHref="/account" signInHref="/sign-in" />
  <SignIn returnTo="/" />
</CauthyProvider>
```

What the form offers (password, passkeys, a sign-in link, Google, your company's SSO, a second step, "keep me signed in") is what the workspace has switched on in Cauthy's dashboard: no code changes when it changes.

## Parts

| Part | What it is |
| --- | --- |
| `SignIn`, `SignUp`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`, `AcceptInvite`, `PendingTerms`, `GoogleOneTap` | The sign-in screens |
| `Account` and `AccountProfile`, `AccountEmail`, `AccountPassword`, `AccountSecondStep`, `AccountPhone`, `AccountPasskeys`, `AccountLinked`, `AccountAgents`, `AccountSessions` | The person's account, whole or one part |
| `Organizations`, `OrganizationMembers` | The person's organizations, and their people |
| `UserButton` | Initials and a menu: the account, sign out |

Hooks: `useSession()`, `useAuth()` (every call of the protocol, the session following), `useOrganizations()`, `useSignInFlow()` (the steps of a sign-in, driven by the server's `next`, for a form of your own), and `can(organization, 'deals', 'write')`.

## Look

`styles.css` draws everything inside `:where()`, so any rule of yours wins. Colours, corners and typeface are `--cauthy-*` variables, set by default to what the workspace chose in Cauthy's dashboard. Your own look, for every part: `<CauthyProvider theme={…}>`. From a stackmyth or shadcn stylesheet: `theme={themeFromStackmyth(css).theme}` or `themeFromCss(css).theme`. Or draw them with your own components (`components`), classes (`classNames`), or none of ours (`unstyled`).

## Server rendering

Next.js app router: put `<CauthyProvider initialSession={session}>` in a layout (the session your server read with `@cauthyhq/node`), and use the parts in any page. TanStack Start and any React server renderer: the same; no part touches the browser while rendering. Import functions such as `can` from `@cauthyhq/js` in server code: everything in this package is a client module.

## Accessibility

Every input is labelled; an error is announced in a live region; the first wrong field takes the focus and names its error; the user menu follows the WAI-ARIA menu button pattern. Checked with axe-core on every `npm test`.

## Moving from `cauthy-auth/react`

Change the import: every component, prop and hook of `cauthy-auth/react` 0.42 is here with the same names. `import 'cauthy-auth/styles.css'` becomes `import '@cauthyhq/react/styles.css'`.

## The browser suite

The Playwright suite (`e2e/`) runs on a developer's machine, not in CI. **Before a release: `npm run e2e:node`**, which drives the demo application against `@cauthyhq/node` in Chromium, Firefox and WebKit (`npx playwright install chromium firefox webkit` once). `npm run e2e:fixture` replays the protocol recorded from it (`e2e/fixture/auth-bff.v1.json`) with no backend, and `npm run e2e:record` records it again. CI checks the recording itself against the spec's route table, with no browser (`e2e/fixture/fixture.test.ts`, part of `npm test`).

### The suite against another backend

`E2E_BACKEND=go GO_BFF_URL=http://localhost:4301 GO_BFF_CMD="<command>" npm run e2e:go`. The backend the command starts must:

1. serve auth-bff version 1 at level `strict` under `/api/auth` on the port of `GO_BFF_URL`, answering `GET /api/auth/session` with `200` once ready;
2. take `E2E_ORIGIN` (`http://localhost:4100`, the proxy the browser sees) as its origin, with cookies without `Secure`;
3. know the accounts of `e2e/accounts.ts`: `member@example.com` (no second step, owner of the organization `3b2f6c1e-8d4a-4c7e-9f10-2a6b5c8d9e01` "Acme Sales" of system `acme-crm`, permissions `deals:read`, `deals:write`, `cauthy:members:*`, `cauthy:organization:*`) and `mfa@example.com` (TOTP, code `123456`), password `acme-e2e-password-1`; sign-ups open, a repeated sign-up with the same password succeeding;
4. need no network.

## Package size

`npm run check:package` holds every JavaScript entry to 45 kB gzipped (React and `@cauthyhq/js` are not in it: they are the application's own copies).

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
