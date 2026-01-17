import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostStore } from './PostStore';

export type UnitSystem = 'imperial' | 'metric';

export type UserStatus = 'none' | 'natural-pending' | 'natural' | 'enhanced';

interface UserState {
    name: string;
    handle: string;
    avatar: string;
    email: string;
    height: string;
    weight: number;
    bfs: string;
    tribe: string;
    tribeAvatar: string;
    followers: number;
    following: number;
    units: UnitSystem;
    status: UserStatus;
    macroTargets: {
        p: number;
        c: number;
        f: number;
        calories: number;
    };
    lastMacroUpdate: string; // ISO date string
    trainingTarget: string;
    activity: string;
    activityIcon: string;

    // Actions
    setProfile: (updates: Partial<UserState>) => void;
    setUnits: (units: UnitSystem) => void;
    updateWeight: (weight: number) => void;
    setStatus: (status: UserStatus) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            name: 'Kwaku Adubofour',
            handle: '@kwadub',
            avatar: 'https://via.placeholder.com/150',
            email: 'kwadub72@gmail.com',
            height: "6'3",
            weight: 243,
            bfs: '8%',
            tribe: 'Team Flex',
            tribeAvatar: 'https://via.placeholder.com/50',
            followers: 1000,
            following: 45,
            units: 'imperial',
            status: 'none',
            macroTargets: {
                p: 250,
                c: 350,
                f: 80,
                calories: 3120, // (250*4 + 350*4 + 80*9) = 1000 + 1400 + 720 = 3120
            },
            lastMacroUpdate: new Date().toISOString().split('T')[0],
            trainingTarget: 'Lean is law.',
            activity: 'Bodybuilder (Bulk)',
            activityIcon: 'hammer',

            setProfile: async (updates) => {
                const handle = get().handle;
                set((state) => ({ ...state, ...updates }));
                // Sync with existing posts
                await PostStore.updateUser(handle, updates);
            },
            setUnits: (units) => set({ units }),
            updateWeight: (weight) => set({ weight }),
            setStatus: async (status) => {
                const handle = get().handle;
                set({ status });
                // Sync with existing posts
                await PostStore.updateUser(handle, { status });
            },
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
