import { expect, signIn, test } from './base'

test.describe('the protocol', () => {
  test('the backend says protocol 1, and every POST carries the request header', async ({ page, protocol }) => {
    const session = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/session')
    await page.goto('/')
    expect((await session).headers()['cauthy-protocol']).toBe('1')
    await signIn(page)
    await expect(page.getByTestId('who')).toHaveText('Signed in as Acme Member')
    expect(protocol.posts.length).toBeGreaterThan(0)
  })
})
