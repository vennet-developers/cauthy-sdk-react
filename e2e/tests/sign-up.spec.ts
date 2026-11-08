import { PASSWORD } from '../accounts'
import { expect, test } from './base'

test.describe('signing up', () => {
  test('creates an account and is signed in', async ({ page, browserName }) => {
    await page.goto('/sign-up')
    await page.locator('input[name="name"]').fill('Acme Newcomer')
    await page.locator('input[name="email"]').fill(`new.${browserName}@example.com`)
    await page.locator('input[name="password"]').fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByTestId('who')).toHaveText('Signed in as Acme Newcomer')
  })
})
