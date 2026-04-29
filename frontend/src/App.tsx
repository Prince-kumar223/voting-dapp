import { useCallback, useMemo, useState } from 'react'
import { TerminalPanel } from './components/TerminalPanel'
import { ToastContainer, useToast } from './components/Toast'
import { TypingHeading } from './components/TypingHeading'
import MobileMenu from './components/MobileMenu'
import { EventFeed } from './features/events/EventFeed'
import type { ChainEvent } from './features/events/types'
import { useEventFeed } from './features/events/useEventFeed'
import { TokenBalance } from './features/token/TokenBalance'
import { ProposalList } from './features/voting/ProposalList'
import type { Proposal } from './features/voting/types'
import { useProposals } from './features/voting/useProposals'
import { useTokenBalance } from './hooks/useTokenBalance'
import { invokeContract } from './lib/stellar/tx'
import { useWallet } from './lib/wallet/WalletProvider'

function cleanEnvValue(value: string | undefined): string | undefined {
  return value?.trim().replace(/^["']|["']$/g, '')
}

function formatVoteError(message: string): string {
  if (message.includes('#2')) return 'this wallet already voted for that proposal'
  if (message.includes('#3')) return 'proposal was not found on-chain'
  if (message.includes('not found')) return 'wallet account was not found on testnet'
  return message
}

const fallbackProposals = [
  { id: 1, title: 'Enable_quadratic_voting', votes: 0 },
  { id: 2, title: 'Fund_open_source_grants', votes: 0 },
  { id: 3, title: 'Reduce_protocol_fees', votes: 0 },
] satisfies Proposal[]

function App() {
  const { state: wallet, connect, disconnect } = useWallet()
  const { showToast, toasts } = useToast()
  const connected = wallet.status === 'connected'
  const { balance } = useTokenBalance(wallet.status === 'connected' ? wallet.publicKey : undefined)
  const [optimisticVotes, setOptimisticVotes] = useState<Record<number, number>>({})

  const [events, setEvents] = useState<ChainEvent[]>([])
  const votingContractId = cleanEnvValue(import.meta.env.VITE_VOTING_CONTRACT_ID)
  const tokenContractId = cleanEnvValue(import.meta.env.VITE_TOKEN_CONTRACT_ID)
  const chainProposals = useProposals({
    contractId: votingContractId,
    sourceAccount: wallet.status === 'connected' ? wallet.publicKey : undefined,
  })

  const proposals = useMemo(
    () =>
      (chainProposals ?? fallbackProposals).map((p) => ({
        ...p,
        votes: p.votes + (optimisticVotes[p.id] ?? 0),
      })),
    [chainProposals, optimisticVotes],
  )

  const onVote = useCallback(
    async (id: number) => {
      if (!connected || wallet.status !== 'connected' || !votingContractId) return

      try {
        const result = await invokeContract({
          publicKey: wallet.publicKey,
          contractId: votingContractId,
          method: 'vote',
          args: [
            { kind: 'u32', value: id },
            { kind: 'address', value: wallet.publicKey },
          ],
        })

        if (!result.ok) {
          throw new Error(result.message)
        }

        setOptimisticVotes((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
        showToast('Vote cast successfully!', 'success')
        setEvents((prev) => [
          {
            id: `${Date.now()}_${id}`,
            ts: Date.now(),
            topic: 'vote_cast',
            details: `proposal_${id}`,
          },
          ...prev,
        ].slice(0, 50))
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown_error'
        showToast(`Vote failed: ${formatVoteError(message)}`, 'error')
      }
    },
    [connected, showToast, votingContractId, wallet],
  )

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="terminal-button"
              onClick={() => (connected ? disconnect() : void connect())}
            >
              {walletLabel}
            </button>
            <MobileMenu
              walletAddress={wallet.status === 'connected' ? wallet.publicKey : undefined}
              balance={balance}
              isConnected={connected}
            />
          </div>
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
            <TokenBalance amount={balance} />
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

      <ToastContainer toasts={toasts} />
    </div>
  )
}

export default App
