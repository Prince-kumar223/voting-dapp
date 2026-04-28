import { useCallback, useMemo, useState } from 'react'
import { TerminalPanel } from './components/TerminalPanel'
import { TypingHeading } from './components/TypingHeading'
import { EventFeed } from './features/events/EventFeed'
import type { ChainEvent } from './features/events/types'
import { useEventFeed } from './features/events/useEventFeed'
import { TokenBalance } from './features/token/TokenBalance'
import { ProposalList } from './features/voting/ProposalList'
import type { Proposal } from './features/voting/types'
import { useWallet } from './lib/wallet/WalletProvider'

function App() {
  const { state: wallet, connect, disconnect } = useWallet()
  const connected = wallet.status === 'connected'
  const [proposals, setProposals] = useState<Proposal[]>(
    () =>
      [
        { id: 1, title: 'Enable_quadratic_voting', votes: 0 },
        { id: 2, title: 'Fund_open_source_grants', votes: 0 },
        { id: 3, title: 'Reduce_protocol_fees', votes: 0 },
      ] satisfies Proposal[],
  )

  const [events, setEvents] = useState<ChainEvent[]>([])

  const onVote = useCallback(
    (id: number) => {
      if (!connected) return
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, votes: p.votes + 1 } : p)),
      )
      setEvents((prev) => [
        {
          id: `${Date.now()}_${id}`,
          ts: Date.now(),
          topic: 'vote_cast',
          details: `proposal_${id}`,
        },
        ...prev,
      ].slice(0, 50))
    },
    [connected],
  )

  const votingContractId = import.meta.env.VITE_VOTING_CONTRACT_ID as string | undefined
  const tokenContractId = import.meta.env.VITE_TOKEN_CONTRACT_ID as string | undefined
  const contractIds = useMemo(
    () => [votingContractId, tokenContractId].filter(Boolean) as string[],
    [tokenContractId, votingContractId],
  )

  const { events: chainEvents } = useEventFeed({
    enabled: connected && contractIds.length > 0,
    startLedger: Number(import.meta.env.VITE_EVENT_START_LEDGER ?? 0) || 0,
    contractIds,
  })

  const mergedEvents = useMemo(
    () => (chainEvents.length > 0 ? chainEvents : events),
    [chainEvents, events],
  )

  const walletLabel = useMemo(
    () => {
      if (wallet.status === 'connecting') return 'Connecting…'
      if (wallet.status === 'connected') return 'Wallet_connected'
      return 'Connect_wallet'
    },
    [wallet.status],
  )

  return (
    <div className="min-h-dvh">
      <header className="border-b border-terminalGreen/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <TypingHeading text="Voting_dAPP" className="text-base font-semibold" />
          <button
            type="button"
            className="terminal-button"
            onClick={() => (connected ? disconnect() : void connect())}
          >
            {walletLabel}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <TerminalPanel title="proposals" right={connected ? 'ready' : 'wallet_required'}>
            <div className="-mx-4 -my-4">
              <ProposalList proposals={proposals} disabled={!connected} onVote={onVote} />
            </div>
          </TerminalPanel>
        </div>

        <aside className="grid gap-4 md:col-span-4">
          <TerminalPanel title="token_balance">
            <TokenBalance amount="0" />
          </TerminalPanel>

          <TerminalPanel title="event_feed" right={`${events.length}_events`}>
            <EventFeed events={mergedEvents} />
          </TerminalPanel>
        </aside>
      </main>

      {wallet.status === 'error' ? (
        <div className="mx-auto max-w-6xl px-4 pb-6">
          <div className="terminal-panel px-4 py-3 text-sm text-terminalWhite/80">
            error :: {wallet.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
