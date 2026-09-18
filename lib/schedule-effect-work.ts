export function scheduleEffectWork(work: () => void) {
  queueMicrotask(work)
}
