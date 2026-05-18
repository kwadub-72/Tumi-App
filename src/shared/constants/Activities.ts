export interface ActivityOption {
    name: string;
    icon: string; // MaterialCommunityIcons name
    displayName?: string;
    modifier?: '+' | '-';
}

export const ACTIVITIES: ActivityOption[] = [
    { name: 'Bodybuilder (Bulk)', displayName: 'Bodybuilder (bulk)', icon: 'hammer', modifier: '+' },
    { name: 'Bodybuilder (Cut)', displayName: 'Bodybuilder (cut)', icon: 'hammer', modifier: '-' },
    { name: 'Powerlifting', icon: 'weight-lifter' },
    { name: 'Bulk (General)', displayName: 'General bulk', icon: 'trending-up', modifier: '+' },
    { name: 'Cut (General)', displayName: 'General cut', icon: 'trending-down', modifier: '-' },
    { name: 'Glute Growth', icon: 'cake-variant' },
    { name: 'Basketball', icon: 'basketball' },
    { name: 'Soccer', icon: 'soccer' },
    { name: 'Football (Lineman)', icon: 'football' },
    { name: 'Football (Skill Positions)', icon: 'football' },
    { name: 'Baseball', icon: 'baseball' },
    { name: 'Hockey', icon: 'hockey-puck' },
    { name: 'Rugby', icon: 'rugby' },
    { name: 'Volleyball', icon: 'volleyball' },
    { name: 'Distance Runner', icon: 'run-fast' },
    { name: 'Track – Sprints/Jumps', icon: 'run' },
    { name: 'Track – Throws', icon: 'run' },
    { name: 'Cycling', icon: 'bike' },
    { name: 'Swimmer', icon: 'swim' },
    { name: 'Combat Athlete (MMA / Boxing / BJJ / Wrestling)', icon: 'boxing-glove' },
    { name: 'Tactical (Military / Law Enforcement / Fire)', icon: 'shield-account' },
    { name: 'Hybrid Athlete', icon: 'infinity' },
    { name: 'Functional', icon: 'kettlebell' },
    { name: 'Blue Collar', icon: 'hammer-wrench' },
    { name: 'Wedding Prep', icon: 'ring' },
    { name: 'Pregnancy', icon: 'baby-face-outline' },
    { name: 'Post-partum', icon: 'heart-pulse' },
    { name: 'Cheerleading', icon: 'star' },
    { name: 'Gymnastics', icon: 'gymnastics' },
    { name: 'Yoga / Pilates', icon: 'yoga' },
    { name: 'Hiking', icon: 'summit' },
    { name: 'Skiing / Snowboarding', icon: 'ski' },
];

export function resolveActivityIcon(
    activityType?: string,
    activityIcon?: string,
): string {
    if (activityIcon) return activityIcon;
    if (!activityType) return 'hammer';
    
    // Try to find exact match in constants
    const match = ACTIVITIES.find(a => a.name === activityType);
    if (match) return match.icon;
    
    const a = activityType.toLowerCase();
    if (a.includes('bodybuild')) return 'hammer';
    if (a.includes('powerlift')) return 'weight-lifter';
    if (a.includes('crossfit') || a.includes('functional')) return 'kettlebell';
    if (a.includes('run') || a.includes('athlete')) return 'run';
    if (a.includes('cycling') || a.includes('bike')) return 'bike';
    if (a.includes('combat') || a.includes('mma') || a.includes('boxing') || a.includes('bjj')) return 'boxing-glove';
    if (a.includes('yoga') || a.includes('pilates')) return 'yoga';
    return 'hammer';
}
