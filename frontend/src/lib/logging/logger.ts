type LogLevel = 'info' | 'warn' | 'error'

export type LogEntry = {
  ts: number
  level: LogLevel
  msg: string
  ctx?: unknown
}

const KEY = 'voting_dapp_logs_v1'
const MAX = 200

function read(): LogEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(entries: LogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)))
  } catch {
    // ignore storage quota / private mode
  }
}

export function log(level: LogLevel, msg: string, ctx?: unknown) {
  const entry: LogEntry = { ts: Date.now(), level, msg, ctx }
  const next = [...read(), entry]
  write(next)

  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(`[${level}] ${msg}`, ctx ?? '')
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', (ev) => {
    log('error', 'window_error', {
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
    })
  })

  window.addEventListener('unhandledrejection', (ev) => {
    log('error', 'unhandledrejection', {
      reason: ev.reason instanceof Error ? ev.reason.message : String(ev.reason),
    })
  })
}

