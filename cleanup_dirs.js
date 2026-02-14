
const fs = require('fs');
const path = require('path');

const dirsToRemove = [
    'adminserver/seedScripts',
    'appserver/scripts',
    // 'adminserver/scripts' -- NO! This is the target, but maybe top level files are gone.
];

dirsToRemove.forEach(dir => {
    const fullPath = path.resolve(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
        try {
            // check if empty
            const files = fs.readdirSync(fullPath);
            if (files.length === 0) {
                 fs.rmdirSync(fullPath);
                 console.log(`Removed empty dir: ${dir}`);
            } else {
                console.log(`Dir not empty, skipping: ${dir} (${files.length} files)`);
                // If it contains only directories and we moved everything, maybe subdirs are empty?
                // For now, let's just log.
            }
        } catch (e) {
            console.error(`Error removing ${dir}:`, e);
        }
    }
});
