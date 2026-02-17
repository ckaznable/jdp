
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
        const linkEl = (item.tagName === 'A' ? item : item.querySelector('a')) as HTMLAnchorElement | null;

        if (!titleEl || !countEl || !linkEl) return;

        const title = titleEl.textContent?.trim() || '';
        const url = linkEl.href;
        const countText = countEl.textContent?.trim() || '';

        // Parse count: "(5608)" -> 5608
        const match = countText.match(/\((\d+)\)/);
        if (!title || !match || !url) return;

        const currentCount = parseInt(match[1], 10);
        const previousCount = storedData[url];

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

                console.log(`[Tracker] ${title} (${url}): ${previousCount} -> ${currentCount} (${diffText})`);

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
                        try {
                            const result = await chrome.storage.local.get([storageKey]);
                            const data = (result[storageKey] || {}) as StoredData;
                            data[url] = currentCount;
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

                return;
            }
        } else {
            // New item found (first time seeing it)
            if (newData[url] !== currentCount) {
                newData[url] = currentCount;
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
