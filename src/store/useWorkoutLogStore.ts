import { create } from 'zustand';
import { Exercise } from '../shared/models/types';

interface WorkoutLogState {
    cartExercises: Exercise[];
    workoutDuration: number | null; // minutes
    workoutTitle: string;
    capturedMedia: { uri: string; type: 'image' | 'video' } | null;
    historicalCounts: Record<string, number>;

    addExercise: (exercise: Exercise) => void;
    removeExercise: (id: string) => void;
    updateExercise: (id: string, updates: Partial<Exercise>) => void;
    reorderExercises: (exercises: Exercise[]) => void;
    incrementHistoricalCount: (name: string) => void;
    setDuration: (duration: number | null) => void;
    setTitle: (title: string) => void;
    setCapturedMedia: (media: { uri: string; type: 'image' | 'video' } | null) => void;
    clear: () => void;
}

export const useWorkoutLogStore = create<WorkoutLogState>((set) => ({
    cartExercises: [],
    workoutDuration: null,
    workoutTitle: '',
    capturedMedia: null,
    historicalCounts: {},

    incrementHistoricalCount: (name) => set((state) => ({
        historicalCounts: {
            ...state.historicalCounts,
            [name]: (state.historicalCounts[name] || 0) + 1
        }
    })),

    addExercise: (exercise) => set((state) => {
        if (!exercise.superset) {
            return { cartExercises: [...state.cartExercises, exercise] };
        }
        
        // Find the last index of the same superset to keep them grouped
        const lastIndex = state.cartExercises.findLastIndex(
            (e) => e.superset?.toUpperCase() === exercise.superset?.toUpperCase()
        );
        
        if (lastIndex === -1) {
            return { cartExercises: [...state.cartExercises, exercise] };
        }
        
        const newCart = [...state.cartExercises];
        newCart.splice(lastIndex + 1, 0, exercise);
        return { cartExercises: newCart };
    }),

    removeExercise: (id) => set((state) => ({
        cartExercises: state.cartExercises.filter((e) => e.id !== id)
    })),

    updateExercise: (id, updates) => set((state) => ({
        cartExercises: state.cartExercises.map((e) =>
            e.id === id ? { ...e, ...updates } : e
        )
    })),
    
    reorderExercises: (exercises) => set({ cartExercises: exercises }),

    setDuration: (duration) => set({ workoutDuration: duration }),
    setTitle: (title) => set({ workoutTitle: title }),
    setCapturedMedia: (media) => set({ capturedMedia: media }),

    clear: () => set({
        cartExercises: [],
        workoutDuration: null,
        workoutTitle: '',
        capturedMedia: null,
    }),
}));
