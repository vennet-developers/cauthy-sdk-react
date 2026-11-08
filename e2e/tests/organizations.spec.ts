import { ORGANIZATION } from '../accounts'
import { expect, signIn, test } from './base'

test.describe('organizations', () => {
  test('lists them, their people, and what the person may do', async ({ page }) => {
    await signIn(page)
    await expect(page.getByTestId('can-write')).toHaveText('can write deals')
    await page.goto('/organizations')
    await expect(page.getByRole('button', { name: new RegExp(ORGANIZATION.name) })).toHaveAttribute('aria-current', 'true')
    await expect(page.getByText('member@example.com').first()).toBeVisible()
  })
})
