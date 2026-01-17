import { create } from 'zustand';
import { Exercise } from '../shared/models/types';

interface WorkoutLogState {
    cartExercises: Exercise[];
    workoutDuration: number | null; // minutes
    workoutTitle: string;

    addExercise: (exercise: Exercise) => void;
    removeExercise: (id: string) => void;
    updateExercise: (id: string, updates: Partial<Exercise>) => void;
    setDuration: (duration: number | null) => void;
    setTitle: (title: string) => void;
    clear: () => void;
}

export const useWorkoutLogStore = create<WorkoutLogState>((set) => ({
    cartExercises: [],
    workoutDuration: null,
    workoutTitle: '',

    addExercise: (exercise) => set((state) => ({
        cartExercises: [...state.cartExercises, exercise]
    })),

    removeExercise: (id) => set((state) => ({
        cartExercises: state.cartExercises.filter((e) => e.id !== id)
    })),

    updateExercise: (id, updates) => set((state) => ({
        cartExercises: state.cartExercises.map((e) =>
            e.id === id ? { ...e, ...updates } : e
        )
    })),

    setDuration: (duration) => set({ workoutDuration: duration }),
    setTitle: (title) => set({ workoutTitle: title }),

    clear: () => set({
        cartExercises: [],
        workoutDuration: null,
        workoutTitle: ''
    }),
}));
