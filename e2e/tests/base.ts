import { test as base, expect, type Page } from '@playwright/test'
import { ACCOUNTS, PASSWORD } from '../accounts'

export { expect }

interface Protocol {
  /** Every POST the page sent to /api/auth, with its headers. */
  posts: { url: string; headers: Record<string, string> }[]
  /** Every console warning of @cauthyhq/js (a protocol mismatch says so). */
  warnings: string[]
}

export const test = base.extend<{ protocol: Protocol }>({
  protocol: [async ({ page, request }, use, info) => {
    // ASCII only: the name travels in an HTTP header, which cannot carry '›'.
    const scenario = info.titlePath.slice(1).join(' > ')
    await page.setExtraHTTPHeaders({ 'x-e2e-scenario': scenario })
    await request.post('/__e2e/begin', { data: { scenario } })
    const seen: Protocol = { posts: [], warnings: [] }
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname.startsWith('/api/auth/')) seen.posts.push({ url: r.url(), headers: r.headers() })
    })
    page.on('console', (m) => {
      if (m.type() === 'warning' && m.text().includes('@cauthyhq/js')) seen.warnings.push(m.text())
    })
    await use(seen)
    for (const p of seen.posts) expect(p.headers['x-cauthy-request'], p.url).toBe('1')
    expect(seen.warnings).toEqual([])
    const problems = await request.get(`/__e2e/problems?scenario=${encodeURIComponent(scenario)}`)
    expect(await problems.json()).toEqual([])
  }, { auto: true }],
})

export async function signIn(page: Page, email: string = ACCOUNTS[0].email) {
  await page.goto('/sign-in')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}
