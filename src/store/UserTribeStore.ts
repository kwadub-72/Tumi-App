import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tribe, User } from '@/src/shared/models/types';
import { SupabaseNetworkService } from '../shared/services/SupabaseNetworkService';
import { generateFakeTribes } from '@/src/shared/utils/FakeDataGenerator';

interface UserTribeState {
    myTribes: Tribe[]; // Tribes the user is a MEMBER of
    pendingTribes: string[]; // IDs of tribes requested
    selectedTribe: Tribe | null; // The tribe currently active on the Home Feed

    // Actions
    joinTribe: (tribe: Tribe) => void;
    leaveTribe: (tribeId: string) => void;
    selectTribe: (tribeId: string | null) => void;
    isMember: (tribeId: string) => boolean;
    isRequested: (tribeId: string) => boolean;
    createTribe: (tribe: Tribe) => void;

    // Initialization (mock)
    init: (userId?: string) => Promise<void>;
    refreshMyTribes: (userId: string) => Promise<void>;
}

export const useUserTribeStore = create<UserTribeState>()(
    persist(
        (set, get) => ({
            myTribes: [],
            pendingTribes: [],
            selectedTribe: null,

            init: async (userId?: string) => {
                if (userId) {
                    await get().refreshMyTribes(userId);
                } else {
                    // Fallback to fake data for guest/demo
                    if (get().myTribes.length === 0) {
                        const allTribes = generateFakeTribes();
                        set({
                            myTribes: allTribes.slice(0, 2).map(t => ({ ...t, joinStatus: 'joined' })),
                        });
                    }
                }
            },

            refreshMyTribes: async (userId: string) => {
                const tribes = await SupabaseNetworkService.getMyTribes(userId);
                set({ myTribes: tribes });

                // Update selectedTribe if it's no longer valid
                const currentSelected = get().selectedTribe;
                if (currentSelected && !tribes.find(t => t.id === currentSelected.id)) {
                    set({ selectedTribe: null });
                } else if (!currentSelected && tribes.length > 0) {
                    set({ selectedTribe: tribes[0] });
                }
            },

            joinTribe: (tribe: Tribe) => {
                const { myTribes, pendingTribes } = get();

                if (tribe.privacy === 'private') {
                    if (!pendingTribes.includes(tribe.id)) {
                        set({ pendingTribes: [...pendingTribes, tribe.id] });
                    }
                } else {
                    if (!myTribes.find(t => t.id === tribe.id)) {
                        set({ myTribes: [...myTribes, { ...tribe, joinStatus: 'joined' }] });
                    }
                }
            },

            leaveTribe: (tribeId: string) => {
                const { myTribes, selectedTribe, pendingTribes } = get();
                const newTribes = myTribes.filter(t => t.id !== tribeId);
                const newPending = pendingTribes.filter(id => id !== tribeId);
                let newSelected = selectedTribe;
                if (selectedTribe?.id === tribeId) {
                    newSelected = newTribes.length > 0 ? newTribes[0] : null;
                }
                set({
                    myTribes: newTribes,
                    pendingTribes: newPending,
                    selectedTribe: newSelected
                });
            },

            selectTribe: (tribeId: string | null) => {
                if (!tribeId) {
                    set({ selectedTribe: null });
                    return;
                }
                const tribe = get().myTribes.find(t => t.id === tribeId);
                if (tribe) {
                    set({ selectedTribe: tribe });
                }
            },

            isMember: (tribeId: string) => {
                return !!get().myTribes.find(t => t.id === tribeId);
            },

            isRequested: (tribeId: string) => {
                return get().pendingTribes.includes(tribeId);
            },

            createTribe: (tribe: Tribe) => {
                const { myTribes } = get();
                const newTribe = { ...tribe, joinStatus: 'joined' as const };
                set({
                    myTribes: [...myTribes, newTribe],
                    selectedTribe: newTribe
                });
            }
        }),
        {
            name: 'user-tribe-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
