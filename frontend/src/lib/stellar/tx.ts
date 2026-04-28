import {
  Account,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from '@stellar/stellar-sdk'
import { sorobanServer } from './rpc'
import { STELLAR } from './network'
import { freighterSignXdr } from '../wallet/freighter'

export type InvokeResult =
  | { ok: true; hash: string }
  | { ok: false; stage: 'simulate' | 'sign' | 'send'; message: string }

export async function invokeContract({
  publicKey,
  contractId,
  method,
  args,
}: {
  publicKey: string
  contractId: string
  method: string
  args: unknown[]
}): Promise<InvokeResult> {
  try {
    const server = sorobanServer()
    const account = await server.getAccount(publicKey)

    const op = Operation.invokeContractFunction({
      contract: contractId,
      function: method,
      args: args.map((a) => nativeToScVal(a as never)),
    })

    const tx = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
      fee: '100000',
      networkPassphrase: STELLAR.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(60)
      .build()

    const sim = await server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(sim)) {
      return { ok: false, stage: 'simulate', message: JSON.stringify(sim.error) }
    }

    const assembled = rpc.assembleTransaction(tx, sim).build()

    let signedXdr: string
    try {
      signedXdr = await freighterSignXdr({
        xdr: assembled.toXDR(),
        networkPassphrase: STELLAR.networkPassphrase,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Wallet_rejected'
      return { ok: false, stage: 'sign', message: msg }
    }

    const signed = TransactionBuilder.fromXDR(signedXdr, STELLAR.networkPassphrase)
    const send = await server.sendTransaction(signed)
    if (send.status !== 'PENDING') {
      return { ok: false, stage: 'send', message: JSON.stringify(send) }
    }
    return { ok: true, hash: send.hash }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown_error'
    return { ok: false, stage: 'send', message: msg }
  }
}

