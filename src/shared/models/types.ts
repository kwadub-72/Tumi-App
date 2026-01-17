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
}

export interface FeedPost {
    id: string;
    user: User;
    timeAgo: string;
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
}

export interface Workout {
    id: string;
    title: string;
    exercises: Exercise[];
    duration?: number; // total duration in minutes
    timestamp: number;
}
