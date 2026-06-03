import { create } from 'zustand';
import { TribeType } from '@/src/shared/models/types';
import { CompetitionConfig } from '@/src/features/tribes/components/EditCompetitionModal';

export const FOCUS_OPTIONS: { label: string; value: TribeType; icon: string }[] = [
    { label: 'Accountability', value: 'accountability', icon: 'calendar' },
    { label: 'Head-to-Head', value: 'head-to-head', icon: 'trophy-outline' },
    { label: 'Tribe Battle', value: 'tribe-vs-tribe', icon: 'trophy-variant-outline' }
];

export interface ChiefsChamberState {
    tribeId: string | null;
    focus: { label: string; value: TribeType; icon: string };
    
    // UI State
    focusModalVisible: boolean;
    editModalVisible: boolean;
    
    // Competition State
    selectedCompId: string | null;
    compConfigs: Record<string, CompetitionConfig>;
    editingComp: { id: string, title: string, subtitle: string } | null;

    // Actions
    setTribeId: (id: string | null) => void;
    setFocus: (focus: { label: string; value: TribeType; icon: string }) => void;
    setFocusModalVisible: (visible: boolean) => void;
    setSelectedCompId: (id: string | null) => void;
    setEditModalVisible: (visible: boolean) => void;
    setEditingComp: (comp: { id: string, title: string, subtitle: string } | null) => void;
    
    saveCompConfig: (id: string, config: CompetitionConfig) => void;
    openCompEdit: (id: string, type: string, subtype: string) => void;
    reset: () => void;
}

export const useChiefsChamberStore = create<ChiefsChamberState>((set, get) => ({
    tribeId: null,
    focus: FOCUS_OPTIONS[0],
    
    focusModalVisible: false,
    editModalVisible: false,

    selectedCompId: null,
    compConfigs: {},
    editingComp: null,

    setTribeId: (id) => set({ tribeId: id }),
    setFocus: (focus) => set({ focus }),
    setFocusModalVisible: (visible) => set({ focusModalVisible: visible }),
    setSelectedCompId: (id) => set({ selectedCompId: id }),
    setEditModalVisible: (visible) => set({ editModalVisible: visible }),
    setEditingComp: (comp) => set({ editingComp: comp }),
    
    saveCompConfig: (id, config) => set((state) => ({
        compConfigs: { ...state.compConfigs, [id]: config },
        editModalVisible: false
    })),

    openCompEdit: (id: string, type: string, subtype: string) => {
        set({
            selectedCompId: id,
            editingComp: { id, title: `${type} · Head-to-Head`, subtitle: subtype },
            editModalVisible: true
        });
    },

    reset: () => set({
        tribeId: null,
        focus: FOCUS_OPTIONS[0],
        focusModalVisible: false,
        editModalVisible: false,
        selectedCompId: null,
        compConfigs: {},
        editingComp: null
    })
}));
