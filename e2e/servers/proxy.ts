// The browser's one origin for the suite (:4100): the demo application's
// files, and /api/auth/* passed to the backend under test, recorded into the
// fixture, or answered from it.
//
//   E2E_MODE=live   BACKEND_URL=http://localhost:4201 npx tsx e2e/servers/proxy.ts
//   E2E_MODE=record BACKEND_URL=http://localhost:4201 npx tsx e2e/servers/proxy.ts
//   E2E_MODE=replay npx tsx e2e/servers/proxy.ts
//
// The page names its test in `X-E2E-Scenario`. In replay, a request is
// answered by the first exchange of its test not yet served with the same
// method, path and query (a GET asked once more than recorded gets the same
// answer again). What does not match, a POST without X-Cauthy-Request: 1,
// and a POST whose body keys differ from the recording are problems, which
// the test reads at its end from /__e2e/problems.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, request as forward, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { keysOf, readFixture, writeFixture, type Exchange, type Fixture } from './fixture'

const port = Number(process.env.E2E_PORT ?? 4100)
const mode = (process.env.E2E_MODE ?? 'live') as 'live' | 'record' | 'replay'
const backend = new URL(process.env.BACKEND_URL ?? 'http://localhost:4201')
const dist = resolve('e2e/app/dist')
const SCENARIO = 'x-e2e-scenario'
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.map': 'application/json' }

const recording: Fixture | null = mode === 'record' ? { ...readFixture(), protocol: 1, recordedFrom: process.env.E2E_RECORDED_FROM ?? '@cauthyhq/node' } : null
const fixture: Fixture | null = mode === 'replay' ? readFixture() : null
const served = new Map<string, Set<number>>()
const problems = new Map<string, string[]>()
const problem = (scenario: string, text: string) => problems.set(scenario, [...(problems.get(scenario) ?? []), text])

const pick = (h: Record<string, string | string[] | undefined>, names: string[]) =>
  Object.fromEntries(names.filter((n) => typeof h[n] === 'string').map((n) => [n, h[n] as string]))
const json = (raw: Buffer): unknown => {
  try {
    return raw.length ? JSON.parse(raw.toString('utf8')) : null
  } catch {
    return raw.toString('utf8')
  }
}
const read = (req: IncomingMessage) => new Promise<Buffer>((done) => {
  const chunks: Buffer[] = []
  req.on('data', (c: Buffer) => chunks.push(c))
  req.on('end', () => done(Buffer.concat(chunks)))
})

function files(req: IncomingMessage, res: ServerResponse) {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  let file = normalize(join(dist, path))
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html')
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
  createReadStream(file).pipe(res)
}

function live(req: IncomingMessage, res: ServerResponse, raw: Buffer, scenario: string) {
  const headers = { ...req.headers }
  delete headers[SCENARIO]
  // The Host stays the page's: the backend sees the origin it serves.
  const up = forward({ hostname: backend.hostname, port: backend.port, method: req.method, path: req.url, headers }, (answer) => {
    res.writeHead(answer.statusCode ?? 502, answer.headers)
    const chunks: Buffer[] = []
    answer.on('data', (c: Buffer) => {
      chunks.push(c)
      res.write(c)
    })
    answer.on('end', () => {
      res.end()
      if (!recording || scenario === '') return
      const url = new URL(req.url ?? '/', 'http://x')
      const exchange: Exchange = {
        request: { method: req.method ?? 'GET', path: url.pathname, query: url.search, headers: pick(req.headers, ['content-type', 'accept', 'x-cauthy-request']), body: json(raw) },
        response: {
          status: answer.statusCode ?? 0,
          headers: pick(answer.headers, ['content-type', 'cache-control', 'cauthy-protocol', 'location', 'allow']),
          setCookie: answer.headers['set-cookie'] ?? [],
          body: Buffer.concat(chunks).toString('utf8'),
        },
      }
      ;(recording.scenarios[scenario] ??= []).push(exchange)
      writeFixture(recording)
    })
  })
  up.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'text/plain' })
    res.end(`backend unreachable: ${e.message}`)
  })
  up.end(raw)
}

function replay(req: IncomingMessage, res: ServerResponse, raw: Buffer, scenario: string) {
  const url = new URL(req.url ?? '/', 'http://x')
  const list = fixture!.scenarios[scenario] ?? []
  const done = served.get(scenario) ?? new Set<number>()
  served.set(scenario, done)
  const same = (e: Exchange) => e.request.method === req.method && e.request.path === url.pathname && e.request.query === url.search
  let i = list.findIndex((e, n) => !done.has(n) && same(e))
  if (i < 0 && req.method === 'GET') for (let n = list.length - 1; n >= 0 && i < 0; n--) if (same(list[n])) i = n
  if (i < 0) {
    problem(scenario, `${req.method} ${url.pathname}${url.search} is not in the recording`)
    res.writeHead(599, { 'content-type': 'text/plain' })
    return void res.end('not in the fixture')
  }
  done.add(i)
  const e = list[i]
  if (req.method === 'POST') {
    if (req.headers['x-cauthy-request'] !== '1') problem(scenario, `POST ${url.pathname} without X-Cauthy-Request: 1`)
    const sent = keysOf(json(raw)).join(',')
    const recorded = keysOf(e.request.body).join(',')
    if (sent !== recorded) problem(scenario, `POST ${url.pathname} sent {${sent}}; the recording sent {${recorded}}`)
  }
  const headers: Record<string, string | string[]> = { ...e.response.headers }
  if (e.response.setCookie.length > 0) headers['set-cookie'] = e.response.setCookie
  res.writeHead(e.response.status, headers)
  res.end(e.response.body)
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const raw = await read(req)
  const scenario = String(req.headers[SCENARIO] ?? '')
  if (url.pathname === '/__e2e/health') return void res.end('ok')
  if (url.pathname === '/__e2e/begin' && req.method === 'POST') {
    const name = String((json(raw) as { scenario?: string } | null)?.scenario ?? '')
    served.delete(name)
    problems.delete(name)
    if (recording) recording.scenarios[name] = []
    res.writeHead(204)
    return void res.end()
  }
  if (url.pathname === '/__e2e/problems') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return void res.end(JSON.stringify(problems.get(url.searchParams.get('scenario') ?? '') ?? []))
  }
  if (url.pathname.startsWith('/api/auth')) return mode === 'replay' ? replay(req, res, raw, scenario) : live(req, res, raw, scenario)
  files(req, res)
}).listen(port, () => console.log(`e2e proxy on :${port} (${mode}${mode === 'replay' ? '' : ` -> ${backend.origin}`})`))
