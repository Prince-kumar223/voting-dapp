import { sorobanServer } from './rpc'

export async function fetchContractEvents({
  startLedger,
  cursor,
  limit = 25,
  contractIds,
}: {
  startLedger: number
  cursor?: string
  limit?: number
  contractIds: string[]
}): Promise<{ events: Array<{ id: string; type: string; contractId?: { toString?: () => string }; topic?: unknown[] }>; cursor: string }> {
  const sdk = await import('@stellar/stellar-sdk')
  const server = (await sorobanServer()) as InstanceType<typeof sdk.rpc.Server>

  const filters: Array<{ type?: 'contract'; contractIds?: string[] }> = [
    {
      type: 'contract',
      contractIds,
    },
  ]

  if (cursor) {
    return server.getEvents({ cursor, limit, filters })
  }
  return server.getEvents({ startLedger, limit, filters })
}

