import { test, expect } from '@playwright/test'

const apiBase = () => process.env.API_URL || 'http://localhost:8000'

test.describe('Realtime', () => {
  test('T7.1.1 Обновление при резервации другим', async ({ browser, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Реалтайм' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    })

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()

    await pageA.goto(`/wishlists/s/${w.slug}`)
    await pageB.goto(`/wishlists/s/${w.slug}`)
    await expect(pageA.getByRole('button', { name: 'Зарезервировать подарок' })).toBeVisible()

    await pageB.getByRole('button', { name: 'Зарезервировать подарок' }).first().click()
    await pageB.getByPlaceholder(/Маша|Mary/).fill('Друг')
    await pageB.getByRole('button', { name: 'Зарезервировать' }).click()
    await expect(pageB.getByText(/зарезервирован|reserved/i).first()).toBeVisible({ timeout: 5000 })

    await expect(pageA.getByText('Зарезервировано')).toBeVisible({ timeout: 10000 })
    await ctx.close()
  })

  test('T7.2.1 Обновление при новом вкладе', async ({ browser, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 5000, image_url: null },
    }).then(r => r.json())

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()

    await pageA.goto(`/wishlists/s/${w.slug}`)
    await pageB.goto(`/wishlists/s/${w.slug}`)
    await expect(pageA.getByRole('button', { name: 'Скинуться' })).toBeVisible()

    await pageB.getByRole('button', { name: 'Скинуться' }).first().click()
    await pageB.getByPlaceholder(/Маша|Mary/).fill('Первый')
    await pageB.getByLabel(/Сумма вклада|Contribution amount/i).fill('1000')
    await pageB.getByRole('button', { name: 'Добавить вклад' }).click()
    await expect(pageB.getByText(/Вклад добавлен|Contribution added/i)).toBeVisible({ timeout: 5000 })

    await expect(pageA.getByText(/Собрано|Collected/)).toBeVisible({ timeout: 10000 })
    await expect(pageA.getByText(/1000|1.000/)).toBeVisible({ timeout: 5000 })
    await ctx.close()
  })

  test('T7.1.2 Обновление при отмене резервации', async ({ browser, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Реалтайм' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    }).then(r => r.json())
    const res = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Кто-то' },
    }).then(r => r.json())

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()
    await pageA.goto(`/wishlists/s/${w.slug}`)
    await pageB.goto(`/wishlists/s/${w.slug}`)
    await expect(pageA.getByText('Зарезервировано')).toBeVisible()

    await pageB.goto(`/reservations/${res.reserver_secret}`)
    pageB.on('dialog', (d) => d.accept())
    await pageB.getByRole('button', { name: /Отменить резервацию|Cancel reservation/i }).click()
    await expect(pageB).toHaveURL(/\//)

    await expect(pageA.getByRole('button', { name: 'Зарезервировать подарок' })).toBeVisible({ timeout: 10000 })
    await ctx.close()
  })

  test('T7.2.2 Обновление при отмене вклада', async ({ browser, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 2000, image_url: null },
    }).then(r => r.json())
    const contrib = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Отмена', amount: 500 },
    }).then(r => r.json())

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()
    await pageA.goto(`/wishlists/s/${w.slug}`)
    await expect(pageA.getByText(/Собрано|Collected/)).toBeVisible()

    await pageB.goto(`/contributions/${contrib.contributor_secret}`)
    pageB.on('dialog', (d) => d.accept())
    await pageB.getByRole('button', { name: /Отменить вклад|Cancel contribution/i }).click()

    await expect(pageA.getByRole('button', { name: 'Скинуться' })).toBeVisible({ timeout: 10000 })
    await ctx.close()
  })

  test('T7.3.1 Добавление товара владельцем — гость видит без перезагрузки', async ({ browser, request }) => {
    const email = `own7-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()
    await pageA.goto(`/wishlists/s/${w.slug}`)
    await pageB.goto('/')
    await pageB.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await pageB.reload()
    await pageB.goto(`/wishlists/manage/${w.creator_secret}`)
    await pageB.getByRole('button', { name: 'Добавить товар' }).first().click()
    await pageB.getByRole('dialog').getByLabel('Название').fill('Новый товар')
    await pageB.getByRole('dialog').getByRole('button', { name: 'Добавить товар' }).click()

    await expect(pageA.getByText('Новый товар')).toBeVisible({ timeout: 10000 })
    await ctx.close()
  })

  test('T7.3.2 Редактирование товара владельцем — гость видит без перезагрузки', async ({ browser, request }) => {
    const email = `own7b-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Было', price: 100 },
    })

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()
    await pageA.goto(`/wishlists/s/${w.slug}`)
    await expect(pageA.getByText('Было')).toBeVisible()
    await pageB.goto('/')
    await pageB.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await pageB.reload()
    await pageB.goto(`/wishlists/manage/${w.creator_secret}`)
    await pageB.getByRole('button', { name: 'Изменить' }).first().click()
    await pageB.getByRole('dialog').getByLabel('Название').fill('Стало')
    await pageB.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()

    await expect(pageA.getByText('Стало')).toBeVisible({ timeout: 10000 })
    await ctx.close()
  })

  test('T7.3.3 Удаление товара владельцем — гость видит без перезагрузки', async ({ browser, request }) => {
    const email = `own7c-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Удаляемый' },
    })

    const ctx = await browser.newContext()
    const pageA = await ctx.newPage()
    const pageB = await ctx.newPage()
    await pageA.goto(`/wishlists/s/${w.slug}`)
    await expect(pageA.getByText('Удаляемый')).toBeVisible()
    await pageB.goto('/')
    await pageB.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await pageB.reload()
    await pageB.goto(`/wishlists/manage/${w.creator_secret}`)
    pageB.on('dialog', (d) => d.accept())
    await pageB.getByRole('button', { name: 'Удалить' }).first().click()

    await expect(pageA.getByText('Удаляемый')).not.toBeVisible({ timeout: 10000 })
    await ctx.close()
  })
})
