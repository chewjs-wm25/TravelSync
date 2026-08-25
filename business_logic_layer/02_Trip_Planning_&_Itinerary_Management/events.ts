// Simple pub/sub for itinerary changes within module 02.
// Other modules may register listeners via addItineraryChangedListener.

const listeners: Set<(tripId: string) => void> = new Set();

export function addItineraryChangedListener(fn: (tripId: string) => void) {
  listeners.add(fn);
}

export function removeItineraryChangedListener(fn: (tripId: string) => void) {
  listeners.delete(fn);
}

export function triggerItineraryChanged(tripId: string) {
  try {
    for (const fn of Array.from(listeners)) {
      try {
        fn(tripId);
      } catch (err) {
        // Swallow listener errors to avoid breaking the caller
        // Listener errors are the responsibility of the listener.
      }
    }
  } catch (e) {
    // defensive: do nothing
  }
}
