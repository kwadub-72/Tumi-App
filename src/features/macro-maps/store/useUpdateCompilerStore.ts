import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';
import { MacroMapCheckpoint } from '@/src/shared/models/types';
import { Alert } from 'react-native';

export interface CompilerCheckpoint extends Omit<MacroMapCheckpoint, 'intent'> {
    intent: 'weight-plateau' | 'time-deadline' | 'weight-down' | 'weight-up' | 'maintain';
    is_outlier_flare?: boolean;
}

interface UpdateCompilerState {
    // Dates & inputs
    generationType: 'update' | 'meal_log';
    mapName: string;
    startDate: string | null;
    endDate: string | null;
    startLogs: any[];
    endLogs: any[];
    selectedStartLogId: string | null;
    selectedEndLogId: string | null;
    outlierFlareLogIds: string[];
    parsedCheckpoints: CompilerCheckpoint[] | null;
    trajectoryAverages: {
        avgCalories: number;
        totalWeightDelta: number;
        avgProtein: number;
        avgCarbs: number;
        avgFats: number;
    } | null;
    isCompiling: boolean;

    // Logged dates
    loggedDates: Set<string>;

    // For CompileStudioScreen compatibility
    macroLogs: CompilerCheckpoint[];
    outlierFlares: Record<string, boolean>;

    // Actions
    setGenerationType: (type: 'update' | 'meal_log') => void;
    setMapName: (name: string) => void;
    loadLoggedDates: () => Promise<void>;
    setStartDate: (date: string) => Promise<void>;
    setEndDate: (date: string) => Promise<void>;
    setSelectedStartLogId: (id: string | null) => void;
    setSelectedEndLogId: (id: string | null) => void;
    toggleOutlierFlare: (id: string) => void;
    compileRange: () => Promise<void>;
    reset: () => void;
    clearCompilation: () => void;
    resetDates: () => void;

    // Helper actions for compatibility with older screens
    selectStartLog: (id: string | null) => void;
    selectEndLog: (id: string | null) => void;
    getTrackSummary: () => {
        trackType: 'Cut' | 'Bulk' | 'Maintenance';
        durationDays: number;
        avgPctShift: number;
    };
}

export const useUpdateCompilerStore = create<UpdateCompilerState>((set, get) => ({
    generationType: 'update',
    mapName: '',
    startDate: null,
    endDate: null,
    startLogs: [],
    endLogs: [],
    selectedStartLogId: null,
    selectedEndLogId: null,
    outlierFlareLogIds: [],
    parsedCheckpoints: null,
    trajectoryAverages: null,
    isCompiling: false,

    loggedDates: new Set<string>(),

    macroLogs: [],
    outlierFlares: {},

    setMapName: (name: string) => set({ mapName: name }),
    setGenerationType: (type: 'update' | 'meal_log') => set({ generationType: type }),

    loadLoggedDates: async () => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) {
            // Mock data fallback for offline/guest mode testing
            const mockDates = new Set<string>();
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                // mock every alternate day
                if (i % 2 === 0) {
                    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
                    mockDates.add(d.toISOString().split('T')[0]);
                }
            }
            set({ loggedDates: mockDates });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('macro_history')
                .select('created_at')
                .eq('user_id', userId);

            if (error) throw error;

            const dates = new Set<string>();
            if (data) {
                data.forEach((row: any) => {
                    if (row.created_at) {
                        dates.add(row.created_at.split('T')[0]);
                    }
                });
            }
            set({ loggedDates: dates });
        } catch (err) {
            console.error('[useUpdateCompilerStore.loadLoggedDates] Error:', err);
        }
    },

    setStartDate: async (date: string) => {
        const { loggedDates, endDate } = get();
        let currentLoggedDates = loggedDates;
        if (currentLoggedDates.size === 0) {
            await get().loadLoggedDates();
            currentLoggedDates = get().loggedDates;
        }

        if (!currentLoggedDates.has(date)) {
            Alert.alert('Invalid Selection', 'Start Boundary must be set on a date where you have logged history.');
            return;
        }

        if (endDate && new Date(date) >= new Date(endDate)) {
            Alert.alert('Invalid Selection', 'Start date must be chronologically before the end date.');
            return;
        }

        set({ startDate: date, isCompiling: true });
        const userId = useAuthStore.getState().session?.user?.id;
        
        try {
            if (!userId) {
                // Fallback mock data immediately when not logged in
                const mockStartLogs = [
                    {
                        id: 'mock-start-1',
                        created_at: `${date}T08:00:00Z`,
                        macro_targets: { calories: 2800, p: 200, c: 320, f: 80 },
                        weight_lbs: 188.5
                    },
                    {
                        id: 'mock-start-2',
                        created_at: `${date}T19:30:00Z`,
                        macro_targets: { calories: 2750, p: 195, c: 310, f: 80 },
                        weight_lbs: 188.2
                    }
                ];
                set({
                    startLogs: mockStartLogs,
                    selectedStartLogId: 'mock-start-1'
                });
                return;
            }

            const startISO = `${date}T00:00:00Z`;
            const endISO = `${date}T23:59:59Z`;
            
            const { data, error } = await supabase
                .from('macro_history')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startISO)
                .lte('created_at', endISO);

            if (error) throw error;
            
            if (!data || data.length === 0) {
                // Fallback mock logs if DB is empty
                const mockStartLogs = [
                    {
                        id: 'mock-start-1',
                        created_at: `${date}T08:00:00Z`,
                        macro_targets: { calories: 2800, p: 200, c: 320, f: 80 },
                        weight_lbs: 188.5
                    }
                ];
                set({
                    startLogs: mockStartLogs,
                    selectedStartLogId: 'mock-start-1'
                });
                return;
            }

            const logsWithWeight = await Promise.all(data.map(async (log: any) => {
                const { data: wData } = await supabase
                    .from('weights')
                    .select('weight')
                    .eq('user_id', userId)
                    .eq('date', date)
                    .limit(1)
                    .maybeSingle();

                return {
                    id: log.id,
                    created_at: log.created_at,
                    macro_targets: log.macro_targets,
                    weight_lbs: wData ? Number(wData.weight) : null
                };
            }));

            set({ 
                startLogs: logsWithWeight, 
                selectedStartLogId: logsWithWeight.length > 0 ? logsWithWeight[0].id : null 
            });
        } catch (err) {
            console.error('[useUpdateCompilerStore.setStartDate] Error:', err);
        } finally {
            set({ isCompiling: false });
        }
    },

    setEndDate: async (date: string) => {
        const { loggedDates, startDate } = get();
        let currentLoggedDates = loggedDates;
        if (currentLoggedDates.size === 0) {
            await get().loadLoggedDates();
            currentLoggedDates = get().loggedDates;
        }

        if (!currentLoggedDates.has(date)) {
            Alert.alert('Invalid Selection', 'End Boundary must be set on a date where you have logged history.');
            return;
        }

        if (startDate && new Date(date) <= new Date(startDate)) {
            Alert.alert('Invalid Selection', 'End date must be chronologically after the start date.');
            return;
        }

        set({ endDate: date, isCompiling: true });
        const userId = useAuthStore.getState().session?.user?.id;
        
        try {
            if (!userId) {
                // Fallback mock data immediately when not logged in
                const mockEndLogs = [
                    {
                        id: 'mock-end-1',
                        created_at: `${date}T08:00:00Z`,
                        macro_targets: { calories: 2400, p: 200, c: 225, f: 78 },
                        weight_lbs: 184.8
                    },
                    {
                        id: 'mock-end-2',
                        created_at: `${date}T20:15:00Z`,
                        macro_targets: { calories: 2350, p: 195, c: 215, f: 78 },
                        weight_lbs: 184.5
                    }
                ];
                set({
                    endLogs: mockEndLogs,
                    selectedEndLogId: 'mock-end-1'
                });
                return;
            }

            const startISO = `${date}T00:00:00Z`;
            const endISO = `${date}T23:59:59Z`;
            
            const { data, error } = await supabase
                .from('macro_history')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startISO)
                .lte('created_at', endISO);

            if (error) throw error;
            
            if (!data || data.length === 0) {
                // Fallback mock logs if DB is empty
                const mockEndLogs = [
                    {
                        id: 'mock-end-1',
                        created_at: `${date}T08:00:00Z`,
                        macro_targets: { calories: 2400, p: 200, c: 225, f: 78 },
                        weight_lbs: 184.8
                    }
                ];
                set({
                    endLogs: mockEndLogs,
                    selectedEndLogId: 'mock-end-1'
                });
                return;
            }

            const logsWithWeight = await Promise.all(data.map(async (log: any) => {
                const { data: wData } = await supabase
                    .from('weights')
                    .select('weight')
                    .eq('user_id', userId)
                    .eq('date', date)
                    .limit(1)
                    .maybeSingle();

                return {
                    id: log.id,
                    created_at: log.created_at,
                    macro_targets: log.macro_targets,
                    weight_lbs: wData ? Number(wData.weight) : null
                };
            }));

            set({ 
                endLogs: logsWithWeight, 
                selectedEndLogId: logsWithWeight.length > 0 ? logsWithWeight[0].id : null 
            });
        } catch (err) {
            console.error('[useUpdateCompilerStore.setEndDate] Error:', err);
        } finally {
            set({ isCompiling: false });
        }
    },

    setSelectedStartLogId: (id) => set({ selectedStartLogId: id }),
    setSelectedEndLogId: (id) => set({ selectedEndLogId: id }),
    
    // For older screens compatibility
    selectStartLog: (id) => set({ selectedStartLogId: id }),
    selectEndLog: (id) => set({ selectedEndLogId: id }),

    toggleOutlierFlare: (id) => set((state) => {
        const isPresent = state.outlierFlareLogIds.includes(id);
        const updatedIds = isPresent
            ? state.outlierFlareLogIds.filter(x => x !== id)
            : [...state.outlierFlareLogIds, id];

        const updatedFlares = { ...state.outlierFlares, [id]: !isPresent };

        // Sync inside parsedCheckpoints as well
        const updatedCheckpoints = state.parsedCheckpoints 
            ? state.parsedCheckpoints.map(cp => cp.id === id ? { ...cp, is_outlier_flare: !isPresent } : cp)
            : null;

        return { 
            outlierFlareLogIds: updatedIds,
            outlierFlares: updatedFlares,
            parsedCheckpoints: updatedCheckpoints,
            macroLogs: updatedCheckpoints || []
        };
    }),

    compileRange: async () => {
        const { startDate, endDate, selectedStartLogId, selectedEndLogId, startLogs, endLogs } = get();
        if (!startDate || !endDate) return;

        set({ isCompiling: true });
        const userId = useAuthStore.getState().session?.user?.id;

        try {
            // Check if we are running with mocked dates/logs
            const isMocked = selectedStartLogId?.startsWith('mock') || selectedEndLogId?.startsWith('mock');

            if (isMocked || !userId) {
                // Form a structured retrospective sequence of 3 milestones
                const startLog = startLogs.find(l => l.id === selectedStartLogId) || startLogs[0];
                const endLog = endLogs.find(l => l.id === selectedEndLogId) || endLogs[0];

                const mockCheckpoints: CompilerCheckpoint[] = [
                    {
                        id: startLog?.id || 'mock-start-1',
                        date: startDate,
                        weight: startLog?.weight_lbs || 188.5,
                        targets: {
                            calories: startLog?.macro_targets?.calories || 2800,
                            p: startLog?.macro_targets?.p || 200,
                            c: startLog?.macro_targets?.c || 320,
                            f: startLog?.macro_targets?.f || 80,
                        },
                        intent: 'time-deadline',
                        is_outlier_flare: false
                    },
                    {
                        id: 'mock-mid-1',
                        date: new Date(new Date(startDate).getTime() + (new Date(endDate).getTime() - new Date(startDate).getTime()) / 2).toISOString().split('T')[0],
                        weight: Math.round(((startLog?.weight_lbs || 188.5) + (endLog?.weight_lbs || 184.8)) / 2 * 10) / 10,
                        targets: {
                            calories: Math.round(((startLog?.macro_targets?.calories || 2800) + (endLog?.macro_targets?.calories || 2400)) / 2),
                            p: Math.round(((startLog?.macro_targets?.p || 200) + (endLog?.macro_targets?.p || 200)) / 2),
                            c: Math.round(((startLog?.macro_targets?.c || 320) + (endLog?.macro_targets?.c || 225)) / 2),
                            f: Math.round(((startLog?.macro_targets?.f || 80) + (endLog?.macro_targets?.f || 78)) / 2),
                        },
                        intent: 'weight-plateau',
                        is_outlier_flare: false
                    },
                    {
                        id: endLog?.id || 'mock-end-1',
                        date: endDate,
                        weight: endLog?.weight_lbs || 184.8,
                        targets: {
                            calories: endLog?.macro_targets?.calories || 2400,
                            p: endLog?.macro_targets?.p || 200,
                            c: endLog?.macro_targets?.c || 225,
                            f: endLog?.macro_targets?.f || 78,
                        },
                        intent: 'weight-plateau',
                        is_outlier_flare: false
                    }
                ];

                const avgCalories = Math.round(mockCheckpoints.reduce((acc, curr) => acc + curr.targets.calories, 0) / mockCheckpoints.length);
                const avgProtein = Math.round(mockCheckpoints.reduce((acc, curr) => acc + curr.targets.p, 0) / mockCheckpoints.length);
                const avgCarbs = Math.round(mockCheckpoints.reduce((acc, curr) => acc + curr.targets.c, 0) / mockCheckpoints.length);
                const avgFats = Math.round(mockCheckpoints.reduce((acc, curr) => acc + curr.targets.f, 0) / mockCheckpoints.length);
                const totalWeightDelta = Math.round(((endLog?.weight_lbs || 184.8) - (startLog?.weight_lbs || 188.5)) * 10) / 10;

                set({
                    parsedCheckpoints: mockCheckpoints,
                    macroLogs: mockCheckpoints,
                    trajectoryAverages: {
                        avgCalories,
                        totalWeightDelta,
                        avgProtein,
                        avgCarbs,
                        avgFats
                    }
                });
                return;
            }

            if (!userId) {
                throw new Error("Cannot compile range: missing user ID.");
            }

            let checkpoints: CompilerCheckpoint[] = [];

            if (get().generationType === 'meal_log') {
                const payloadObject = {
                    target_user_id: userId,
                    start_date: startDate,
                    end_date: endDate,
                    generation_type: get().generationType
                };
                console.log("🔥 EXACT RPC PAYLOAD:", JSON.stringify(payloadObject, null, 2));

                const { data: historyData, error: historyErr } = await supabase.rpc('fetch_historical_meal_averages', payloadObject);

                if (historyErr) throw historyErr;

                if (!historyData || historyData.length === 0) {
                    throw new Error('No historical meal logs found in this date range.');
                }

                checkpoints = historyData.map((log: any) => ({
                    id: log.week_start,
                    date: log.week_start,
                    weight: log.avg_weight ? Number(log.avg_weight) : 180,
                    targets: {
                        calories: Number(log.avg_calories) || 2000,
                        p: Number(log.avg_protein) || 150,
                        c: Number(log.avg_carbs) || 200,
                        f: Number(log.avg_fats) || 60
                    },
                    intent: 'time-deadline',
                    is_outlier_flare: false
                }));
            } else {
                const { data: historyData, error: historyErr } = await supabase
                    .from('macro_history')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('created_at', `${startDate}T00:00:00Z`)
                    .lte('created_at', `${endDate}T23:59:59Z`)
                    .order('created_at', { ascending: true });

                if (historyErr) throw historyErr;

                if (!historyData || historyData.length === 0) {
                    throw new Error('No historical macro changes logged in this date range.');
                }

                checkpoints = await Promise.all(historyData.map(async (log: any) => {
                    const datePart = log.created_at.split('T')[0];
                    const { data: wData } = await supabase
                        .from('weights')
                        .select('weight')
                        .eq('user_id', userId)
                        .eq('date', datePart)
                        .limit(1)
                        .maybeSingle();

                    const targets = log.macro_targets ?? {};
                    return {
                        id: log.id,
                        date: datePart,
                        weight: wData ? Number(wData.weight) : 180,
                        targets: {
                            calories: targets.calories ?? 2000,
                            p: targets.p ?? 150,
                            c: targets.c ?? 200,
                            f: targets.f ?? 60
                        },
                        intent: log.intent_driver === 'WEIGHT_PLATEAU' ? 'weight-plateau' : 'time-deadline',
                        is_outlier_flare: get().outlierFlareLogIds.includes(log.id)
                    };
                }));
            }

            const avgCalories = Math.round(checkpoints.reduce((acc, curr) => acc + curr.targets.calories, 0) / checkpoints.length);
            const avgProtein = Math.round(checkpoints.reduce((acc, curr) => acc + curr.targets.p, 0) / checkpoints.length);
            const avgCarbs = Math.round(checkpoints.reduce((acc, curr) => acc + curr.targets.c, 0) / checkpoints.length);
            const avgFats = Math.round(checkpoints.reduce((acc, curr) => acc + curr.targets.f, 0) / checkpoints.length);
            
            const startWeight = checkpoints[0].weight;
            const endWeight = checkpoints[checkpoints.length - 1].weight;
            const totalWeightDelta = Math.round((endWeight - startWeight) * 10) / 10;

            set({
                parsedCheckpoints: checkpoints,
                macroLogs: checkpoints,
                trajectoryAverages: {
                    avgCalories,
                    totalWeightDelta,
                    avgProtein,
                    avgCarbs,
                    avgFats
                }
            });

        } catch (err: any) {
            console.error('[useUpdateCompilerStore.compileRange] Error:', err);
            Alert.alert('Compile Error', err.message || 'Failed to parse historical log metrics.');
        } finally {
            set({ isCompiling: false });
        }
    },

    getTrackSummary: () => {
        const { parsedCheckpoints, selectedStartLogId, selectedEndLogId } = get();
        
        // Return baseline fallback metrics if not yet compiled or selected
        if (!parsedCheckpoints || parsedCheckpoints.length < 2) {
            return { trackType: 'Cut', durationDays: 14, avgPctShift: -14 };
        }

        const startLog = parsedCheckpoints.find(l => l.id === selectedStartLogId) || parsedCheckpoints[0];
        const endLog = parsedCheckpoints.find(l => l.id === selectedEndLogId) || parsedCheckpoints[parsedCheckpoints.length - 1];

        const startCal = startLog.targets.calories;
        const endCal = endLog.targets.calories;

        let trackType: 'Cut' | 'Bulk' | 'Maintenance' = 'Maintenance';
        if (endCal < startCal - 50) {
            trackType = 'Cut';
        } else if (endCal > startCal + 50) {
            trackType = 'Bulk';
        }

        const startD = new Date(startLog.date);
        const endD = new Date(endLog.date);
        const diffTime = Math.abs(endD.getTime() - startD.getTime());
        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 14;

        const avgPctShift = Math.round(((endCal - startCal) / startCal) * 100);

        return {
            trackType,
            durationDays,
            avgPctShift
        };
    },

    reset: () => set({
        mapName: '',
        generationType: 'update',
        startDate: null,
        endDate: null,
        startLogs: [],
        endLogs: [],
        selectedStartLogId: null,
        selectedEndLogId: null,
        outlierFlareLogIds: [],
        parsedCheckpoints: null,
        trajectoryAverages: null,
        macroLogs: [],
        outlierFlares: {}
    }),

    clearCompilation: () => set({
        parsedCheckpoints: null,
        trajectoryAverages: null,
        outlierFlareLogIds: [],
        macroLogs: [],
        outlierFlares: {}
    }),

    resetDates: () => set({
        startDate: null,
        endDate: null,
        startLogs: [],
        endLogs: [],
        selectedStartLogId: null,
        selectedEndLogId: null,
        parsedCheckpoints: null,
        trajectoryAverages: null,
        outlierFlareLogIds: [],
        macroLogs: [],
        outlierFlares: {}
    })
}));
