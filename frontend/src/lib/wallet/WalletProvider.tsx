import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { detectFreighter, requestFreighterAccess, type FreighterStatus } from './freighter'

export type WalletState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; publicKey: string }
  | { status: 'error'; message: string }

type WalletContextValue = {
  state: WalletState
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({ status: 'disconnected' })

  const connect = useCallback(async () => {
    setState({ status: 'connecting' })
    try {
      const status: FreighterStatus = await detectFreighter()
      if (status.kind === 'no_extension') {
        setState({ status: 'error', message: 'Freighter_not_found' })
        return
      }
      if (status.kind === 'not_allowed') {
        const allowed = await requestFreighterAccess()
        if (allowed.kind !== 'ready') {
          setState({ status: 'error', message: 'Freighter_not_allowed' })
          return
        }
        setState({ status: 'connected', publicKey: allowed.publicKey })
        return
      }
      setState({ status: 'connected', publicKey: status.publicKey })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Wallet_connection_failed'
      setState({ status: 'error', message: msg })
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({ status: 'disconnected' })
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const status = await detectFreighter()
        if (status.kind === 'ready') {
          setState({ status: 'connected', publicKey: status.publicKey })
        }
      } catch {
        // ignore auto-detect failures
      }
    })()
  }, [])

  const value = useMemo<WalletContextValue>(() => ({ state, connect, disconnect }), [
    connect,
    disconnect,
    state,
  ])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

