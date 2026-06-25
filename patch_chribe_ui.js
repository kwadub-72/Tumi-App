const fs = require('fs');
const path = require('path');

const targetFiles = [
    'src/features/feed/components/TribeShareModal.tsx',
    'src/features/feed/components/FeedItem.tsx',
    'src/features/feed/components/PostOptionsModal.tsx',
    'src/features/home/components/TribeSelectionModal.tsx',
    'src/features/home/components/TribeView.tsx',
    'src/features/tribes/screens/TribeProfileScreen.tsx',
    'app/create-tribe.tsx',
    'app/chiefs-chamber.tsx',
    'app/tribe/[id]/chat.tsx'
];

const dryRun = process.argv.includes('--dry-run');

function replaceTribeWords(str) {
    return str.replace(/\b(Tribe|tribe|Tribes|tribes|TRIBE|TRIBES)\b/g, (match) => {
        switch (match) {
            case 'Tribe': return 'Chribe';
            case 'tribe': return 'chribe';
            case 'Tribes': return 'Chribes';
            case 'tribes': return 'chribes';
            case 'TRIBE': return 'CHRIBE';
            case 'TRIBES': return 'CHRIBES';
            default: return match;
        }
    });
}

function isSafeToReplace(str) {
    const unquoted = str.replace(/^['"`]|['"`]$/g, '').trim();

    // Ignore import paths, file paths, and routes
    if (unquoted.startsWith('.') || unquoted.startsWith('@') || unquoted.includes('/') || unquoted.includes('\\')) {
        return false;
    }
    
    // Ignore database tables, fields, channels, and backend events/types
    if (unquoted === 'tribes' || unquoted === 'tribe_members' || unquoted === 'tribe_messages' || unquoted === 'tribe_id') {
        return false;
    }
    if (unquoted === 'tribe') {
        return false;
    }
    if (unquoted.includes('tribe_messages_') || unquoted.includes('tribe_changes_') || unquoted.includes('tribe-feed-') || unquoted.includes('tribe_id=')) {
        return false;
    }
    if (unquoted.includes('tribe-likes')) {
        return false;
    }
    if (unquoted === 'tribe-vs-tribe') {
        return false;
    }
    if (unquoted.includes('create-tribe')) {
        return false;
    }
    
    return true;
}

function processContent(content) {
    // Regex consumes comments first, then matches strings, template literals, and code-excluding JSX text nodes
    const MATCH_REGEX = /\/\*[\s\S]*?\*\/|\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|>[^<>{}=;[\]_]*</g;
    
    return content.replace(MATCH_REGEX, (match) => {
        // Skip comments entirely
        if (match.startsWith('/*') || match.startsWith('//')) {
            return match;
        }
        
        if (!isSafeToReplace(match)) {
            return match;
        }
        
        // If it's a template literal
        if (match.startsWith('`')) {
            const parts = match.split(/(\$\{[^}]+\})/g);
            return parts.map(part => {
                if (part.startsWith('${') && part.endsWith('}')) {
                    return part;
                }
                return replaceTribeWords(part);
            }).join('');
        }
        
        // If it's a JSX text node (starts with > and ends with <)
        if (match.startsWith('>')) {
            const parts = match.split(/({[^{}]+})/g);
            return parts.map(part => {
                if (part.startsWith('{') && part.endsWith('}')) {
                    return part;
                }
                return replaceTribeWords(part);
            }).join('');
        }
        
        // Standard single/double quoted string
        return replaceTribeWords(match);
    });
}

function generateDiff(file, original, modified) {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const diff = [];
    
    origLines.forEach((line, idx) => {
        if (line !== modLines[idx]) {
            diff.push(`\x1b[36mLine ${idx + 1}:\x1b[0m`);
            diff.push(`\x1b[31m- ${line.trim()}\x1b[0m`);
            diff.push(`\x1b[32m+ ${modLines[idx].trim()}\x1b[0m`);
        }
    });
    
    return diff.join('\n');
}

function main() {
    console.log(`\n\x1b[1m\x1b[34m--- Chribe Surgical Rebrand Script (${dryRun ? 'DRY RUN' : 'LIVE RUN'}) ---\x1b[0m\n`);
    
    let totalChanges = 0;
    
    targetFiles.forEach((relPath) => {
        const fullPath = path.resolve(relPath);
        if (!fs.existsSync(fullPath)) {
            console.log(`\x1b[33m[WARN] File not found: ${relPath}\x1b[0m`);
            return;
        }
        
        const originalContent = fs.readFileSync(fullPath, 'utf8');
        const modifiedContent = processContent(originalContent);
        
        if (originalContent !== modifiedContent) {
            console.log(`\x1b[1m\x1b[32m[MODIFIED] ${relPath}\x1b[0m`);
            console.log(generateDiff(relPath, originalContent, modifiedContent));
            console.log();
            totalChanges++;
            
            if (!dryRun) {
                fs.writeFileSync(fullPath, modifiedContent, 'utf8');
            }
        } else {
            console.log(`\x1b[90m[NO CHANGES] ${relPath}\x1b[0m`);
        }
    });
    
    console.log(`\x1b[1m\x1b[34m--------------------------------------------------\x1b[0m`);
    console.log(`Files with changes: ${totalChanges} / ${targetFiles.length}`);
    if (dryRun) {
        console.log(`\x1b[33mDry run complete. No files were modified.\x1b[0m\n`);
    } else {
        console.log(`\x1b[32mLive run complete. Files successfully updated.\x1b[0m\n`);
    }
}

main();
