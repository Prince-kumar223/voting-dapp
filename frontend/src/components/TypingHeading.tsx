import { useEffect, useMemo, useState } from 'react'

export function TypingHeading({
  text,
  className,
  speedMs = 18,
}: {
  text: string
  className?: string
  speedMs?: number
}) {
  const [i, setI] = useState(0)

  const sliced = useMemo(() => text.slice(0, i), [text, i])

  useEffect(() => {
    if (i >= text.length) return
    const t = window.setTimeout(() => setI((v) => v + 1), speedMs)
    return () => window.clearTimeout(t)
  }, [i, speedMs, text.length])

  return (
    <div className={className}>
      <span>{sliced}</span>
      <span className="animate-blink">▌</span>
    </div>
  )
}

