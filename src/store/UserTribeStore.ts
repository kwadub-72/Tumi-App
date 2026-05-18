import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tribe } from '@/src/shared/models/types';
import { SupabaseTribeService, TribeMembership } from '../shared/services/SupabaseTribeService';

interface UserTribeState {
    myTribes: Tribe[];                         // Tribes the user is actively a member or chief of
    pendingTribes: string[];                   // IDs of tribes with 'pending' join request
    memberships: TribeMembership[];            // Raw memberships from DB (source of truth)
    selectedTribe: Tribe | null;               // The tribe currently active on the Home Feed

    // Actions
    joinTribe: (userId: string, tribe: Tribe) => Promise<void>;
    leaveTribe: (userId: string, tribeId: string) => Promise<void>;
    selectTribe: (tribeId: string | null) => void;
    isMember: (tribeId: string) => boolean;
    isRequested: (tribeId: string) => boolean;
    isChief: (tribeId: string) => boolean;
    createTribe: (tribe: Tribe) => void;

    // Initialization — fetches real DB state
    init: (userId?: string) => Promise<void>;
    refreshMyTribes: (userId: string) => Promise<void>;
}

export const useUserTribeStore = create<UserTribeState>()(
    persist(
        (set, get) => ({
            myTribes: [],
            pendingTribes: [],
            memberships: [],
            selectedTribe: null,

            init: async (userId?: string) => {
                if (userId) {
                    await get().refreshMyTribes(userId);
                }
            },

            refreshMyTribes: async (userId: string) => {
                try {
                    const [tribes, memberships] = await Promise.all([
                        SupabaseTribeService.getMyTribes(userId),
                        SupabaseTribeService.getMyMemberships(userId),
                    ]);

                    const pendingIds = memberships
                        .filter(m => m.role === 'pending')
                        .map(m => m.tribeId);

                    set({ myTribes: tribes, memberships, pendingTribes: pendingIds });

                    // Keep selectedTribe valid
                    const currentSelected = get().selectedTribe;
                    if (currentSelected && !tribes.find(t => t.id === currentSelected.id)) {
                        set({ selectedTribe: tribes.length > 0 ? tribes[0] : null });
                    } else if (!currentSelected && tribes.length > 0) {
                        set({ selectedTribe: tribes[0] });
                    }
                } catch (err) {
                    console.error('[UserTribeStore.refreshMyTribes]', err);
                }
            },

            joinTribe: async (userId: string, tribe: Tribe) => {
                try {
                    const result = await SupabaseTribeService.joinTribe(userId, tribe.id);
                    if (result === 'joined') {
                        const { myTribes } = get();
                        if (!myTribes.find(t => t.id === tribe.id)) {
                            set({ myTribes: [...myTribes, { ...tribe, joinStatus: 'joined' }] });
                        }
                    } else {
                        // 'requested' — pending
                        const { pendingTribes } = get();
                        if (!pendingTribes.includes(tribe.id)) {
                            set({ pendingTribes: [...pendingTribes, tribe.id] });
                        }
                    }
                    // Re-sync from DB to ensure consistency
                    await get().refreshMyTribes(userId);
                } catch (err) {
                    console.error('[UserTribeStore.joinTribe]', err);
                    throw err;
                }
            },

            leaveTribe: async (userId: string, tribeId: string) => {
                // Optimistic removal
                const { myTribes, selectedTribe, pendingTribes } = get();
                const newTribes = myTribes.filter(t => t.id !== tribeId);
                const newPending = pendingTribes.filter(id => id !== tribeId);
                const newSelected =
                    selectedTribe?.id === tribeId
                        ? (newTribes.length > 0 ? newTribes[0] : null)
                        : selectedTribe;

                set({ myTribes: newTribes, pendingTribes: newPending, selectedTribe: newSelected });

                try {
                    await SupabaseTribeService.leaveTribe(userId, tribeId);
                    await get().refreshMyTribes(userId);
                } catch (err) {
                    console.error('[UserTribeStore.leaveTribe]', err);
                    // Rollback optimistic state on error
                    set({ myTribes, pendingTribes, selectedTribe });
                    throw err;
                }
            },

            selectTribe: (tribeId: string | null) => {
                if (!tribeId) {
                    set({ selectedTribe: null });
                    return;
                }
                const tribe = get().myTribes.find(t => t.id === tribeId);
                if (tribe) set({ selectedTribe: tribe });
            },

            isMember: (tribeId: string) => {
                const { memberships } = get();
                return memberships.some(
                    m => m.tribeId === tribeId && (m.role === 'member' || m.role === 'chief')
                );
            },

            isRequested: (tribeId: string) => {
                const { memberships } = get();
                return memberships.some(m => m.tribeId === tribeId && m.role === 'pending');
            },

            isChief: (tribeId: string) => {
                const { memberships } = get();
                return memberships.some(m => m.tribeId === tribeId && m.role === 'chief');
            },

            createTribe: (tribe: Tribe) => {
                const { myTribes } = get();
                const newTribe = { ...tribe, joinStatus: 'joined' as const };
                set({
                    myTribes: [...myTribes, newTribe],
                    selectedTribe: newTribe,
                });
            },
        }),
        {
            name: 'user-tribe-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Persist only lightweight state — re-fetch tribes from DB on init
            partialize: (state) => ({
                selectedTribe: state.selectedTribe,
                pendingTribes: state.pendingTribes,
            }),
        }
    )
);
