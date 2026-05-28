// Simple pub/sub for the FAB button.
// Pages call useFabAction(fn) to register what the FAB does on their screen.
// The FAB calls fireFabAction() when tapped.

const FAB_EVENT = 'dutchit:fab'

export function fireFabAction() {
  window.dispatchEvent(new CustomEvent(FAB_EVENT))
}

import { useEffect } from 'react'

export function useFabAction(fn: () => void) {
  useEffect(() => {
    window.addEventListener(FAB_EVENT, fn)
    return () => window.removeEventListener(FAB_EVENT, fn)
  }, [fn])
}
