import { STELLAR } from './network'

let _server: unknown | null = null

export async function sorobanServer() {
  if (_server) return _server
  const sdk = await import('@stellar/stellar-sdk')
  _server = new sdk.rpc.Server(STELLAR.sorobanRpcUrl, { allowHttp: false })
  return _server
}

