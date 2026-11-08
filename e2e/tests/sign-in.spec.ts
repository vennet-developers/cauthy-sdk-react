import { ACCOUNTS, MFA_CODE } from '../accounts'
import { expect, signIn, test } from './base'

test.describe('signing in', () => {
  test('with a password, then out again from the user button', async ({ page }) => {
    await signIn(page)
    await expect(page.getByTestId('who')).toHaveText('Signed in as Acme Member')
    const trigger = page.getByRole('button', { name: 'Account menu for Acme Member' })
    await trigger.click()
    await expect(page.getByRole('menu')).toContainText('member@example.com')
    await expect(page.getByRole('menuitem', { name: 'Manage account' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page.getByTestId('who')).toHaveText('Signed out')
  })

  test('a wrong password is announced, and the form is free again', async ({ page }) => {
    await page.goto('/sign-in')
    await page.locator('input[name="email"]').fill(ACCOUNTS[0].email)
    await page.locator('input[name="password"]').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveAttribute('aria-live', 'assertive')
    await expect(alert).not.toBeEmpty()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
  })

  test('the fields are checked before anything is sent, the first wrong one focused', async ({ page, protocol }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const email = page.locator('input[name="email"]')
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const described = (await email.getAttribute('aria-describedby'))!.split(' ')[0]
    // Read with the field it describes; the form's alert is the live region, not each field.
    const error = page.locator(`[id="${described}"]`)
    await expect(error).not.toBeEmpty()
    await expect(error).not.toHaveAttribute('role', 'alert')
    expect(protocol.posts.filter((p) => p.url.endsWith('/sign-in/email'))).toEqual([])
  })

  test('an account with a second step is asked for its code', async ({ page }) => {
    await signIn(page, ACCOUNTS[1].email)
    await page.locator('input[name="code"]').fill(MFA_CODE)
    await page.getByRole('button', { name: 'Verify', exact: true }).click()
    await expect(page.getByTestId('who')).toHaveText('Signed in as Acme Second Step')
  })
})
