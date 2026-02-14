import { test, expect } from '@playwright/test'

const apiBase = () => process.env.API_URL || 'http://localhost:8000'

test.describe('Items (manage list)', () => {
  test('T3.1.1 Добавление товара с полными данными', async ({ page, request }) => {
    const email = `item-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByRole('button', { name: 'Добавить товар' }).first().click()
    await page.getByRole('dialog').getByLabel('Название').fill('Книга')
    await page.getByRole('dialog').getByLabel('Ссылка на товар').fill('https://example.com/book')
    await page.getByRole('dialog').getByLabel('Цена').fill('1000')
    await page.getByRole('dialog').getByLabel('URL картинки').fill('https://example.com/img.jpg')
    await page.getByRole('dialog').getByRole('button', { name: 'Добавить товар' }).click()

    await expect(page.getByText('Книга')).toBeVisible()
    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText('Книга')).toBeVisible()
    await expect(page.getByText('1000')).toBeVisible()
  })

  test('T3.1.2 Добавление только с названием', async ({ page, request }) => {
    const email = `item2-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByRole('button', { name: 'Добавить товар' }).first().click()
    await page.getByRole('dialog').getByLabel('Название').fill('Только название')
    await page.getByRole('dialog').getByRole('button', { name: 'Добавить товар' }).click()

    await expect(page.getByText('Только название')).toBeVisible()
  })

  test('T3.2.1 Успешное редактирование товара', async ({ page, request }) => {
    const email = `edit-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Было', price: 100 },
    })

    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByRole('button', { name: 'Изменить' }).first().click()
    await page.getByRole('dialog').getByLabel('Название').fill('Стало')
    await page.getByRole('dialog').getByLabel('Цена').fill('200')
    await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()

    await expect(page.getByText('Стало')).toBeVisible()
    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText('Стало')).toBeVisible()
    await expect(page.getByText('200')).toBeVisible()
  })

  test('T3.3.1 Удаление незарезервированного товара', async ({ page, request }) => {
    const email = `delitem-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Удалю' },
    })

    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await expect(page.getByText('Удалю')).toBeVisible()
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Удалить' }).first().click()
    await expect(page.getByText('Удалю')).not.toBeVisible()
  })

  test('T3.1.4 Валидация URL (ссылка) — форма не ломается', async ({ page, request }) => {
    const email = `url-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByRole('button', { name: 'Добавить товар' }).first().click()
    await page.getByRole('dialog').getByLabel('Название').fill('Товар с не-URL')
    await page.getByRole('dialog').getByLabel('Ссылка на товар').fill('not-a-valid-url')
    await page.getByRole('dialog').getByRole('button', { name: 'Добавить товар' }).click()

    await expect(page.getByText('Товар с не-URL').or(page.getByRole('dialog').locator('.text-destructive'))).toBeVisible({ timeout: 5000 })
  })

  test('T3.1.3 Валидация цены (отрицательная не принимается)', async ({ page, request }) => {
    const email = `price-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByRole('button', { name: 'Добавить товар' }).first().click()
    await page.getByRole('dialog').getByLabel('Название').fill('Товар')
    await page.getByRole('dialog').getByLabel('Цена').fill('-100')
    await page.getByRole('dialog').getByRole('button', { name: 'Добавить товар' }).click()

    await expect(page.getByText('Товар')).not.toBeVisible({ timeout: 2000 })
  })

  test('T3.2.2 Редактирование зарезервированного товара', async ({ page, request }) => {
    const email = `resved-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Было', price: 50 },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Друг' },
    })

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await page.getByRole('button', { name: 'Изменить' }).first().click()
    await page.getByRole('dialog').getByLabel('Название').fill('Стало')
    await page.getByRole('dialog').getByLabel('Цена').fill('99')
    await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()

    await expect(page.getByText('Стало')).toBeVisible()
    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText('Зарезервировано')).toBeVisible()
    await expect(page.getByText('Стало')).toBeVisible()
  })

  test('T3.3.2 Удаление зарезервированного товара — страница резервации 404', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок' },
    }).then(r => r.json())
    const res = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Гость' },
    }).then(r => r.json())

    const email = `own-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Удалить' }).first().click()
    await expect(page.getByText('Подарок')).not.toBeVisible({ timeout: 3000 })

    await page.goto(`/reservations/${res.reserver_secret}`)
    await expect(page.getByText(/не найдена|not found|Найдено/i)).toBeVisible()
  })

  test('T3.3.3 Удаление товара с вкладами — страница вклада 404', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', price: 1000 },
    }).then(r => r.json())
    const contrib = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Вкладчик', amount: 100 },
    }).then(r => r.json())

    const email = `own2-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Удалить' }).first().click()
    await expect(page.getByText('Подарок')).not.toBeVisible({ timeout: 3000 })

    await page.goto(`/contributions/${contrib.contributor_secret}`)
    await expect(page.getByText(/не найден|not found/i)).toBeVisible()
  })
})
