export const ALLOWED_ORIGIN = 'https://gaidlqimzyshtkxhuiro.supabase.co'
export const USER_PATH = '/auth/v1/user'

export const copy = {
  loading: {
    title: 'Comprobando el enlace',
    message: 'Prisma consulta la confirmación antes de darla por hecha.',
  },
  confirmed: {
    title: 'Correo confirmado',
    message:
      'Abre Prisma e inicia sesión con el mismo correo y la misma contraseña.',
  },
  error: {
    title: 'Este enlace ya no sirve',
    message:
      'Caducó o ya se usó. Si el correo ya quedó confirmado, abre Prisma e inicia sesión con tu contraseña. Si no puedes entrar, regístrate de nuevo.',
  },
  neutral: {
    title: 'Confirmación de Prisma',
    message:
      'Abre esta página desde el enlace del correo. Después entra en la app con tu contraseña.',
  },
  rejected: {
    title: 'No se pudo comprobar',
    message:
      'Prisma no aceptó este enlace. Ábrelo de nuevo desde el correo o entra en la app con tu contraseña.',
  },
  unconfirmed: {
    title: 'El correo sigue sin confirmar',
    message:
      'La cuenta todavía no tiene el correo confirmado. Usa el enlace del mensaje o regístrate de nuevo.',
  },
  limited: {
    title: 'Demasiadas comprobaciones',
    message: 'Espera un momento y vuelve a abrir el enlace del correo.',
  },
  unavailable: {
    title: 'Prisma no respondió',
    message:
      'El servicio de cuentas falló. Prueba más tarde, o entra en la app si ya confirmaste el correo.',
  },
  offline: {
    title: 'Sin conexión',
    message: 'Cuando vuelva la red, abre otra vez el enlace del correo.',
  },
}

export function parseReturn(hash, search) {
  const fromHash = new URLSearchParams(stripMark(hash, '#'))
  const fromQuery = new URLSearchParams(stripMark(search, '?'))
  const pick = (key) => fromHash.get(key) || fromQuery.get(key) || ''
  return {
    accessToken: pick('access_token').trim(),
    refreshToken: pick('refresh_token').trim(),
    error: pick('error').trim(),
    errorCode: pick('error_code').trim(),
    errorDescription: pick('error_description'),
    type: pick('type').trim(),
  }
}

export function stripUrl(href) {
  const url = new URL(href)
  url.hash = ''
  url.search = ''
  return url.toString()
}

export function decide(parsed) {
  if (parsed.error || parsed.errorCode) return 'error'
  if (parsed.accessToken) return 'verify'
  return 'neutral'
}

export function paint(nodes, state) {
  const text = copy[state] || copy.rejected
  nodes.root.dataset.state = state
  nodes.title.textContent = text.title
  nodes.message.textContent = text.message
}

export async function verifyAccessToken(accessToken, deps) {
  if (deps.origin !== ALLOWED_ORIGIN) return 'rejected'
  const url = `${ALLOWED_ORIGIN}${USER_PATH}`
  let response
  try {
    response = await deps.fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      headers: {
        apikey: deps.anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })
  } catch {
    return 'offline'
  }
  if (response.status === 429) return 'limited'
  if (response.status >= 500) return 'unavailable'
  if (!response.ok) return 'rejected'
  let body
  try {
    body = await response.json()
  } catch {
    return 'rejected'
  }
  if (!isConfirmedUser(body)) return 'unconfirmed'
  return 'confirmed'
}

export async function start({ hash, search, config, document, fetchImpl }) {
  const parsed = parseReturn(hash, search)
  const nodes = {
    root: document.documentElement,
    title: document.getElementById('title'),
    message: document.getElementById('message'),
  }
  const decision = decide(parsed)
  if (decision !== 'verify') {
    paint(nodes, decision)
    return decision
  }
  paint(nodes, 'loading')
  const state = await verifyAccessToken(parsed.accessToken, {
    origin: config.url,
    anonKey: config.anonKey,
    fetchImpl,
  })
  paint(nodes, state)
  return state
}

function isConfirmedUser(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const confirmed = body.email_confirmed_at
  return (
    typeof body.id === 'string' &&
    body.id.length > 0 &&
    typeof body.email === 'string' &&
    body.email.includes('@') &&
    typeof confirmed === 'string' &&
    confirmed.length > 0
  )
}

function stripMark(value, mark) {
  const text = value || ''
  return text.startsWith(mark) ? text.slice(1) : text
}
