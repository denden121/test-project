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

    await expect(page.getByText(/зарезервирован|reserved/i).first()).toBeVisible()
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

  test('T4.2.3 Вид для гостя: зарезервировано / не зарезервировано', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Свободный', link: null, price: null, image_url: null },
    })
    const item2 = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Занятый', link: null, price: null, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item2.id}/reserve`, {
      data: { reserver_name: 'Друг' },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByRole('button', { name: 'Зарезервировать подарок' })).toBeVisible()
    await expect(page.getByText('Зарезервировано')).toBeVisible()
  })

  test('T4.2.4 Вид для гостя: прогресс сбора по товару', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Кто-то', amount: 300 },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText(/Собрано|Collected|из/)).toBeVisible()
  })

  test('T5.1.2 Резервация уже зарезервированного — кнопки нет', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Маша' },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText('Зарезервировано')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Зарезервировать подарок' })).toHaveCount(0)
  })

  test('T5.3.2 Отмена резервации', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    }).then(r => r.json())
    const res = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Отмена' },
    }).then(r => r.json())

    await page.goto(`/reservations/${res.reserver_secret}`)
    await expect(page.getByRole('heading', { name: /Моя резервация|My reservation/i })).toBeVisible()
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Отменить резервацию|Cancel reservation/i }).click()
    await expect(page).toHaveURL(/\/(reservations\/|$)/)
    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByRole('button', { name: 'Зарезервировать подарок' })).toBeVisible()
  })

  test('T6.1.1 Успешный вклад', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 2000, image_url: null },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Скинуться' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Маша')
    await page.getByLabel(/Сумма вклада|Contribution amount/i).fill('500')
    await page.getByRole('button', { name: 'Добавить вклад' }).click()

    await expect(page.getByText(/Вклад добавлен|Contribution added/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Мой вклад|My contribution/i })).toBeVisible()
    await expect(page.getByText(/Собрано|Collected/)).toBeVisible()
  })

  test('T6.4.1 Просмотр вклада по contributor_secret', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Товар', link: null, price: 1000, image_url: null },
    }).then(r => r.json())
    const contrib = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Вкладчик', amount: 100 },
    }).then(r => r.json())

    await page.goto(`/contributions/${contrib.contributor_secret}`)
    await expect(page.getByRole('heading', { name: /Мой вклад|My contribution/i })).toBeVisible()
    await expect(page.getByText('Вкладчик')).toBeVisible()
    await expect(page.getByText('Товар')).toBeVisible()
  })

  test('T6.4.3 Невалидный contributor_secret', async ({ page }) => {
    await page.goto('/contributions/invalid-secret-xyz')
    await expect(page.getByText(/не найден|not found/i)).toBeVisible()
  })

  test('T5.1.3 Резервация без имени — валидация', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Зарезервировать подарок' }).first().click()
    await page.getByRole('button', { name: 'Зарезервировать' }).click()

    await expect(page.getByText(/Обязательное поле|Required field/i)).toBeVisible()
    await expect(page.getByText('Зарезервировано')).not.toBeVisible()
  })

  test('T5.2.1 Владелец не видит, кто зарезервировал', async ({ page, request }) => {
    const email = `owner-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: null, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/reserve`, {
      data: { reserver_name: 'Маша' },
    })

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await expect(page.getByText('Зарезервировано')).toBeVisible()
    await expect(page.getByText('Маша')).not.toBeVisible()
  })

  test('T6.1.2 Вклад больше оставшейся суммы — валидация', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 5000, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Первый', amount: 3000 },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Скинуться' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Второй')
    await page.getByLabel(/Сумма вклада|Contribution amount/i).fill('3000')
    await page.getByRole('button', { name: 'Добавить вклад' }).click()

    await expect(page.getByText(/превышать|exceed|оставш/i)).toBeVisible()
  })

  test('T6.1.3 Отрицательная или нулевая сумма — вклад не создаётся', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Скинуться' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Тест')
    await page.getByLabel(/Сумма вклада|Contribution amount/i).fill('0')
    await page.getByRole('button', { name: 'Добавить вклад' }).click()

    await expect(page.getByText(/Вклад добавлен|Contribution added/i)).not.toBeVisible({ timeout: 3000 })
  })

  test('T6.1.4 Несколько вкладов — прогресс показывает сумму', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Первый', amount: 300 },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await page.getByRole('button', { name: 'Скинуться' }).first().click()
    await page.getByPlaceholder(/Маша|Mary/).fill('Второй')
    await page.getByLabel(/Сумма вклада|Contribution amount/i).fill('400')
    await page.getByRole('button', { name: 'Добавить вклад' }).click()
    await expect(page.getByText(/Вклад добавлен|Contribution added/i)).toBeVisible({ timeout: 5000 })

    await expect(page.getByText(/700|Собрано.*700/)).toBeVisible({ timeout: 5000 })
  })

  test('T6.2.1 Владелец не видит, кто скинулся', async ({ page, request }) => {
    const email = `ownc-${Date.now()}@example.com`
    await request.post(`${apiBase()}/api/auth/register`, { data: { email, password: 'password123' } })
    const body = await request.post(`${apiBase()}/api/auth/login`, { data: { email, password: 'password123' } }).then(r => r.json())
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Тайный', amount: 500 },
    })

    await page.goto('/')
    await page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.access_token)
    await page.reload()
    await page.goto(`/wishlists/manage/${w.creator_secret}`)
    await expect(page.getByText(/Собрано|Collected/)).toBeVisible()
    await expect(page.getByText('Тайный')).not.toBeVisible()
  })

  test('T6.3.2 Товар без цены — нет кнопки Скинуться', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Список' } }).then(r => r.json())
    await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Без цены', link: null, price: null, image_url: null },
    })

    await page.goto(`/wishlists/s/${w.slug}`)
    await expect(page.getByText('Без цены')).toBeVisible()
    const chipButtons = page.getByRole('button', { name: 'Скинуться' })
    await expect(chipButtons).toHaveCount(0)
  })

  test('T6.4.2 Отмена вклада', async ({ page, request }) => {
    const w = await request.post(`${apiBase()}/api/wishlists`, { data: { title: 'Сбор' } }).then(r => r.json())
    const item = await request.post(`${apiBase()}/api/wishlists/m/${w.creator_secret}/items`, {
      data: { title: 'Подарок', link: null, price: 1000, image_url: null },
    }).then(r => r.json())
    const contrib = await request.post(`${apiBase()}/api/wishlists/s/${w.slug}/items/${item.id}/contribute`, {
      data: { contributor_name: 'Отмена', amount: 200 },
    }).then(r => r.json())

    await page.goto(`/contributions/${contrib.contributor_secret}`)
    await expect(page.getByRole('heading', { name: /Мой вклад|My contribution/i })).toBeVisible()
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Отменить вклад|Cancel contribution/i }).click()
    await expect(page).toHaveURL(/\/(contributions\/|$)/)
    await page.goto(`/contributions/${contrib.contributor_secret}`)
    await expect(page.getByText(/не найден|not found/i)).toBeVisible()
  })
})
