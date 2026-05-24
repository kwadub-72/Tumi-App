export interface MacroPayload {
    p: number;
    c: number;
    f: number;
}

export interface ScaledMacros extends MacroPayload {
    calories: number;
}

export class MacroScalingService {
    /**
     * Scales a creator's macro payload to match the subscriber's target baseline calories.
     * Computes the percentage distribution of the creator's macros and applies it to the subscriber's calories.
     * 
     * @param targetBaselineCalories The subscriber's total calorie goal.
     * @param creatorRawPayload The creator's raw macronutrients (p, c, f).
     * @returns The scaled macros and recalculated calories.
     */
    static scaleMacros(
        targetBaselineCalories: number,
        creatorRawPayload: MacroPayload
    ): ScaledMacros {
        const { p, c, f } = creatorRawPayload;
        
        // Compute the baseline calories of the creator's payload
        const bCals = (p * 4) + (c * 4) + (f * 9);

        // Edge case: if creator payload is empty or invalid
        if (bCals <= 0) {
            return { p: 0, c: 0, f: 0, calories: 0 };
        }

        // Determine percentage composition of the creator's macros
        const pPct = (p * 4) / bCals;
        const cPct = (c * 4) / bCals;
        const fPct = (f * 9) / bCals;

        // Apply percentages to the subscriber's target calories
        const scaledP = Math.round((pPct * targetBaselineCalories) / 4);
        const scaledC = Math.round((cPct * targetBaselineCalories) / 4);
        const scaledF = Math.round((fPct * targetBaselineCalories) / 9);

        return {
            p: scaledP,
            c: scaledC,
            f: scaledF,
            calories: (scaledP * 4) + (scaledC * 4) + (scaledF * 9),
        };
    }

    /**
     * Scales checkpoint macros based on checkpoint ratios and subscriber's target baseline calories
     * adjusted by the checkpoint's calories delta.
     * 
     * @param targetBaselineCalories The subscriber's baseline calorie target.
     * @param checkpoint The checkpoint object containing ratios and calorie delta.
     * @returns The scaled macros and recalculated calories.
     */
    static scaleCheckpointMacros(
        targetBaselineCalories: number,
        checkpoint: {
            protein_ratio: number;
            carbs_ratio: number;
            fats_ratio: number;
            calorie_delta_pct: number;
        }
    ): ScaledMacros {
        const targetCals = Math.round(targetBaselineCalories * (1 + Number(checkpoint.calorie_delta_pct)));
        const { protein_ratio, carbs_ratio, fats_ratio } = checkpoint;

        const scaledP = Math.round((protein_ratio * targetCals) / 4);
        const scaledC = Math.round((carbs_ratio * targetCals) / 4);
        const scaledF = Math.round((fats_ratio * targetCals) / 9);

        return {
            p: scaledP,
            c: scaledC,
            f: scaledF,
            calories: (scaledP * 4) + (scaledC * 4) + (scaledF * 9),
        };
    }
}

