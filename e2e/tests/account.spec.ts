import { expect, signIn, test } from './base'

test.describe('the account', () => {
  test('changes the name, and the session on screen follows', async ({ page }) => {
    await signIn(page)
    await expect(page.getByTestId('who')).toHaveText('Signed in as Acme Member')
    await page.goto('/account')
    for (const [from, to] of [['Acme Member', 'Acme Member Renamed'], ['Acme Member Renamed', 'Acme Member']]) {
      await page.getByRole('button', { name: 'Change', exact: true }).click()
      await page.locator('input[name="name"]').fill(to)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Saved.')
      await expect(page.getByRole('button', { name: `Account menu for ${to}` })).toBeVisible()
      expect(from).not.toBe(to)
    }
  })
})
