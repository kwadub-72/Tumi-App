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

export interface User {
    id: string;
    name: string;
    handle: string;
    avatar: any; // Changed from string to any to support require()
    verified?: boolean;
}

export interface FeedPost {
    id: string;
    user: User;
    timeAgo: string;
    meal: Meal;
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
}
