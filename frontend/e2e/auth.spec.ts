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
    await expect(page.getByRole('link', { name: 'Создать список' }).first()).toBeVisible({ timeout: 15000 })
  })

  test('T1.1.2 Регистрация с уже занятым email', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://localhost:8000'
    await request.post(`${apiBase}/api/auth/register`, {
      data: { email: 'dup-e2e@example.com', password: 'password123' },
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Регистрация' }).click()
    await page.locator('#register-email').fill('dup-e2e@example.com')
    await page.locator('#register-password').fill('password123')
    await page.locator('#register-password-confirm').fill('password123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/already registered|Email уже|занят/i)).toBeVisible()
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

  test('T1.1.4 Регистрация со слабым паролем', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Регистрация' }).click()
    await page.locator('#register-email').fill('weak@example.com')
    await page.locator('#register-password').fill('123')
    await page.locator('#register-password-confirm').fill('123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

    await expect(page.getByText(/Пароль не менее|at least 8/i).first()).toBeVisible()
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
    await expect(page.getByRole('link', { name: 'Создать список' }).first()).toBeVisible({ timeout: 15000 })
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

  test('T1.2.3 Несуществующий email', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#login-email').fill('nonexistent@example.com')
    await page.locator('#login-password').fill('anypassword1')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page.locator('.text-destructive')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('T1.2.4 Выход', async ({ page, request }) => {
    const email = `logout-${Date.now()}@example.com`
    const apiBase = process.env.API_URL || 'http://localhost:8000'
    const reg = await request.post(`${apiBase}/api/auth/register`, {
      data: { email, password: 'password123' },
    })
    if (!reg.ok) throw new Error(`Register failed: ${reg.status} ${await reg.text()}`)
    const body = await reg.json()
    const token = body.access_token

    await page.goto('/')
    await page.evaluate((t: string) => {
      localStorage.setItem('auth_token', t)
    }, token)
    await page.reload()
    await expect(page.getByRole('link', { name: 'Создать список' }).first()).toBeVisible({ timeout: 15000 })

    // На десктопе «Выйти» в выпадающем меню профиля; на мобильном — кнопка в bottom nav
    const logoutButton = page.getByRole('button', { name: 'Выйти' })
    const logoutMenuitem = page.getByRole('menuitem', { name: 'Выйти' })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
    } else {
      await page.getByRole('button', { name: /Профиль|Profile/ }).click()
      await logoutMenuitem.click()
    }
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Войти' }).first()).toBeVisible()
  })
})
