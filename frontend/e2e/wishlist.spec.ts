import { test, expect } from '@playwright/test'

const apiBase = () => process.env.API_URL || 'http://localhost:8000'

test.describe('Wishlist', () => {
  test('T2.1.1 Успешное создание списка', async ({ page, request }) => {
    const email = `wish-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, {
      data: { email, password: 'password123' },
    })
    const body = await request.post(`${apiBase()}/api/auth/login`, {
      data: { email, password: 'password123' },
    }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Мои списки' })).toBeVisible()

    await page.getByRole('link', { name: 'Создать список' }).click()
    await expect(page).toHaveURL(/\/wishlists\/new/)
    await page.getByLabel('Название списка').fill('День рождения')
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page).toHaveURL(/\/wishlists\/manage\//)
    await expect(page.getByText(/\/wishlists\/s\//)).toBeVisible()
  })

  test('T2.1.2 Создание без названия — валидация', async ({ page, request }) => {
    const email = `wish-val-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())

    await page.goto('/wishlists/new')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto('/wishlists/new')

    await page.getByRole('button', { name: 'Создать' }).click()
    await expect(page.getByText(/Обязательное поле|Required field/i)).toBeVisible()
    await expect(page).toHaveURL(/\/wishlists\/new/)
  })
})
