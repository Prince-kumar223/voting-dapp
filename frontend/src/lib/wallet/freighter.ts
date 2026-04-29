import {
  getAddress,
  isAllowed,
  isConnected,
  requestAccess,
  setAllowed,
  signTransaction,
} from '@stellar/freighter-api'

export type FreighterStatus =
  | { kind: 'no_extension' }
  | { kind: 'not_allowed' }
  | { kind: 'ready'; publicKey: string }

export async function detectFreighter(): Promise<FreighterStatus> {
  const connected = await isConnected()
  if (!connected) return { kind: 'no_extension' }

  const allowed = await isAllowed()
  if (!allowed) return { kind: 'not_allowed' }

  const { address } = await getAddress()
  return { kind: 'ready', publicKey: address }
}

export async function requestFreighterAccess(): Promise<FreighterStatus> {
  const connected = await isConnected()
  if (!connected) return { kind: 'no_extension' }

  // Either method can trigger the access prompt; we call both for compatibility.
  await requestAccess().catch(() => undefined)
  await setAllowed().catch(() => undefined)
  const { address } = await getAddress()
  return { kind: 'ready', publicKey: address }
}

export async function freighterSignXdr({
  xdr,
  publicKey,
  networkPassphrase,
}: {
  xdr: string
  publicKey: string
  networkPassphrase: string
}): Promise<string> {
  if (!xdr || typeof xdr !== 'string') {
    throw new Error('Prepared transaction XDR was empty')
  }

  const res = (await signTransaction(xdr, {
    address: publicKey,
    networkPassphrase,
  })) as unknown

  if (typeof res === 'string' && res.length > 0) return res

  if (res && typeof res === 'object') {
    const signed = (res as { signedTxXdr?: string; signedTransaction?: string }).signedTxXdr
      ?? (res as { signedTxXdr?: string; signedTransaction?: string }).signedTransaction

    if (signed && signed.length > 0) return signed

    const error = (res as { error?: { message?: string } | string }).error
    if (typeof error === 'string') throw new Error(error)
    if (error?.message) throw new Error(error.message)
  }

  throw new Error('Freighter did not return a signed transaction')
}
