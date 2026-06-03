/**
 * Safely writes to localStorage, handling QuotaExceededError gracefully without crashing the app.
 */
export function safeLocalStorageSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        console.warn(`LocalStorage write failed for key "${key}":`, e);
        
        // QuotaExceededError check
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            // Try to reclaim space by deleting non-essential big cache like cached_quotes
            if (key !== 'cached_quotes') {
                try {
                    localStorage.removeItem('cached_quotes');
                    localStorage.setItem(key, value);
                    console.log(`Reclaimed space and successfully saved "${key}" to localStorage.`);
                    return;
                } catch (retryError) {
                    console.error(`LocalStorage write failed even after clearing cached_quotes:`, retryError);
                }
            }
        }
    }
}
