// Single place that knows how to talk to the QualityCraft backend.
//
// Every view previously repeated the base URL, the bearer header and the
// response.ok check, which is how the "Failed to fetch" messages ended up
// being shown to users instead of the API's own message. Centralising it
// keeps error text meaningful and makes the token handling testable.

export const API_BASE = import.meta.env.VITE_API_URL || ''

export function getToken() {
  return null
}

// A rejected request carries the HTTP status so callers can distinguish an
// expired session (401) from a validation problem (400) without parsing text.
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function readBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  return response.text()
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken()
  const requestHeaders = { ...headers }
  if (token) requestHeaders.Authorization = `Bearer ${token}`
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch only rejects on a transport failure, so this is the one case where
    // the message is ours rather than the server's.
    throw new ApiError('Cannot reach the QualityCraft server. Check that the backend is running.', 0)
  }

  if (!response.ok) {
    const payload = await readBody(response)
    const message = (payload && payload.message) || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  if (raw) return response
  const payload = await readBody(response)
  return payload
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  remove: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
  download: (path) => apiRequest(path, { raw: true }),
}

// Triggers a browser download for a fetch Response without leaving the page.
export async function saveResponseAs(response, filename) {
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
