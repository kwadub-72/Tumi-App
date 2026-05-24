import { create } from 'zustand';

export type ActiveFeedTab = 'Macros' | 'Diary' | 'Maps';

interface FeedState {
    activeFeedTab: ActiveFeedTab;
    setActiveFeedTab: (tab: ActiveFeedTab) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
    activeFeedTab: 'Diary',
    setActiveFeedTab: (tab) => set({ activeFeedTab: tab }),
}));
