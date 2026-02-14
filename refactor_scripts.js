
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'scripts');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.js')) {
            updateImports(filePath);
        }
    }
}

function updateImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Determine depth relative to adminserver/scripts (or root of where they were?)
    // Most scripts were in `adminserver/scripts/` (depth 0) and moved to `adminserver/scripts/subdir/subdir` (depth 2)
    // New depth from `adminserver`: `scripts/db/seed` -> depth 3
    // Old depth: `scripts` -> depth 1
    // So we need to add `../../` to relative imports if they were referring to root files?

    // Actually, usage pattern: `require('../models')` in `scripts/foo.js`
    // Now in `scripts/db/seed/foo.js`, it needs `require('../../../models')`

    // Pattern: `require('../` -> `require('../../../`
    // Pattern: `config({ path: '../.env' })` -> `config({ path: '../../../.env' })`

    // BUT, some might have been in `seedScripts` (same level as scripts).
    // Some were in `appserver/scripts`. If they required `../../models` (from appserver/scripts to appserver/models), and moved to `adminserver/scripts/db/seed`, they now need `../../../models` (to adminserver/models).

    // Let's assume standard depth increase of 2 levels for most (scripts/ -> scripts/cat/subcat).

    // Helper to adjust path
    const regex = /require\s*\(\s*['"](\.\.\/)+/g;

    // Check if we need to add a safety guard
    if (!content.includes('process.env.NODE_ENV === \'production\'') && !content.includes('SAFETY GUARD')) {
        const guard = `
// SAFETY GUARD: Prevent accidental execution in production
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_RUN) {
    console.error('❌ Script execution blocked in production. Use FORCE_RUN=true to override.');
    process.exit(1);
}
`;
        // Insert after imports (heuristic: after last require, or at top)
        // Simple: At top
        content = guard + content;
        changed = true;
    }

    // Fix imports
    // This is heuristics-based. A safer way is specifically targeting known paths.

    // Fix .env path
    if (content.match(/path:\s*['"]\.\.\/\.env['"]/)) {
        content = content.replace(/path:\s*['"]\.\.\/\.env['"]/g, "path: '../../../.env'");
        changed = true;
    }

    // Fix ../models
    if (content.match(/require\(['"]\.\.\/models/)) {
        content = content.replace(/require\(['"]\.\.\/models/g, "require('../../../models");
        changed = true;
    }

    // Fix ../utils
    if (content.match(/require\(['"]\.\.\/utils/)) {
        content = content.replace(/require\(['"]\.\.\/utils/g, "require('../../../utils");
        changed = true;
    }

    // Fix ../config (if any)
    if (content.match(/require\(['"]\.\.\/config/)) {
        content = content.replace(/require\(['"]\.\.\/config/g, "require('../../../config");
        changed = true;
    }

    if (changed) {
        console.log(`Updated ${filePath}`);
        fs.writeFileSync(filePath, content);
    }
}

walk(rootDir);
console.log('Done updating imports.');
