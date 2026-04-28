import type { ChainEvent } from './types'

export function EventFeed({ events }: { events: ChainEvent[] }) {
  if (events.length === 0) {
    return <div className="text-sm text-terminalWhite/70">waiting_for_events…</div>
  }

  return (
    <div className="space-y-2 text-sm">
      {events.map((ev) => (
        <div key={ev.id} className="break-words text-terminalWhite/80">
          <span className="text-terminalGreen">{ev.topic}</span>
          <span className="text-terminalWhite/60"> :: </span>
          <span>{ev.details}</span>
        </div>
      ))}
    </div>
  )
}

