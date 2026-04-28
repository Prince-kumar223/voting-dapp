import { useMemo, useState } from 'react'

function App() {
  const [connected, setConnected] = useState(false)
  const proposals = useMemo(
    () => [
      { id: 1, title: 'Enable_quadratic_voting', votes: 0 },
      { id: 2, title: 'Fund_open_source_grants', votes: 0 },
      { id: 3, title: 'Reduce_protocol_fees', votes: 0 },
    ],
    [],
  )

  return (
    <div className="min-h-dvh">
      <header className="border-b border-terminalGreen/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="text-base font-semibold blink-cursor">Voting_dAPP</div>
          <button
            type="button"
            className="terminal-button"
            onClick={() => setConnected((v) => !v)}
          >
            {connected ? 'Wallet_connected' : 'Connect_wallet'}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-12">
        <section className="terminal-panel md:col-span-8">
          <div className="border-b border-terminalGreen/20 px-4 py-3">
            <div className="text-sm text-terminalWhite/70">proposals</div>
          </div>
          <div className="divide-y divide-terminalGreen/10">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-4">
                <div>
                  <div className="text-sm text-terminalWhite/70">id_{p.id}</div>
                  <div className="text-lg">{p.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-terminalWhite/70">votes_{p.votes}</div>
                  <button type="button" className="terminal-button" disabled={!connected}>
                    vote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="grid gap-4 md:col-span-4">
          <section className="terminal-panel">
            <div className="border-b border-terminalGreen/20 px-4 py-3">
              <div className="text-sm text-terminalWhite/70">token_balance</div>
            </div>
            <div className="px-4 py-4">
              <div className="text-2xl">0</div>
              <div className="text-sm text-terminalWhite/60">rewards (demo)</div>
            </div>
          </section>

          <section className="terminal-panel">
            <div className="border-b border-terminalGreen/20 px-4 py-3">
              <div className="text-sm text-terminalWhite/70">event_feed</div>
            </div>
            <div className="px-4 py-4 text-sm text-terminalWhite/70">
              waiting_for_events…
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
