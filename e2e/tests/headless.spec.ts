import { ACCOUNTS, MFA_CODE, PASSWORD } from '../accounts'
import { expect, test } from './base'

test.describe('the headless flow', () => {
  test('walks the second step with a form of the application\'s own', async ({ page }) => {
    await page.goto('/flow')
    await expect(page.getByTestId('step')).toHaveText('start')
    await page.getByLabel('Email').fill(ACCOUNTS[1].email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('step')).toHaveText('mfa')
    await page.getByLabel('Code').fill(MFA_CODE)
    await page.getByRole('button', { name: 'Verify' }).click()
    await expect(page.getByTestId('step')).toHaveText('done')
    await expect(page.getByText('Signed in as Acme Second Step')).toBeVisible()
  })
})
