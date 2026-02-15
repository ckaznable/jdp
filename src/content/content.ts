console.log('JavDB Sukebei Helper loaded');

interface NyaaResult {
    title: string;
    link: string;
    magnet: string;
    size: string;
    downloads: number;
    isTrusted: boolean; // Green
    isRemake: boolean; // Red
}

const main = async () => {
    // 1. Extract ID
    const id = extractId();
    if (!id) {
        console.log('JavDB Sukebei Helper: ID not found');
        return;
    }
    console.log(`JavDB Sukebei Helper: Found ID ${id}`);

    // 2. Fetch from Sukebei Nyaa
    try {
        const results = await fetchNyaa(id);
        if (results.length === 0) {
            console.log('JavDB Sukebei Helper: No results found on Nyaa');
            return;
        }

        // 3. Select best results (Top 3)
        // Sort by downloads descending
        results.sort((a, b) => b.downloads - a.downloads);
        const topResults = results.slice(0, 3);

        console.log('JavDB Sukebei Helper: Top results', topResults);

        // 4. Inject into UI based on user request "show top 3 most downloaded results"

        // Helper function to create a result element
        const createResultElement = (result: NyaaResult, index: number) => {
            const el = document.createElement('div');
            el.className = 'item columns is-desktop';
            const isRemake = result.isRemake;

            // Style
            el.style.backgroundColor = isRemake ? '#f8d7da' : '#d4edda';
            el.style.padding = '10px';
            el.style.borderRadius = '4px';
            el.style.marginBottom = '0'; // We use gap/margin on container

            el.innerHTML = `
                <div class="magnet-name column is-four-fifths">
                    <a href="${result.link}" target="_blank" style="text-decoration: none; color: inherit;">
                        <span class="name" style="font-weight:bold">[${index + 1}] ${result.title}</span>
                        <br>
                        <span class="meta" style="color: #155724;">
                            Size: ${result.size}, Downloads: ${result.downloads}
                            ${isRemake ? '<span class="tag is-danger is-light is-small" style="margin-left:5px">Remake</span>' : ''}
                            ${result.isTrusted ? '<span class="tag is-success is-light is-small" style="margin-left:5px">Trusted</span>' : ''}
                        </span>
                    </a>
                </div>
                <div class="buttons column">
                    <button class="button is-info is-small copy-to-clipboard" type="button" data-clipboard-text="${result.magnet}">
                        &nbsp;複製&nbsp;
                    </button>
                </div>
                <div class="date column">
                    <span class="time">New</span>
                </div>
            `;

            // Add event listener for the copy button
            const copyBtn = el.querySelector('button.copy-to-clipboard');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = result.magnet;
                    navigator.clipboard.writeText(text).then(() => {
                        const originalText = copyBtn.innerHTML;
                        copyBtn.innerHTML = '&nbsp;已複製&nbsp;';
                        setTimeout(() => {
                            copyBtn.innerHTML = originalText;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                });
            }

            return el;
        };

        // Render each result
        // Find injection point: preferably #magnets-content
        const targetContainer = document.querySelector('#magnets-content') || document.querySelector('.movie-panel-info');

        if (targetContainer) {
            const fragment = document.createDocumentFragment();
            topResults.forEach((result, index) => {
                fragment.appendChild(createResultElement(result, index));
            });

            if (targetContainer.id === 'magnets-content') {
                // Insert at the top of magnets content
                targetContainer.insertBefore(fragment, targetContainer.firstChild);
            } else {
                // Fallback: append to panel info
                targetContainer.appendChild(fragment);
            }
        }

    } catch (e) {
        console.error('JavDB Sukebei Helper: Error fetching Nyaa', e);
    }
};

const extractId = (): string | null => {
    // Strategy 1: Look for "番號:" or "ID:" in the panel
    // Usually structured as: <span class="header">ID:</span> <span class="value">IPX-123</span>
    // Or just text nodes.
    const panelText = document.querySelector('.movie-panel-info')?.textContent || '';
    // Use regex to find ID pattern: "ID: XXXXX" or "番號: XXXXX"
    // Jav IDs are usually Uppercase-Numbers (e.g. ABP-123, FC2-PPV-123)
    // Regex: /(ID|番號)[:\s]+([A-Za-z0-9-]+)/
    const match = panelText.match(/(?:ID|番號)[:\s]+([A-Za-z0-9-]+)/i);
    if (match) {
        return match[1];
    }

    // Strategy 2: URL usually contains the hash, but sometimes ID if pretty url
    // But user request says "old domain ID"? No, user says "pke9ye" is url ID.
    // We need the "番號".

    // Strategy 3: Copy button value
    const copyBtn = document.querySelector('.button[data-clipboard-text]');
    if (copyBtn) {
        const text = copyBtn.getAttribute('data-clipboard-text');
        if (text && /[A-Z]+-\d+/.test(text)) return text;
    }

    // Fallback: Title often is "[ID] Title"
    const titleMatch = document.title.match(/([A-Z]+-\d+)/);
    if (titleMatch) return titleMatch[1];

    return null;
};

const fetchNyaa = async (id: string): Promise<NyaaResult[]> => {
    // Send message to background script to bypass CORS
    try {
        const response = await chrome.runtime.sendMessage({ type: 'FETCH_NYAA', id });

        if (!response || !response.success) {
            throw new Error(response?.error || 'Unknown error');
        }

        const text = response.data;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const rows = Array.from(doc.querySelectorAll('tr.success, tr.danger'));
        const results: NyaaResult[] = [];

        for (const row of rows) {
            const tds = row.querySelectorAll('td');
            if (tds.length < 8) continue;

            const nameLink = tds[1].querySelector('a:not(.comments)');
            if (!nameLink) continue;

            const title = nameLink.textContent?.trim() || 'Unknown';
            const link = 'https://sukebei.nyaa.si' + nameLink.getAttribute('href');

            const magnetLink = tds[2].querySelector('a[href^="magnet:"]')?.getAttribute('href') || '';
            const size = tds[3].textContent?.trim() || '';
            const downloads = parseInt(tds[7].textContent?.trim() || '0', 10);

            results.push({
                title,
                link,
                magnet: magnetLink,
                size,
                downloads,
                isTrusted: row.classList.contains('success'),
                isRemake: row.classList.contains('danger')
            });
        }

        return results;

    } catch (e) {
        console.error('JavDB Sukebei Helper: Message error', e);
        throw e;
    }
};

// Start logic
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
