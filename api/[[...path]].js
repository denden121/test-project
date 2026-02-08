/**
 * Прокси для /api/* на бэкенд из переменной окружения BACKEND_URL.
 * Запросы к вашему домену /api/... перенаправляются на BACKEND_URL/api/...
 * без изменения URL в браузере.
 *
 * @see https://vercel.com/docs/functions
 * @see https://vercel.com/guides/vercel-reverse-proxy-rewrites-external
 */
export const config = {
  runtime: 'nodejs',
}

export default {
  async fetch(request) {
    const backendBase = process.env.BACKEND_URL
    if (!backendBase || typeof backendBase !== 'string') {
      return new Response(
        JSON.stringify({ detail: 'BACKEND_URL is not configured' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const base = backendBase.replace(/\/+$/, '')
    const url = new URL(request.url)
    const targetUrl = `${base}${url.pathname}${url.search}`

    const forwardHeaders = new Headers(request.headers)
    forwardHeaders.delete('host')
    forwardHeaders.delete('connection')

    try {
      const res = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        duplex: 'half',
      })

      const responseHeaders = new Headers(res.headers)
      responseHeaders.delete('transfer-encoding')

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      })
    } catch (err) {
      console.error('Proxy error:', err.message)
      return new Response(
        JSON.stringify({ detail: 'Backend unreachable' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}
