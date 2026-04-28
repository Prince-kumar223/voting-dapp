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
  networkPassphrase,
}: {
  xdr: string
  networkPassphrase: string
}): Promise<string> {
  const res = await signTransaction(xdr, { networkPassphrase })
  return res.signedTxXdr
}

