const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(process.cwd(), 'app/onboarding'),
    path.join(process.cwd(), 'app/signup'),
    path.join(process.cwd(), 'app/settings')
];

const targetFiles = [
    path.join(process.cwd(), 'app/(tabs)/index.tsx'),
    path.join(process.cwd(), 'app/(tabs)/search.tsx')
];

// Recursively get files
function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

// Build final list of files to process
let filesToProcess = [...targetFiles];
targetDirs.forEach(dir => {
    filesToProcess = filesToProcess.concat(getFiles(dir));
});

console.log(`Found ${filesToProcess.length} files to scan.`);

// Exact string replacement pairs for user-facing UI labels/texts in JSX
const replacePairs = [
    ["Welcome to Tribe", "Welcome to Chribe"],
    ["Welcome to{\\n}Tribe", "Welcome to{\\n}Chribe"],
    ["Welcome to{'\\n'}Tribe", "Welcome to{'\\n'}Chribe"],
    ["Find a Tribe", "Find a Chribe"],
    ["Tribe-generated macros", "Chribe-generated macros"],
    ["Tribe-generated starting targets", "Chribe-generated starting targets"],
    ["Tribe-generated", "Chribe-generated"],
    ["Set up your Tribe identity.", "Set up your Chribe identity."],
    ["Join a tribe or go it alone.", "Join a chribe or go it alone."],
    ["Search for a tribe", "Search for a chribe"],
    ["You can always join a tribe later.", "You can always join a chribe later."],
    ["match you with tribes, users, and maps", "match you with chribes, users, and maps"],
    ["activate your Tribe account", "activate your Chribe account"],
    ["Non-tribe member visibility*", "Non-chribe member visibility*"],
    ["*Tribe-member visibility is determined by tribe settings", "*Chribe-member visibility is determined by chribe settings"],
    ["Tribe Natural", "Chribe Natural"],
    ["What is Tribe natural?", "What is Chribe natural?"],
    ["at Tribe’s discretion", "at Chribe’s discretion"],
    ["at Tribe's discretion", "at Chribe's discretion"],
    ["inquiries from Tribe", "inquiries from Chribe"],
    ["Tribe reserves the right", "Chribe reserves the right"],
    ["followings on Tribe", "followings on Chribe"],
    ["status on Tribe", "status on Chribe"],
    ["Tribe will contact", "Chribe will contact"],
    ["Featured Tribes", "Featured Chribes"],
    ["Your Tribes", "Your Chribes"],
    ["No tribes found for", "No chribes found for"],
    ["It's better together. Find a tribe.", "It's better together. Find a chribe."],
    ["Search for a tribe that aligns with your goals and activities, or skip for now.", "Search for a chribe that aligns with your goals and activities, or skip for now."]
];

let changedCount = 0;

filesToProcess.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Exact string replacements for user-facing UI labels/texts in JSX
    replacePairs.forEach(([search, replace]) => {
        content = content.split(search).join(replace);
    });

    // 2. Prop/attribute string literals: matches title="...", desc="...", placeholder="..."
    content = content.replace(/(title|desc|placeholder|label|footnote)=(["'])([^"']*?)\2/g, (match, propName, quote, value) => {
        const replacedValue = value.replace(/\b(Tribe|tribe|Tribes|tribes)\b/g, (word) => {
            if (word === 'Tribe') return 'Chribe';
            if (word === 'tribe') return 'chribe';
            if (word === 'Tribes') return 'Chribes';
            if (word === 'tribes') return 'chribes';
            return word;
        });
        return `${propName}=${quote}${replacedValue}${quote}`;
    });

    // 3. Quoted Tab String Literals: matches exactly 'Tribe', 'Tribes', "Tribe", "Tribes"
    content = content.replace(/(['"])(Tribes?)\1/g, (match, quote, word) => {
        if (word === 'Tribe') return `${quote}Chribe${quote}`;
        if (word === 'Tribes') return `${quote}Chribes${quote}`;
        return match;
    });

    // 4. Special manual adjustment for FilterModal mode passing in app/(tabs)/search.tsx
    if (filePath.endsWith('app/(tabs)/search.tsx')) {
        content = content.replace('mode={activeTab as any}', "mode={activeTab === 'Chribes' ? 'Tribes' : (activeTab as any)}");
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Patched: ${path.relative(process.cwd(), filePath)}`);
        changedCount++;
    }
});

console.log(`Rebrand completed successfully. Modified ${changedCount} files.`);
