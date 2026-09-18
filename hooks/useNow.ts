import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  const intervalId = window.setInterval(onStoreChange, 60_000)
  return () => window.clearInterval(intervalId)
}

function getNow() {
  return Date.now()
}

function getServerNow() {
  return 0
}

export function useNow() {
  return useSyncExternalStore(subscribe, getNow, getServerNow)
}
