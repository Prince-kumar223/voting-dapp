import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchContractEvents } from '../../lib/stellar/events'
import type { ChainEvent } from './types'

function now() {
  return Date.now()
}

export function useEventFeed({
  enabled,
  startLedger,
  contractIds,
}: {
  enabled: boolean
  startLedger: number
  contractIds: string[]
}) {
  const [events, setEvents] = useState<ChainEvent[]>([])
  const cursorRef = useRef<string | undefined>(undefined)
  const seenRef = useRef<Set<string>>(new Set())

  const contractKey = useMemo(() => contractIds.slice().sort().join(','), [contractIds])

  useEffect(() => {
    if (!enabled) return
    if (contractIds.length === 0) return

    let cancelled = false
    cursorRef.current = undefined
    seenRef.current = new Set()
    setEvents([])

    const loop = async () => {
      let backoff = 800
      while (!cancelled) {
        try {
          const res = await fetchContractEvents({
            startLedger,
            cursor: cursorRef.current,
            limit: 25,
            contractIds,
          })

          if (res.events.length > 0) {
            const mapped: ChainEvent[] = res.events.map((ev) => ({
              id: ev.id,
              ts: now(),
              topic: ev.type,
              details: `${ev.contractId?.toString?.() ?? 'system'} :: ${ev.topic?.length ?? 0}_topics`,
            }))

            setEvents((prev) => {
              const next: ChainEvent[] = []
              for (const m of mapped) {
                if (seenRef.current.has(m.id)) continue
                seenRef.current.add(m.id)
                next.push(m)
              }
              return [...next.reverse(), ...prev].slice(0, 200)
            })

            cursorRef.current = res.cursor
          }

          backoff = 800
          await new Promise((r) => setTimeout(r, 1000))
        } catch {
          await new Promise((r) => setTimeout(r, backoff))
          backoff = Math.min(12_000, Math.floor(backoff * 1.7))
        }
      }
    }

    void loop()
    return () => {
      cancelled = true
    }
  }, [contractKey, contractIds, enabled, startLedger])

  return { events }
}

