
import 'dotenv/config';
import { exec } from 'child_process';
import path from 'path';

const apiKey = process.env.WEB_EXT_API_KEY;
const apiSecret = process.env.WEB_EXT_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error('Error: WEB_EXT_API_KEY and WEB_EXT_API_SECRET must be set in .env file or environment variables.');
    process.exit(1);
}

const sourceDir = 'dist';
const artifactsDir = 'dist/web-ext-artifacts';
const channel = 'unlisted';

const command = `web-ext sign --source-dir ${sourceDir} --artifacts-dir ${artifactsDir} --channel=${channel} --api-key=${apiKey} --api-secret=${apiSecret}`;

// Patch manifest.json for Firefox compatibility
import fs from 'fs';
const manifestPath = path.join(sourceDir, 'manifest.json');
try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.background && manifest.background.service_worker && !manifest.background.scripts) {
        console.log('Patching manifest.json: Adding background.scripts for Firefox compatibility...');
        manifest.background.scripts = [manifest.background.service_worker];
        // Also ensuring explicit 'type': 'module' if needed, though usually service_worker implies it or handles it
        // Firefox might need type="module" for scripts too if they are modules
        if (manifest.background.type === 'module') {
            // Scripts in Firefox MV3 are generally treated as non-modules by default unless specified?
            // Actually, if we point to the service worker file which is likely a module, we should be careful.
            // But let's try just adding the reference first.
        }
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
} catch (err) {
    console.error('Error patching manifest.json:', err);
}

console.log(`Running: web-ext sign ...`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.warn(`Stderr: ${stderr}`);
    }
    console.log(`Stdout: ${stdout}`);
});
