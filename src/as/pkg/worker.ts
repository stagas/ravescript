// @ts-ignore
self.document = {
  querySelectorAll() { return [] as any },
  baseURI: location.origin
}

import { rpc } from 'utils'
import pkg from './wasm.ts'

export type PkgWorker = typeof worker

const worker = {
  async create() {
    return {
      memory: pkg.memory,
    }
  },
  async multiply(a: number, b: number) {
    console.log('multiply', a, b)
    return pkg.multiply(a, b)
  }
}

const host = rpc<{ isReady(): void }>(self, worker)
host.isReady()
console.log('[pkg-worker] started')
