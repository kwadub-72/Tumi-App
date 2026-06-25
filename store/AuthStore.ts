import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../src/shared/services/supabase';
import { UserStatus, useUserStore } from './UserStore';
import { NaturalApplication } from '../src/shared/models/database.types';

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
    instagram_link: string | null;
    tiktok_link: string | null;
    current_streak?: number;
    highest_streak?: number;
    last_logged_date?: string | null;
    timezone?: string;
    expo_push_token?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    height_cm?: number | null;
    gender?: string | null;
    lifting_experience?: string | null;
    dob?: string | null;
    banned_until?: string | null;
    ban_reason?: string | null;
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
    cancelPendingApplication: () => Promise<string | null>;
    fetchUnacknowledgedDecision: () => Promise<NaturalApplication | null>;
    acknowledgeDecision: (appId: string) => Promise<string | null>;
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

                // Note: profile-sync subscription has been moved to a useEffect hook in _layout.tsx
                // to prevent race conditions during React double-invocations on mount.
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
        
        // Wipe the primary Auth Store
        set({ session: null, profile: null });
        
        // Forcefully wipe the legacy Profile Store so stale data doesn't ghost
        if (useUserStore && useUserStore.setState) {
            useUserStore.setState({ 
                name: '', 
                handle: '', 
                avatar: '', 
                email: '',
                height: '',
                weight: 0,
                bfs: '',
                tribe: '',
                tribeAvatar: '',
                followers: 0,
                following: 0,
                units: 'imperial',
                status: 'none',
                macroTargets: { p: 0, c: 0, f: 0, calories: 0 },
                lastMacroUpdate: '',
                trainingTarget: '',
                activity: '',
                activityIcon: '',
                bio: '',
                isPrivate: false,
                showMeals: false,
                showWorkouts: false,
                showMacros: false,
                showLikes: false,
                showMeasurements: false,
                instagramLink: '',
                tiktokLink: ''
            }); 
        }
    },

    refreshProfile: async () => {
        let userId = get().session?.user?.id;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                userId = session.user.id;
                set({ session });
            }
        }
        if (!userId) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            set({ profile: data as DbProfile });

            // Automatically check and sync timezone if it differs or is uninitialized
            const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            if (data.timezone !== currentTimezone) {
                supabase
                    .from('profiles')
                    .update({ timezone: currentTimezone })
                    .eq('id', userId)
                    .then(({ error: tzError }) => {
                        if (!tzError) {
                            set({ profile: { ...data, timezone: currentTimezone } as DbProfile });
                        }
                    });
            }
        }
    },

    updateProfile: async (updates) => {
        let userId = get().session?.user?.id;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                userId = session.user.id;
                set({ session });
            }
        }
        if (!userId) return 'Not signed in';

        console.log(`[AuthStore] Attempting profile update for user ${userId}:`, updates);

        const { data, error, status, statusText } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select();

        if (error) {
            console.error('[AuthStore] updateProfile database error:', error);
            return error.message;
        }

        if (!data || data.length === 0) {
            const rlsMsg = `[AuthStore] updateProfile silent rejection: 0 rows updated. Check Row Level Security (RLS) policies for table 'profiles' and command 'UPDATE' for user: ${userId}. HTTP Status: ${status} (${statusText})`;
            console.error(rlsMsg);
            return 'Update silently rejected by database policies (RLS)';
        }

        console.log('[AuthStore] Profile updated successfully:', data[0]);
        set({ profile: data[0] as DbProfile });

        // Keep legacy UserStore status in sync to avoid any UI lag/inconsistency
        if (updates.status) {
            useUserStore.getState().setStatus(updates.status);
        }

        return null;
    },

    cancelPendingApplication: async (): Promise<string | null> => {
        let userId = get().session?.user?.id || get().profile?.id;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }
        if (!userId) return 'Not signed in';

        const { error } = await supabase
            .from('natural_applications')
            .update({ status: 'canceled' })
            .eq('user_id', userId)
            .eq('status', 'pending');

        if (error) {
            console.error('[AuthStore] cancelPendingApplication database error:', error);
            return error.message;
        }
        return null;
    },

    fetchUnacknowledgedDecision: async (): Promise<NaturalApplication | null> => {
        let userId = get().session?.user?.id || get().profile?.id;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }
        if (!userId) return null;

        const { data, error } = await supabase
            .from('natural_applications')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['approved', 'rejected'])
            .eq('decision_acknowledged', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[AuthStore] fetchUnacknowledgedDecision database error:', error);
            return null;
        }
        return data as NaturalApplication | null;
    },

    acknowledgeDecision: async (appId: string): Promise<string | null> => {
        const { error } = await supabase
            .from('natural_applications')
            .update({ decision_acknowledged: true })
            .eq('id', appId);

        if (error) {
            console.error('[AuthStore] acknowledgeDecision database error:', error);
            return error.message;
        }
        return null;
    },
}));
