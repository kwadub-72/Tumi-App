import { create } from 'zustand';
import { Tribe, User } from '@/src/shared/models/types';
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
    init: () => void;
}

export const useUserTribeStore = create<UserTribeState>((set, get) => ({
    myTribes: [],
    pendingTribes: [],
    selectedTribe: null,

    init: () => {
        // Initialize with some fake data for demo
        const allTribes = generateFakeTribes();
        // Assume user is member of first 2
        set({
            myTribes: allTribes.slice(0, 2).map(t => ({ ...t, joinStatus: 'joined' })),
            pendingTribes: [],
            selectedTribe: null
        });
    },

    joinTribe: (tribe: Tribe) => {
        const { myTribes, pendingTribes } = get();

        if (tribe.privacy === 'private') {
            // Request logic
            if (!pendingTribes.includes(tribe.id)) {
                set({ pendingTribes: [...pendingTribes, tribe.id] });
                // In a real app, backend would handle approval. 
                // Here we just keep it pending until "accepted" (which we might mock via a secret timeout or just manual toggle if needed, but per request: gray button -> member if accepted)
                // For demo flow: Let's assume private tribes are "Requested" indefinitely until "Accepted".
                // But user wants to see "Member" eventually. 
                // Let's auto-accept after 5 seconds for demo purposes? Or just keep as requested for now.
            }
        } else {
            // Public logic -> Join immediately
            if (!myTribes.find(t => t.id === tribe.id)) {
                set({ myTribes: [...myTribes, { ...tribe, joinStatus: 'joined' }] });
            }
        }
    },

    leaveTribe: (tribeId: string) => {
        const { myTribes, selectedTribe, pendingTribes } = get();

        // Remove from members
        const newTribes = myTribes.filter(t => t.id !== tribeId);

        // Remove from pending if there
        const newPending = pendingTribes.filter(id => id !== tribeId);

        // If currently selected tribe is left, deselect it
        let newSelected = selectedTribe;
        if (selectedTribe?.id === tribeId) {
            newSelected = null;
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
        // Add to myTribes with joined status
        const newTribe = { ...tribe, joinStatus: 'joined' as const };
        set({
            myTribes: [...myTribes, newTribe],
            selectedTribe: newTribe // Auto select the new tribe
        });
    }
}));
