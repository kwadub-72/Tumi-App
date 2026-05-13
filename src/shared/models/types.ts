export interface MacroNutrients {
    p: number;
    c: number;
    f: number;
}

export interface Ingredient {
    id: string;
    name: string;
    amount: string;
    cals: number;
    macros: MacroNutrients;
    icon?: string;
    /** Optional metadata for USDA foods to allow re-editing in the cart */
    metadata?: {
        caloriesPer100g?: number;
        macrosPer100g?: MacroNutrients;
        servingSizeG?: number;
        servingSizeText?: string;
        fdcId?: number;
        servingUnits?: any[];
    };
}

export interface Meal {
    id: string;
    title: string;
    description?: string;
    type?: string;
    calories: number;
    macros: MacroNutrients;
    ingredients: Ingredient[];
    timeAgo?: string;
}

export interface Comment {
    id: string;
    user: User;
    text: string;
    timestamp: number;
    likes: number;
    isLiked?: boolean;
}

export interface User {
    id: string;
    name: string;
    handle: string;
    avatar: any; // Changed from string to any to support require()
    verified?: boolean;
    status?: 'natural' | 'enhanced' | 'natural-pending' | 'none';
    activityIcon?: string;
    activity?: string;
    height?: string;
    weight?: number;
    bfs?: string;
    tribe?: string;
    tribeAvatar?: string;
    stats?: {
        meals: number;
        workouts: number;
        updates: number;
    };
    isFollowing?: boolean;
    isRequested?: boolean;
    isPrivate?: boolean;
    macroTargets?: {
        p: number;
        c: number;
        f: number;
        calories: number;
    };
}

export interface FeedPost {
    id: string;
    caption?: string;
    user: User;
    timeAgo: string;
    createdAt?: string;
    meal?: Meal;
    workout?: Workout;
    stats: {
        likes: number;
        comments: number;
        shares: number;
        saves: number;
    };
    isLiked?: boolean;
    isShared?: boolean;
    isSaved?: boolean;
    hasCommented?: boolean;
    mediaUrl?: any;
    mediaType?: 'image' | 'video';
    macroUpdate?: MacroUpdate;
    snapshot?: Snapshot;
    comments?: Comment[];
}

export interface Snapshot {
    id: string;
    timestamp: number;
    caption: string;
    targets: {
        calories: number;
        p: number;
        c: number;
        f: number;
    };
    consumed: {
        calories: number;
        p: number;
        c: number;
        f: number;
    };
}

export interface MacroUpdate {
    id: string;
    caption?: string;
    timestamp: number;
    oldDate: string;
    oldTargets: {
        calories: number;
        p: number;
        c: number;
        f: number;
    };
    newTargets: {
        calories: number;
        p: number;
        c: number;
        f: number;
    };
    trainingTarget?: string;
}

export interface ExerciseSet {
    id: string;
    reps: number;
    weight: number;
    rpe?: number;
    completed: boolean;
}

export interface Exercise {
    id: string;
    title: string;
    type: 'Strength' | 'Cardio';
    muscleGroup?: string;
    // Strength fields
    sets?: ExerciseSet[];
    // Cardio fields
    speed?: number;
    incline?: number;
    duration?: number; // in minutes
    distance?: number;
    // Common
    notes?: string;
    icon?: string; // 'dumbbell' or 'run'
    superset?: string;
    eccentric?: string;
    /** All-time log count across the platform (read-only from DB, starts at 0) */
    logCount?: number;
    /** Creator attribution — who created this exercise definition */
    createdBy?: {
        name: string;
        handle: string;
        avatar?: any;
        isTribe?: boolean; // true = show Tribe flame logo
    };
}

export interface Workout {
    id: string;
    title: string;
    exercises: Exercise[];
    duration?: number; // total duration in minutes
    timestamp: number;
}

export type TribeType = 'accountability' | 'head-to-head' | 'tribe-vs-tribe';
export type TribePrivacy = 'public' | 'private';
export type TribeJoinStatus = 'none' | 'requested' | 'joined';

export interface Tribe {
    id: string;
    name: string;
    avatar: any;
    themeColor: string;
    type: TribeType;
    privacy: TribePrivacy;
    memberCount: number;
    description: string;
    joinStatus: TribeJoinStatus;
    chief: User;
    members?: User[];
    posts?: FeedPost[];
    tags?: string[]; // 'natural', 'active'
    activity?: string; // e.g. 'Bodybuilder (bulk)'
    activityIcon?: string;
    visibility?: {
        meal: 'public' | 'private' | 'tribe';
        workout: 'public' | 'private' | 'tribe';
        macro: 'public' | 'private' | 'tribe';
    };
    naturalStatus?: boolean; // natural/enhanced
}
