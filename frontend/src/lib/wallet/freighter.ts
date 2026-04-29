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

type FreighterAddressResponse = {
  address?: string
  publicKey?: string
  error?: { message?: string } | string
}

type FreighterConnectedResponse = boolean | {
  isConnected?: boolean
  error?: { message?: string } | string
}

type FreighterAllowedResponse = boolean | {
  isAllowed?: boolean
  error?: { message?: string } | string
}

function readFreighterError(error: FreighterAddressResponse['error']): string | undefined {
  if (!error) return undefined
  if (typeof error === 'string') return error
  return error.message
}

function readConnectedResponse(res: FreighterConnectedResponse): boolean {
  if (typeof res === 'boolean') return res
  return res.isConnected === true
}

function readAllowedResponse(res: FreighterAllowedResponse): boolean {
  if (typeof res === 'boolean') return res
  return res.isAllowed === true
}

function readPublicKeyFromResponse(res: FreighterAddressResponse): string | undefined {
  const publicKey = res.address ?? res.publicKey
  return publicKey?.startsWith('G') ? publicKey : undefined
}

async function readFreighterPublicKey(): Promise<string> {
  const res = (await getAddress()) as FreighterAddressResponse
  const publicKey = readPublicKeyFromResponse(res)

  if (publicKey) return publicKey

  const error = readFreighterError(res.error)
  if (error) throw new Error(error)

  throw new Error('Freighter did not return a public key')
}

export async function detectFreighter(): Promise<FreighterStatus> {
  const connected = readConnectedResponse((await isConnected()) as FreighterConnectedResponse)
  if (!connected) return { kind: 'no_extension' }

  const allowed = readAllowedResponse((await isAllowed()) as FreighterAllowedResponse)
  if (!allowed) return { kind: 'not_allowed' }

  return { kind: 'ready', publicKey: await readFreighterPublicKey() }
}

export async function requestFreighterAccess(): Promise<FreighterStatus> {
  const connected = readConnectedResponse((await isConnected()) as FreighterConnectedResponse)
  if (!connected) return { kind: 'no_extension' }

  // Either method can trigger the access prompt; we call both for compatibility.
  const access = (await requestAccess().catch(() => undefined)) as
    | FreighterAddressResponse
    | undefined
  const accessPublicKey = access ? readPublicKeyFromResponse(access) : undefined
  if (accessPublicKey) return { kind: 'ready', publicKey: accessPublicKey }

  await setAllowed().catch(() => undefined)
  return { kind: 'ready', publicKey: await readFreighterPublicKey() }
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
