
console.log('JavDB Collection Tracker loaded');



interface StoredData {
    [key: string]: number;
}

const main = async () => {
    // 1. Select all items
    // Based on inspection: .section-container .box
    const container = document.querySelector('.section-container');
    if (!container) return; // Not a collection page or structure changed

    const items = container.querySelectorAll('.box');
    if (items.length === 0) return;

    // 2. Load stored data
    const storageKey = 'collection_tracker_data';
    const storedResult = await chrome.storage.local.get([storageKey]);
    const storedData = (storedResult[storageKey] || {}) as StoredData;
    const newData: StoredData = { ...storedData };
    let hasChanges = false;

    // 3. Process each item
    items.forEach((item) => {
        const titleEl = item.querySelector('strong');
        const countEl = item.querySelector('span'); // The one next to strong, containing (123)

        if (!titleEl || !countEl) return;

        const title = titleEl.textContent?.trim() || '';
        const countText = countEl.textContent?.trim() || '';

        // Parse count: "(5608)" -> 5608
        const match = countText.match(/\((\d+)\)/);
        if (!title || !match) return;

        const currentCount = parseInt(match[1], 10);
        const previousCount = storedData[title];

        // 4. Compare and Highlight
        if (previousCount !== undefined) {
            if (currentCount !== previousCount) {
                // Count changed!
                const diff = currentCount - previousCount;
                const diffText = diff > 0 ? `+${diff}` : `${diff}`;

                // Highlight item
                (item as HTMLElement).style.border = '2px solid #ffcc00'; // Gold border
                (item as HTMLElement).style.backgroundColor = '#fffbe6'; // Light yellow bg
                (item as HTMLElement).style.cursor = 'pointer'; // Indicate actionable

                // Add diff indicator
                const badge = document.createElement('span');
                badge.className = 'tag is-warning badge-diff';
                badge.style.marginLeft = '10px';
                badge.style.fontWeight = 'bold';
                badge.textContent = diffText;

                // Insert after the count span
                countEl.insertAdjacentElement('afterend', badge);

                console.log(`[Tracker] ${title}: ${previousCount} -> ${currentCount} (${diffText})`);

                // Add interaction handlers to clear highlight
                const clearHighlight = async (e: Event) => {
                    // Check if it's left click (0) or middle click (1)
                    if (e instanceof MouseEvent && (e.button === 0 || e.button === 1)) {
                        // Remove highlight styles
                        (item as HTMLElement).style.border = '';
                        (item as HTMLElement).style.backgroundColor = '';
                        (item as HTMLElement).style.cursor = '';
                        badge.remove();

                        // Update stored data locally and save
                        // We need to re-fetch to ensure we don't overwrite other parallel changes if possible,
                        // but for simplicity we update our local cache and save.
                        // Better: get latest storage, update this key, set again.
                        try {
                            const result = await chrome.storage.local.get([storageKey]);
                            const data = (result[storageKey] || {}) as StoredData;
                            data[title] = currentCount;
                            await chrome.storage.local.set({ [storageKey]: data });
                            console.log(`[Tracker] Cleared highlight for ${title}. Updated count to ${currentCount}.`);
                        } catch (err) {
                            console.error('[Tracker] Failed to update count on click', err);
                        }
                    }
                };

                // Add listeners for click (left) and auxclick (middle/right)
                item.addEventListener('click', clearHighlight);
                item.addEventListener('auxclick', clearHighlight);

                // DO NOT update newData[title] here automatically.
                // We want the old count to persist until clicked.
                return;
            }
        } else {
            // New item found (first time seeing it)
            // Save it immediately so next time we have a baseline
            if (newData[title] !== currentCount) {
                newData[title] = currentCount;
                hasChanges = true;
            }
        }
    });

    // 5. Save initial data (only for new items or first run)
    if (hasChanges) {
        try {
            await chrome.storage.local.set({ [storageKey]: newData });
            console.log(`JavDB Collection Tracker: Initial data updated for new items.`);
        } catch (err) {
            console.error('JavDB Collection Tracker: Failed to save data', err);
        }
    } else {
        console.log('JavDB Collection Tracker: No new items to register.');
    }
};

// Run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
