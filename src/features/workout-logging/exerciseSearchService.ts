/**
 * exerciseSearchService.ts
 * Thin wrapper around the API Ninjas Exercise API.
 *
 * Docs: https://api-ninjas.com/api/exercises
 * Endpoint: GET https://api.api-ninjas.com/v1/exercises
 * Results per page: 10 (fixed by the API)
 *
 * Public API shape:
 *   { name, type, muscle, difficulty, instructions, equipments, safety_info }
 *
 * Our Exercise type uses: cardio | strength (we map all non-cardio → 'Strength')
 */

const API_KEY = 'zHXg4pfnUIXDN6ZMbZxcbo7EGBmycOMVX0uWGbzx';
const BASE_URL = 'https://api.api-ninjas.com/v1/exercises';

// ─── API Ninjas exercise types ─────────────────────────────────────────────
export type ApiExerciseType =
    | 'cardio'
    | 'olympic_weightlifting'
    | 'plyometrics'
    | 'powerlifting'
    | 'strength'
    | 'stretching'
    | 'strongman';

// ─── Raw API response shape ────────────────────────────────────────────────
export interface ApiExercise {
    name: string;
    type: ApiExerciseType;
    muscle: string;
    difficulty: 'beginner' | 'intermediate' | 'expert';
    instructions: string;
    equipments?: string[];
    safety_info?: string;
}

// ─── Mapped exercise card item (used by the UI) ────────────────────────────
export interface ExerciseSearchResult {
    /** Unique stable ID derived from name + muscle */
    id: string;
    name: string;
    /** Normalized to 'Cardio' | 'Resistance' */
    category: 'Cardio' | 'Resistance';
    /** Original API type for display/logging */
    rawType: ApiExerciseType;
    muscle: string;
    difficulty: ApiExercise['difficulty'];
    instructions: string;
}

/** Maps any API type → our two display categories */
function toCategory(type: ApiExerciseType): 'Cardio' | 'Resistance' {
    return type === 'cardio' ? 'Cardio' : 'Resistance';
}

function stableId(exercise: ApiExercise, index: number): string {
    return `${exercise.name}-${exercise.muscle}-${exercise.type}-${index}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
}

function mapExercise(raw: ApiExercise, index: number): ExerciseSearchResult {
    return {
        id: stableId(raw, index),
        name: raw.name,
        category: toCategory(raw.type),
        rawType: raw.type,
        muscle: raw.muscle,
        difficulty: raw.difficulty,
        instructions: raw.instructions,
    };
}

// ─── Public service interface ──────────────────────────────────────────────

export interface ExerciseSearchOptions {
    /** Search by exercise name (partial match supported) */
    name?: string;
    /** Filter to one API type (optional) */
    type?: ApiExerciseType;
    /** Filter by muscle (optional) */
    muscle?: string;
}

export interface ExerciseSearchService {
    search(opts: ExerciseSearchOptions): Promise<ExerciseSearchResult[]>;
}

/** Production implementation using the API Ninjas endpoint */
class ApiNinjasExerciseSearchService implements ExerciseSearchService {
    async search(opts: ExerciseSearchOptions): Promise<ExerciseSearchResult[]> {
        const params = new URLSearchParams();
        if (opts.name) params.set('name', opts.name);
        if (opts.type) params.set('type', opts.type);
        if (opts.muscle) params.set('muscle', opts.muscle);

        const url = `${BASE_URL}?${params.toString()}`;

        const response = await fetch(url, {
            headers: { 'X-Api-Key': API_KEY },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Exercise API error: ${response.status}`);
        }

        const raw: ApiExercise[] = await response.json();
        return raw.map((item, index) => mapExercise(item, index));
    }
}

export const exerciseSearchService: ExerciseSearchService =
    new ApiNinjasExerciseSearchService();
