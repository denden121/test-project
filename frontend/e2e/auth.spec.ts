import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('T1.1.1 Успешная регистрация', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Регистрация' }).click()

    await page.locator('#register-email').fill(`e2e-${Date.now()}@example.com`)
    await page.locator('#register-password').fill('password123')
    await page.locator('#register-password-confirm').fill('password123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Мои списки', level: 1 })).toBeVisible()
  })

  test('T1.1.3 Регистрация с невалидным email', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Регистрация' }).click()

    await page.locator('#register-email').fill('not-an-email')
    await page.locator('#register-password').fill('password123')
    await page.locator('#register-password-confirm').fill('password123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

    await expect(page.getByText(/Некорректный email|Invalid email/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('T1.2.1 Успешный вход', async ({ page, request }) => {
    const email = `login-${Date.now()}@example.com`
    const password = 'password123'
    const apiBase = process.env.API_URL || 'http://localhost:8000'
    await request.post(`${apiBase}/api/auth/register`, {
      data: { email, password },
    })

    await page.goto('/login')
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Мои списки', level: 1 })).toBeVisible()
  })

  test('T1.2.2 Неверный пароль', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://localhost:8000'
    await request.post(`${apiBase}/api/auth/register`, {
      data: { email: 'wrong-pass@example.com', password: 'correct' },
    })

    await page.goto('/login')
    await page.locator('#login-email').fill('wrong-pass@example.com')
    await page.locator('#login-password').fill('wrong')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page.locator('.text-destructive')).toContainText(/.+/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('T1.2.4 Выход', async ({ page, request }) => {
    const email = `logout-${Date.now()}@example.com`
    const apiBase = process.env.API_URL || 'http://localhost:8000'
    const body = await request.post(`${apiBase}/api/auth/register`, {
      data: { email, password: 'password123' },
    }).then(r => r.json())
    const token = body.access_token

    await page.goto('/')
    await page.evaluate((t: string) => {
      localStorage.setItem('auth_token', t)
    }, token)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Мои списки', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Выйти' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Войти' }).first()).toBeVisible()
  })
})
