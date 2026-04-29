import {
  Account,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc as SorobanRpc,
  scValToNative,
} from '@stellar/stellar-sdk'
import { useEffect, useState } from 'react'
import type { Proposal } from './types'

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL as string | undefined

function normalizeProposal(value: unknown): Proposal | null {
  if (!value || typeof value !== 'object') return null

  const proposal = value as Partial<Record<keyof Proposal, unknown>>
  if (
    typeof proposal.id !== 'number' ||
    typeof proposal.title !== 'string' ||
    typeof proposal.votes !== 'number'
  ) {
    return null
  }

  return {
    id: proposal.id,
    title: proposal.title,
    votes: proposal.votes,
  }
}

export function useProposals({
  contractId,
  sourceAccount,
}: {
  contractId: string | undefined
  sourceAccount: string | undefined
}): Proposal[] | null {
  const [proposals, setProposals] = useState<Proposal[] | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadProposals = async () => {
      if (!RPC_URL || !contractId || !sourceAccount) return

      try {
        const server = new SorobanRpc.Server(RPC_URL)
        const contract = new Contract(contractId)
        const source = new Account(sourceAccount, '0')
        const operation = contract.call(
          'list_proposals',
          nativeToScVal(0, { type: 'u32' }),
          nativeToScVal(25, { type: 'u32' }),
        )
        const transaction = new TransactionBuilder(source, {
          fee: '100',
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(operation)
          .setTimeout(30)
          .build()
        const simulation = await server.simulateTransaction(transaction)

        if (cancelled || 'error' in simulation || !simulation.result) return

        const nativeValue = scValToNative(simulation.result.retval)
        if (!Array.isArray(nativeValue)) return

        const nextProposals = nativeValue
          .map(normalizeProposal)
          .filter((p): p is Proposal => p !== null)

        setProposals(nextProposals)
      } catch {
        if (!cancelled) setProposals(null)
      }
    }

    void loadProposals()

    return () => {
      cancelled = true
    }
  }, [contractId, sourceAccount])

  return proposals
}
