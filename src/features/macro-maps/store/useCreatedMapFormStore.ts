import { create } from 'zustand';

export interface CheckpointFormState {
    trigger_type: 'WEIGHT_BASED' | 'TIME_BASED';
    intent_tag: 'PLATEAU_BREAK' | 'TARGET_REACHED' | 'STRATEGIC_REVERSAL' | 'EVENT_MILESTONE';
    
    // Sign toggles + absolute values to support refeed/deficit scaling
    weight_delta_sign: '+' | '-';
    weight_delta_val: string;
    
    calorie_delta_sign: '+' | '-';
    calorie_delta_val: string; // Value representing % Calorie reduction/increase (e.g. 10 for 10%)
    
    time_elapsed_val: string; // Value in current timeUnit (days or weeks)
    
    protein_ratio: string; // Stored as string (e.g. "35" for 35%)
    carbs_ratio: string;   // Stored as string (e.g. "45" for 45%)
    fats_ratio: string;    // Stored as string (e.g. "20" for 20%)
}

interface CreatedMapFormState {
    mapName: string;
    goalType: 'CUT' | 'BULK' | 'MAINTENANCE';
    totalDurationWeeks: number;
    timeUnit: 'days' | 'weeks';
    checkpoints: CheckpointFormState[];
    macroSumError: string | null;
    formValidationError: string | null;

    // Actions
    setMapName: (name: string) => void;
    setGoalType: (goal: 'CUT' | 'BULK' | 'MAINTENANCE') => void;
    setTotalDurationWeeks: (weeks: number) => void;
    setTimeUnit: (unit: 'days' | 'weeks') => void;
    
    addCheckpoint: () => void;
    removeCheckpoint: (index: number) => void;
    updateCheckpoint: (index: number, fields: Partial<CheckpointFormState>) => void;
    
    // Validation actions
    validateMacroRatios: () => void;
    validateForm: () => boolean;
    validateTimeBasedCheckpoint: (timeElapsedVal: string) => { isValid: boolean; error?: string };
    
    // Derived state selector
    calculateTimeRemaining: (timeElapsedVal: string) => string;
    
    resetForm: () => void;
}

const defaultCheckpoint = (goalSign: '+' | '-' = '-'): CheckpointFormState => ({
    trigger_type: 'TIME_BASED',
    intent_tag: 'PLATEAU_BREAK',
    weight_delta_sign: goalSign,
    weight_delta_val: '2',
    calorie_delta_sign: goalSign,
    calorie_delta_val: '10', // Default to 10% Calorie delta
    time_elapsed_val: '7',
    protein_ratio: '35', // Default whole numbers
    carbs_ratio: '45',
    fats_ratio: '20'
});

const calculateMacroSumError = (checkpoints: CheckpointFormState[]): string | null => {
    for (let i = 0; i < checkpoints.length; i++) {
        const cp = checkpoints[i];
        const sum = Number(cp.protein_ratio) + Number(cp.carbs_ratio) + Number(cp.fats_ratio);
        if (sum !== 100) {
            return `Checkpoint ${i + 1} macro ratios must sum to exactly 100%. Currently they sum to ${sum}%.`;
        }
    }
    return null;
};

const calculateFormValidationError = (
    mapName: string,
    totalDurationWeeks: number,
    checkpoints: CheckpointFormState[]
): string | null => {
    if (!mapName.trim()) {
        return 'Please enter a name for your map.';
    }
    if (totalDurationWeeks < 1) {
        return 'Total duration must be at least 1 week.';
    }
    if (checkpoints.length === 0) {
        return 'You must add at least one checkpoint to build a map.';
    }
    return null;
};

export const useCreatedMapFormStore = create<CreatedMapFormState>((set, get) => ({
    mapName: '',
    goalType: 'CUT',
    totalDurationWeeks: 8,
    timeUnit: 'days',
    checkpoints: [defaultCheckpoint('-')],
    macroSumError: null,
    formValidationError: null,

    setMapName: (name) => {
        set({ mapName: name });
        const { totalDurationWeeks, checkpoints } = get();
        set({ formValidationError: calculateFormValidationError(name, totalDurationWeeks, checkpoints) });
    },
    
    setGoalType: (goal) => set((state) => {
        const sign: '+' | '-' = goal === 'BULK' ? '+' : '-';
        const updatedCheckpoints = state.checkpoints.map(cp => ({
            ...cp,
            weight_delta_sign: sign,
            calorie_delta_sign: sign
        }));
        return { 
            goalType: goal, 
            checkpoints: updatedCheckpoints,
            macroSumError: calculateMacroSumError(updatedCheckpoints)
        };
    }),
    
    setTotalDurationWeeks: (weeks) => {
        set({ totalDurationWeeks: weeks });
        const { mapName, checkpoints } = get();
        set({ formValidationError: calculateFormValidationError(mapName, weeks, checkpoints) });
    },
    
    setTimeUnit: (unit) => {
        const { checkpoints, timeUnit, updateCheckpoint } = get();
        checkpoints.forEach((cp, index) => {
            if (cp.trigger_type === 'TIME_BASED') {
                const currentT = parseFloat(cp.time_elapsed_val) || 0;
                let newVal = currentT;
                if (unit === 'days' && timeUnit === 'weeks') {
                    newVal = Math.round(currentT * 7);
                } else if (unit === 'weeks' && timeUnit === 'days') {
                    newVal = Number((currentT / 7).toFixed(1));
                }
                updateCheckpoint(index, { time_elapsed_val: newVal.toString() });
            }
        });
        set({ timeUnit: unit });
    },

    addCheckpoint: () => set((state) => {
        const sign = state.goalType === 'BULK' ? '+' : '-';
        const updated = [...state.checkpoints, defaultCheckpoint(sign)];
        return {
            checkpoints: updated,
            macroSumError: calculateMacroSumError(updated),
            formValidationError: calculateFormValidationError(state.mapName, state.totalDurationWeeks, updated)
        };
    }),

    removeCheckpoint: (index) => set((state) => {
        const updated = state.checkpoints.filter((_, idx) => idx !== index);
        return {
            checkpoints: updated,
            macroSumError: calculateMacroSumError(updated),
            formValidationError: calculateFormValidationError(state.mapName, state.totalDurationWeeks, updated)
        };
    }),

    updateCheckpoint: (index, fields) => set((state) => {
        const updated = [...state.checkpoints];
        updated[index] = { ...updated[index], ...fields };
        return { 
            checkpoints: updated
        };
    }),

    validateMacroRatios: () => set((state) => ({
        macroSumError: calculateMacroSumError(state.checkpoints)
    })),

    validateForm: () => {
        const { mapName, totalDurationWeeks, checkpoints } = get();
        const error = calculateFormValidationError(mapName, totalDurationWeeks, checkpoints);
        set({ formValidationError: error });
        return error === null;
    },

    validateTimeBasedCheckpoint: (timeElapsedVal) => {
        const { totalDurationWeeks, timeUnit } = get();
        const maxDays = totalDurationWeeks * 7;
        const val = parseFloat(timeElapsedVal) || 0;
        const normalizedDays = timeUnit === 'weeks' ? val * 7 : val;

        if (normalizedDays > maxDays) {
            return {
                isValid: false,
                error: `Checkpoint timing (${normalizedDays} days) exceeds maximum map duration (${maxDays} days).`
            };
        }
        if (normalizedDays < 0) {
            return {
                isValid: false,
                error: 'Checkpoint timing cannot be a negative value.'
            };
        }
        return { isValid: true };
    },

    calculateTimeRemaining: (timeElapsedVal) => {
        const { totalDurationWeeks, timeUnit } = get();
        const maxDays = totalDurationWeeks * 7;
        const val = parseFloat(timeElapsedVal) || 0;
        const normalizedDays = timeUnit === 'weeks' ? val * 7 : val;
        
        const remainingDays = Math.max(0, maxDays - normalizedDays);
        
        if (timeUnit === 'weeks') {
            return `${(remainingDays / 7).toFixed(1)} weeks`;
        }
        return `${remainingDays} days`;
    },

    resetForm: () => set({
        mapName: '',
        goalType: 'CUT',
        totalDurationWeeks: 8,
        timeUnit: 'days',
        checkpoints: [defaultCheckpoint('-')],
        macroSumError: null,
        formValidationError: null
    })
}));
