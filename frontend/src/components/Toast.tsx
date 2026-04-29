import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastType = 'success' | 'error'

export type Toast = {
  id: number
  message: string
  type: ToastType
  close: () => void
}

export function useToast(): {
  showToast: (message: string, type: ToastType) => void
  toasts: Toast[]
} {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, number>>(new Map())

  const closeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)

    if (timer !== undefined) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const close = () => closeToast(id)
    const timer = window.setTimeout(close, 4000)

    timersRef.current.set(id, timer)
    setToasts((currentToasts) => [...currentToasts, { id, message, type, close }])
  }, [closeToast])

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    },
    [],
  )

  return { showToast, toasts }
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const [visibleToastIds, setVisibleToastIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (toasts.length === 0) {
      setVisibleToastIds(new Set())
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setVisibleToastIds(new Set(toasts.map((toast) => toast.id)))
    })

    return () => window.cancelAnimationFrame(frame)
  }, [toasts])

  const hideToast = (id: number) => {
    setVisibleToastIds((currentToastIds) => {
      const nextToastIds = new Set(currentToastIds)
      nextToastIds.delete(id)
      return nextToastIds
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const isVisible = visibleToastIds.has(toast.id)
        const colorClass = toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'

        return (
          <div
            key={toast.id}
            className={`${colorClass} flex items-start justify-between gap-3 rounded px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-out ${
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            role="status"
          >
            <span className="break-words">{toast.message}</span>
            <button
              type="button"
              className="shrink-0 text-lg leading-none text-white/80 transition hover:text-white"
              onClick={() => {
                hideToast(toast.id)
                window.setTimeout(toast.close, 150)
              }}
              aria-label="Close toast"
            >
              X
            </button>
          </div>
        )
      })}
    </div>
  )
}
