interface FetchNyaaRequest {
    type: 'FETCH_NYAA';
    id: string;
}

interface PostCacheRequest {
    type: 'POST_CACHE';
    num: string;
    html: string;
}

type MessageRequest = FetchNyaaRequest | PostCacheRequest;

chrome.runtime.onMessage.addListener((request: MessageRequest, _sender, sendResponse) => {
    if (request.type === 'FETCH_NYAA') {
        const url = `https://sukebei.nyaa.si/?f=0&c=0_0&q=${encodeURIComponent(request.id)}`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(text => sendResponse({ success: true, data: text }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep the message channel open for async response
    }

    if (request.type === 'POST_CACHE') {
        fetch('http://localhost:6969/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'javdb', num: request.num, html: request.html }),
        })
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep the message channel open for async response
    }
});
