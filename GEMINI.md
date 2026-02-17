# GEMINI.md - Project Context

## Project Overview
**Name:** JavDB Sukebei Helper (`jdp`)  
**Type:** Browser Extension (Manifest V3)  
**Purpose:** Enhances the JavDB experience by:
1.  **Nyaa Integration:** Automatically fetching and displaying the top 3 most downloaded results from `sukebei.nyaa.si` directly on JavDB movie pages.
2.  **Collection Tracker:** Monitoring and highlighting changes in item counts for followed series, makers, and codes on JavDB user collection pages.

## Tech Stack
- **Build Tool:** [Vite](https://vitejs.dev/) with [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Linting:** [ESLint](https://eslint.org/)
- **Packaging:** [bestzip](https://www.npmjs.com/package/bestzip)

## Architecture
- **`manifest.json`**: Entry point for the extension, defining permissions (`storage`, `host_permissions` for Nyaa), background service workers, and content script injection rules.
- **`src/background/background.ts`**: A service worker that acts as a proxy to fetch data from `sukebei.nyaa.si` to bypass CORS restrictions that affect content scripts.
- **`src/content/content.ts`**: Injected into `javdb.com/v/*`.
    - Extracts the movie ID from the page.
    - Communicates with the background script to fetch search results.
    - Parses the HTML response from Nyaa.
    - Injects a UI panel with magnet links and copy buttons into the JavDB page.
- **`src/content/collection.ts`**: Injected into JavDB user collection pages.
    - Scrapes item titles, counts, and URLs.
    - Compares current counts with previous values stored in `chrome.storage.local` (using the item's URL as the unique key).
    - Highlights items with changed counts and provides an interface to acknowledge/clear the highlight.
- **`vite.config.ts`**: Configures Vite to build the extension, leveraging CRXJS for seamless Manifest V3 integration and HMR during development.

## Building and Running
| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server with HMR for the extension. |
| `pnpm build` | Performs a type check and builds the production-ready extension in `dist/`. |
| `pnpm zip` | Packages the contents of `dist/` into `extension.zip`. |
| `pnpm sign` | Executes `scripts/sign.js` (likely for extension signing/deployment). |
| `pnpm lint` | Runs ESLint to check for code quality issues. |

## Development Conventions
- **TypeScript:** Strict typing is preferred. Interfaces for data structures (like `NyaaResult` or `StoredData`) should be maintained.
- **Messaging:** Use `chrome.runtime.sendMessage` for communication between content scripts and the background service worker.
- **Storage:** Use `chrome.storage.local` for persistent user data (like collection counts).
- **DOM Manipulation:** Prefer standard Web APIs (`document.querySelector`, `document.createElement`) and `DocumentFragment` for efficient UI injection.
- **Styling:** Injected elements are styled inline or use Bulma-compatible classes (since JavDB uses Bulma).
