/**
 * Utility to clear service workers during development
 * This helps prevent caching conflicts when PWA is disabled in dev mode
 */
export const clearServiceWorkers = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Service worker unregistered:', registration.scope);
    }

    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Caches cleared:', cacheNames);
    }
  } catch (error) {
    console.warn('Failed to clear service workers:', error);
  }
};

/**
 * Clear service workers only in development mode
 */
export const clearServiceWorkersInDev = (): void => {
  if (process.env.NODE_ENV === 'development') {
    clearServiceWorkers();
  }
};