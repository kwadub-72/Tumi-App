import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../src/shared/services/supabase';
import { UserStatus } from './UserStore';

export interface DbProfile {
    id: string;
    handle: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
    status: UserStatus;
    activity: string | null;
    activity_icon: string | null;
    height: string | null;
    weight_lbs: number | null;
    body_fat_pct: string | null;
    macro_targets: { p: number; c: number; f: number; calories: number };
    training_target: string | null;
    last_macro_update: string | null;
    created_at: string;
    is_private: boolean;
    show_meals_to_public: boolean;
    show_workouts_to_public: boolean;
    show_macros_to_public: boolean;
    show_measurements_to_public: boolean;
    show_likes_to_public: boolean;
}

interface AuthState {
    session: Session | null;
    profile: DbProfile | null;
    loading: boolean;
    error: string | null;

    // Actions
    initialize: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<string | null>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<DbProfile>) => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    profile: null,
    loading: true,
    error: null,

    initialize: async () => {
        set({ loading: true });
        const { data: { session } } = await supabase.auth.getSession();
        set({ session });

        if (session?.user) {
            await get().refreshProfile();
        }
        set({ loading: false });

        // Listen for auth events
        supabase.auth.onAuthStateChange(async (_event, session) => {
            set({ session });
            if (session?.user) {
                await get().refreshProfile();
            } else {
                set({ profile: null });
            }
        });
    },

    signIn: async (email, password) => {
        set({ error: null });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            set({ error: error.message });
            return error.message;
        }
        set({ session: data.session });
        await get().refreshProfile();
        return null;
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, profile: null });
    },

    refreshProfile: async () => {
        const userId = get().session?.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            set({ profile: data as DbProfile });
        }
    },

    updateProfile: async (updates) => {
        const userId = get().session?.user?.id;
        if (!userId) return 'Not signed in';

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) return error.message;
        await get().refreshProfile();
        return null;
    },
}));
