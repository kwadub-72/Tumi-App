import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';

export type GoalFilter = string;
export type EngineFilter = string;
export type StatusFilter = string;
export type ActivityFilter = string;

export interface DiscoveryMap {
    id: string;
    map_name: string;
    creator_id: string;
    global_track: 'CUT' | 'BULK' | 'MAINTENANCE';
    generation_type: 'update' | 'meal_log';
    is_live: boolean;
    is_published: boolean;
    created_at: string;
    display_name: string;
    avatar_url: string | null;
    verified_bio: string | null;
    [key: string]: any;
}

interface MarketplaceState {
    discoveryMaps: DiscoveryMap[];
    filteredMaps: DiscoveryMap[];
    activeGoalFilters: string[];
    activeEngineFilters: string[];
    activeStatusFilters: string[];
    activeActivityFilters: string[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;

    toggleGoalFilter: (option: string) => void;
    toggleEngineFilter: (option: string) => void;
    toggleStatusFilter: (option: string) => void;
    toggleActivityFilter: (option: string) => void;
    clearFilters: () => void;
    setSearchQuery: (query: string) => void;
    fetchDiscoveryFeed: () => Promise<void>;
    applyFilters: () => void;
}

const toggleFilterLogic = (currentArray: string[], option: string): string[] => {
    if (option === 'All') return ['All'];
    let newArr = currentArray.filter(i => i !== 'All');
    if (newArr.includes(option)) {
        newArr = newArr.filter(i => i !== option);
    } else {
        newArr.push(option);
    }
    if (newArr.length === 0) return ['All'];
    return newArr;
};

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
    discoveryMaps: [],
    filteredMaps: [],
    activeGoalFilters: ['All'],
    activeEngineFilters: ['All'],
    activeStatusFilters: ['All'],
    activeActivityFilters: ['All'],
    searchQuery: '',
    isLoading: false,
    error: null,

    toggleGoalFilter: (option) => {
        set((state) => ({ activeGoalFilters: toggleFilterLogic(state.activeGoalFilters, option) }));
        get().applyFilters();
    },

    toggleEngineFilter: (option) => {
        set((state) => ({ activeEngineFilters: toggleFilterLogic(state.activeEngineFilters, option) }));
        get().applyFilters();
    },

    toggleStatusFilter: (option) => {
        set((state) => ({ activeStatusFilters: toggleFilterLogic(state.activeStatusFilters, option) }));
        get().applyFilters();
    },

    toggleActivityFilter: (option) => {
        set((state) => ({ activeActivityFilters: toggleFilterLogic(state.activeActivityFilters, option) }));
        get().applyFilters();
    },

    clearFilters: () => {
        set({
            activeGoalFilters: ['All'],
            activeEngineFilters: ['All'],
            activeStatusFilters: ['All'],
            activeActivityFilters: ['All']
        });
        get().applyFilters();
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
        get().applyFilters();
    },

    fetchDiscoveryFeed: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('public_discovery_maps')
                .select('*');

            if (error) {
                throw error;
            }

            set({ discoveryMaps: data || [] });
            get().applyFilters();
        } catch (err: any) {
            console.error('[useMarketplaceStore] Failed to fetch discovery feed:', err);
            set({ error: err.message || 'Failed to fetch maps' });
        } finally {
            set({ isLoading: false });
        }
    },

    applyFilters: () => {
        const { 
            discoveryMaps, 
            activeGoalFilters, 
            activeEngineFilters, 
            activeStatusFilters, 
            activeActivityFilters, 
            searchQuery 
        } = get();

        const filtered = discoveryMaps.filter((map) => {
            // Goal Match Check
            let goalMatch = true;
            if (!activeGoalFilters.includes('All')) {
                goalMatch = activeGoalFilters.some(g => map.global_track === g.toUpperCase());
            }

            // Engine Match Check
            let engineMatch = true;
            if (!activeEngineFilters.includes('All')) {
                engineMatch = activeEngineFilters.some(engine => {
                    if (engine === 'Live') return map.is_live === true;
                    if (engine === 'Retrospective') return map.is_live === false && map.generation_type === 'update';
                    if (engine === 'Created') return map.is_live === false && map.generation_type !== 'update';
                    return false;
                });
            }

            // Status Match Check
            let statusMatch = true;
            if (!activeStatusFilters.includes('All')) {
                statusMatch = activeStatusFilters.some(status => 
                    (map.status || map.map_status || '').toLowerCase() === status.toLowerCase()
                );
            }

            // Activity Match Check
            let activityMatch = true;
            if (!activeActivityFilters.includes('All')) {
                activityMatch = activeActivityFilters.some(activity => 
                    (map.activity_type || '').toLowerCase() === activity.toLowerCase()
                );
            }

            // Search Match Check
            let searchMatch = true;
            if (searchQuery.trim().length > 0) {
                const query = searchQuery.toLowerCase();
                const nameMatch = map.map_name?.toLowerCase().includes(query);
                const creatorMatch = map.display_name?.toLowerCase().includes(query);
                const handleMatch = map.creator_handle?.toLowerCase().includes(query) || map.username?.toLowerCase().includes(query);
                searchMatch = !!nameMatch || !!creatorMatch || !!handleMatch;
            }

            return goalMatch && engineMatch && statusMatch && activityMatch && searchMatch;
        });

        set({ filteredMaps: filtered });
    }
}));
