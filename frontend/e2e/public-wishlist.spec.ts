import { test, expect } from '@playwright/test'

const apiBase = () => process.env.API_URL || 'http://localhost:8000'

test.describe('Public wishlist & reservation', () => {
  test('T4.2.1 Просмотр по валидному slug', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Праздник' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Книга', link: 'https://example.com', price: 500, image_url: null },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByRole('heading', { name: 'Праздник' })).toBeVisible()
    await expect(page.getByText('Книга')).toBeVisible()
  })

  test('T4.2.2 Просмотр по несуществующему slug', async ({ page }) => {
    await page.goto('/wishlists/s/nonexistent-slug-12345')
    await expect(page.getByText(/не найден|not found|404/i)).toBeVisible()
  })

  test('T5.1.1 Успешная резервация', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Вишлист' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Зарезервировать подарок' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Маша')
    await page.getByRole('button', { name: 'Зарезервировать' }).click()

    await expect(page.getByText(/зарезервирован|reserved/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Моя резервация' })).toBeVisible()
  })

  test('T5.3.1 Просмотр своей резервации по secret', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Товар', link: null, price: null, image_url: null },
    }).then(r => r.json())
    const res = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Тест' },
    }).then(r => r.json())

    await page.goto(`/reservations/${res.reserver_secret}`)
    await expect(page.getByRole('heading', { name: /Моя резервация|My reservation/i })).toBeVisible()
    await expect(page.getByText('Тест')).toBeVisible()
    await expect(page.getByText('Товар')).toBeVisible()
  })

  test('T5.3.3 Невалидный reserver_secret', async ({ page }) => {
    await page.goto('/reservations/invalid-secret-xyz')
    await expect(page.getByText(/не найдена|not found/i)).toBeVisible()
  })
})
