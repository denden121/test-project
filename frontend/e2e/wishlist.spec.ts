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
    await expect(page.getByRole('heading', { name: 'Мои списки', level: 1 })).toBeVisible()

    await page.getByRole('link', { name: 'Создать список' }).first().click()
    await expect(page).toHaveURL(/\/wishlists\/new/)
    await page.getByLabel('Название списка').fill('День рождения')
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page).toHaveURL(/\/wishlists\/manage\//)
    await expect(page.getByRole('heading', { name: /Ссылка для друзей|Share link/i })).toBeVisible()
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

  test('T2.1.3 Уникальность slug и открытие по ссылке', async ({ page, request }) => {
    const email = `slug-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'День рождения' } }).then(r => r.json())

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page).toHaveURL(new RegExp(`/wishlists/s/${w.slug}`))
    await expect(page.getByRole('heading', { name: 'День рождения' })).toBeVisible()
  })

  test('T2.3.1 Успешное удаление списка', async ({ page, request }) => {
    const email = `del-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Удалю' } }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await expect(page.getByRole('heading', { name: 'Удалю' })).toBeVisible()

    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Удалить' }).last().click()

    await expect(page).toHaveURL(/\/$/)
    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText(/не найден|not found|404/i)).toBeVisible()
  })

  test('T2.2.1 Успешное изменение названия списка', async ({ page, request }) => {
    const email = `editlist-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Было' } }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByLabel('Название списка').fill('Новое название')
    await page.getByRole('button', { name: 'Сохранить' }).first().click()

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByRole('heading', { name: 'Новое название' })).toBeVisible()
  })

  test('T4.1.1 Копирование ссылки', async ({ page, request }) => {
    const email = `copy-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Для шаринга' } }).then(r => r.json())

    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await expect(page.getByText(/Ссылка для друзей|Share link/i)).toBeVisible()
    const shareInput = page.locator('input[readonly]').first()
    await expect(shareInput).toHaveValue(new RegExp(`/wishlists/s/${w.slug}`))
  })
})
