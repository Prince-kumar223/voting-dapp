import { rpc } from '@stellar/stellar-sdk'
import { STELLAR } from './network'

let _server: rpc.Server | null = null

export function sorobanServer() {
  if (_server) return _server
  _server = new rpc.Server(STELLAR.sorobanRpcUrl, { allowHttp: false })
  return _server
}

