import { useSyncExternalStore } from 'react'

const SERVER_SNAPSHOT = 0

let clientSnapshot = SERVER_SNAPSHOT

function subscribe(onStoreChange: () => void) {
  clientSnapshot = Date.now()
  onStoreChange()
  const intervalId = window.setInterval(() => {
    clientSnapshot = Date.now()
    onStoreChange()
  }, 60_000)
  return () => window.clearInterval(intervalId)
}

function getSnapshot() {
  return clientSnapshot
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
