// The backend under the suite: @cauthyhq/node, mounted on Express, on the
// in-memory Cauthy. It listens on :4201; the browser reaches it through the
// proxy on :4100, the origin it is configured for.
//
//   E2E_ORIGIN=http://localhost:4100 npx tsx e2e/backends/node.ts
import { randomBytes } from 'node:crypto'
import express from 'express'
import { createCauthy } from '@cauthyhq/node'
import { cauthyExpress } from '@cauthyhq/node/express'
import { acmeCauthy } from './acme-cauthy'

const port = Number(process.env.E2E_BACKEND_PORT ?? 4201)
const origin = process.env.E2E_ORIGIN ?? 'http://localhost:4100'
const cauthy = acmeCauthy()
const auth = createCauthy({
  issuer: cauthy.issuer,
  clientId: 'acme-crm',
  secret: randomBytes(32).toString('base64url'),
  tenant: cauthy.tenant,
  baseURL: origin,
  fetch: cauthy.fetch,
  pages: { signIn: '/sign-in' },
})
const app = express()
app.use(cauthyExpress(auth))
app.get('/__e2e/health', (_req, res) => void res.send('ok'))
app.listen(port, () => console.log(`@cauthyhq/node backend on :${port}, for ${origin}`))
