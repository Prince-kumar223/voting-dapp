// Keep this static; vite.config.ts manualChunks handles splitting the SDK.
import {
  Account,
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  rpc as SorobanRpc,
  scValToNative,
  xdr as XdrWriter,
} from '@stellar/stellar-sdk'
import { useEffect, useState } from 'react'

const TOKEN_SCALE = 10_000_000n
const POLL_INTERVAL_MS = 10_000
const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL as string | undefined
const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID as string | undefined

function formatBalance(rawBalance: bigint): string {
  const whole = rawBalance / TOKEN_SCALE
  const fractional = rawBalance % TOKEN_SCALE
  const cents = (fractional * 100n) / TOKEN_SCALE

  return `${whole.toString()}.${cents.toString().padStart(2, '0')}`
}

function parseBalance(retval: XdrWriter.ScVal): string {
  const nativeValue = scValToNative(retval) as bigint | number | string
  const rawBalance = BigInt(nativeValue)

  return formatBalance(rawBalance)
}

export function useTokenBalance(walletAddress: string | undefined): {
  balance: string
  isLoading: boolean
} {
  const [balance, setBalance] = useState('0.00')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBalance = async () => {
      if (!walletAddress || !RPC_URL || !TOKEN_CONTRACT_ID) {
        setBalance('0.00')
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const server = new SorobanRpc.Server(RPC_URL)
        const token = new Contract(TOKEN_CONTRACT_ID)
        const source = new Account(walletAddress, '0')
        const operation = token.call('balance', Address.fromString(walletAddress).toScVal())
        const transaction = new TransactionBuilder(source, {
          fee: '100',
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(operation)
          .setTimeout(30)
          .build()
        const simulation = await server.simulateTransaction(transaction)

        if (cancelled) return

        if ('error' in simulation || !simulation.result) {
          setBalance('0.00')
          return
        }

        setBalance(parseBalance(simulation.result.retval))
      } catch {
        if (!cancelled) {
          setBalance('0.00')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBalance()

    const intervalId = window.setInterval(() => {
      void loadBalance()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [walletAddress])

  return { balance, isLoading }
}
