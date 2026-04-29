import { sorobanServer } from './rpc'
import { STELLAR } from './network'
import { freighterSignXdr } from '../wallet/freighter'

export type ContractArg =
  | { kind: 'address'; value: string }
  | { kind: 'u32'; value: number }
  | string
  | number
  | bigint
  | boolean
  | null

export type InvokeResult =
  | { ok: true; hash: string }
  | { ok: false; stage: 'simulate' | 'sign' | 'send'; message: string }

function encodeContractArg(sdk: typeof import('@stellar/stellar-sdk'), arg: ContractArg) {
  if (arg && typeof arg === 'object' && 'kind' in arg) {
    if (arg.kind === 'address') {
      return sdk.Address.fromString(arg.value).toScVal()
    }

    return sdk.nativeToScVal(arg.value, { type: 'u32' })
  }

  return sdk.nativeToScVal(arg)
}

async function waitForTransaction(
  server: InstanceType<typeof import('@stellar/stellar-sdk').rpc.Server>,
  sdk: typeof import('@stellar/stellar-sdk'),
  hash: string,
): Promise<InvokeResult> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await server.getTransaction(hash)

    if (result.status === sdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      return { ok: true, hash }
    }

    if (result.status === sdk.rpc.Api.GetTransactionStatus.FAILED) {
      return { ok: false, stage: 'send', message: 'Transaction_failed' }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }

  return { ok: false, stage: 'send', message: 'Transaction_timeout' }
}

export async function invokeContract({
  publicKey,
  contractId,
  method,
  args,
}: {
  publicKey: string
  contractId: string
  method: string
  args: ContractArg[]
}): Promise<InvokeResult> {
  try {
    const sdk = await import('@stellar/stellar-sdk')
    const server = (await sorobanServer()) as InstanceType<typeof sdk.rpc.Server>
    const account = await server.getAccount(publicKey)

    const op = sdk.Operation.invokeContractFunction({
      contract: contractId,
      function: method,
      args: args.map((arg) => encodeContractArg(sdk, arg)),
    })

    const tx = new sdk.TransactionBuilder(
      new sdk.Account(account.accountId(), account.sequenceNumber()),
      {
        fee: '100000',
        networkPassphrase: STELLAR.networkPassphrase,
      },
    )
      .addOperation(op)
      .setTimeout(60)
      .build()

    const sim = await server.simulateTransaction(tx)
    if (sdk.rpc.Api.isSimulationError(sim)) {
      return { ok: false, stage: 'simulate', message: JSON.stringify(sim.error) }
    }

    const assembled = sdk.rpc.assembleTransaction(tx, sim).build()

    let signedXdr: string
    try {
      signedXdr = await freighterSignXdr({
        xdr: assembled.toXDR(),
        publicKey,
        networkPassphrase: STELLAR.networkPassphrase,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Wallet_rejected'
      return { ok: false, stage: 'sign', message: msg }
    }

    const signed = sdk.TransactionBuilder.fromXDR(signedXdr, STELLAR.networkPassphrase)
    const send = await server.sendTransaction(signed)
    if (send.status !== 'PENDING') {
      return { ok: false, stage: 'send', message: JSON.stringify(send) }
    }

    return waitForTransaction(server, sdk, send.hash)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown_error'
    return { ok: false, stage: 'send', message: msg }
  }
}
