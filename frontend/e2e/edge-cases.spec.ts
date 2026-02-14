import { test, expect } from '@playwright/test'

const apiBase = () => process.env.API_URL || 'http://localhost:8000'

test.describe('Edge cases & security', () => {
  test('T8.3.2 Редактирование только с creator_secret — неверный secret 404', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())

    await page.goto('/wishlists/s/' + w.slug)
    await expect(page.getByRole('heading', { name: 'Список' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Удалить список' })).not.toBeVisible()

    await page.goto('/wishlists/manage/wrong-secret-xyz')
    await expect(page.getByText(/не найден|not found|Найдено/i)).toBeVisible({ timeout: 10000 })
  })

  test('T8.1.1 Резервация при наличии вкладов', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 5000, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Вкладчик', amount: 1000 },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Зарезервировать подарок' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Резервирую')
    await page.getByRole('button', { name: 'Зарезервировать' }).click()
    await expect(page.getByText(/зарезервирован|reserved/i).first()).toBeVisible()
  })

  test('T8.1.2 Вклад при зарезервированном товаре — кнопки Скинуться нет', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Маша' },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText('Зарезервировано')).toBeVisible()
    const chipInOnReserved = page.locator('li').filter({ hasText: 'Зарезервировано' }).getByRole('button', { name: 'Скинуться' })
    await expect(chipInOnReserved).toHaveCount(0)
  })

  test('T8.4.2 Копирование ссылки «Моя резервация» и открытие', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    })
    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Зарезервировать подарок' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Копирую')
    await page.getByRole('button', { name: 'Зарезервировать' }).click()
    await expect(page.getByRole('link', { name: 'Моя резервация' })).toBeVisible()
    const href = await page.getByRole('link', { name: 'Моя резервация' }).getAttribute('href')
    expect(href).toMatch(/\/reservations\//)
    await page.goto(href!)
    await expect(page.getByRole('heading', { name: /Моя резервация|My reservation/i })).toBeVisible()
    await expect(page.getByText('Копирую')).toBeVisible()
  })

  test('T8.4.1 Публичная страница на мобильном', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Мобильный' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    })

    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByRole('heading', { name: 'Мобильный' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Зарезервировать подарок' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Скинуться' })).toBeVisible()
  })
})
