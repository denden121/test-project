const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = 'email profile openid'

export function getGoogleAuthUrl(redirectUri: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set')
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export function isGoogleAuthEnabled(): boolean {
  return Boolean(GOOGLE_CLIENT_ID)
}
