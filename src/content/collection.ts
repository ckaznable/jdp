
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

                // Add diff indicator
                const badge = document.createElement('span');
                badge.className = 'tag is-warning';
                badge.style.marginLeft = '10px';
                badge.style.fontWeight = 'bold';
                badge.textContent = diffText;

                // Insert after the count span
                countEl.insertAdjacentElement('afterend', badge);

                console.log(`[Tracker] ${title}: ${previousCount} -> ${currentCount} (${diffText})`);
            }
        } else {
            // New item found (first time seeing it)
            // Maybe unexpected if we assume "highlight on change". 
            // If we want to highlight NEW items, we can do it here. 
            // For now, let's just track it.
            // console.log(`[Tracker] New item: ${title} (${currentCount})`);
        }

        // Update data
        if (newData[title] !== currentCount) {
            newData[title] = currentCount;
            hasChanges = true;
        }
    });

    // 5. Save updatd data
    if (hasChanges) {
        await chrome.storage.local.set({ [storageKey]: newData });
        console.log('JavDB Collection Tracker: Data updated');
    }
};

// Run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
