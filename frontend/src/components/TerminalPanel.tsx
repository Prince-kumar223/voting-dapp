import type { PropsWithChildren, ReactNode } from 'react'

export function TerminalPanel({
  title,
  right,
  children,
}: PropsWithChildren<{ title: string; right?: ReactNode }>) {
  return (
    <section className="terminal-panel">
      <div className="flex items-center justify-between border-b border-terminalGreen/20 px-4 py-3">
        <div className="text-sm text-terminalWhite/70">{title}</div>
        {right ? <div className="text-sm text-terminalWhite/70">{right}</div> : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}

