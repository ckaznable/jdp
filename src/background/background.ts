chrome.runtime.onMessage.addListener((request: { type: string; id: string }, _sender, sendResponse) => {
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
});
