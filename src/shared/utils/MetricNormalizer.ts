export class MetricNormalizer {
    static readonly MIN_WEIGHT_KG = 30;
    static readonly MAX_WEIGHT_KG = 300;
    static readonly MIN_WEIGHT_LBS = 66;
    static readonly MAX_WEIGHT_LBS = 660;

    static readonly MIN_HEIGHT_CM = 100;
    static readonly MAX_HEIGHT_CM = 250;

    /**
     * Safely swaps ',' to '.' for European keyboards and strips invalid characters
     * before parsing as a float.
     * 
     * @param input Raw string from UI
     * @returns Cleaned float value, or 0 if invalid
     */
    static parseLocalizedDecimal(input: string): number {
        if (!input) return 0;
        
        // Swap commas to dots for European locales
        const normalized = input.replace(/,/g, '.');
        
        // Strip everything except digits and dots
        const stripped = normalized.replace(/[^\d.]/g, '');
        
        // Keep only the first dot if multiple exist
        const parts = stripped.split('.');
        const cleanString = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
        
        const val = parseFloat(cleanString);
        return isNaN(val) ? 0 : val;
    }

    /**
     * Parses a string representing imperial height (e.g. "5'10", "5.10", "5-10").
     */
    static parseImperialHeight(heightStr: string): { feet: number; inches: number } {
        const cleaned = heightStr.replace(/,/g, '.').trim();
        let feet = 0;
        let inches = 0;
        
        if (cleaned.includes("'")) {
            const parts = cleaned.split("'");
            feet = parseFloat(parts[0]) || 0;
            inches = parseFloat(parts[1]?.replace('"', '')) || 0;
        } else if (cleaned.includes(".")) {
            const parts = cleaned.split(".");
            feet = parseFloat(parts[0]) || 0;
            inches = parseFloat(parts[1]) || 0;
        } else if (cleaned.includes("-")) {
            const parts = cleaned.split("-");
            feet = parseFloat(parts[0]) || 0;
            inches = parseFloat(parts[1]) || 0;
        } else {
            feet = parseFloat(cleaned) || 0;
        }
        
        return { feet, inches };
    }

    static lbsToKg(lbs: number): number {
        return lbs * 0.453592;
    }

    static kgToLbs(kg: number): number {
        return kg / 0.453592;
    }

    static cmToImperial(cm: number): { feet: number; inches: number } {
        const totalInches = cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        
        if (inches === 12) {
            return { feet: feet + 1, inches: 0 };
        }
        
        return { feet, inches };
    }

    static imperialToCm(feet: number, inches: number): number {
        return (feet * 12 + inches) * 2.54;
    }

    /**
     * Sanitizes raw UI input, enforces strict bounds checking, and formats values 
     * to strictly align with the database profiles schema expectations.
     * 
     * SCHEMA TRUTH: 
     * - height_cm: strictly Integer (Math.round)
     * - weight_lbs: strictly Float (toFixed(2))
     * 
     * @param weight Raw weight string
     * @param weightUnit Selected weight unit
     * @param height Raw height string
     * @param heightUnit Selected height unit
     * @returns Payload perfectly formatted for public.profiles insertion
     */
    static getDatabasePayload(
        weight: string, 
        weightUnit: 'lbs' | 'kg', 
        height: string, 
        heightUnit: 'cm' | 'ft'
    ): { weight_lbs: number; height_cm: number } {
        // 1. Process Weight
        const parsedWeight = this.parseLocalizedDecimal(weight);
        let finalWeightLbs = weightUnit === 'lbs' ? parsedWeight : this.kgToLbs(parsedWeight);

        // Clamp Weight Bounds
        if (finalWeightLbs < this.MIN_WEIGHT_LBS) finalWeightLbs = this.MIN_WEIGHT_LBS;
        if (finalWeightLbs > this.MAX_WEIGHT_LBS) finalWeightLbs = this.MAX_WEIGHT_LBS;

        // 2. Process Height
        let finalHeightCm = 0;
        if (heightUnit === 'cm') {
            finalHeightCm = this.parseLocalizedDecimal(height);
        } else {
            const { feet, inches } = this.parseImperialHeight(height);
            finalHeightCm = this.imperialToCm(feet, inches);
        }

        // Clamp Height Bounds
        if (finalHeightCm < this.MIN_HEIGHT_CM) finalHeightCm = this.MIN_HEIGHT_CM;
        if (finalHeightCm > this.MAX_HEIGHT_CM) finalHeightCm = this.MAX_HEIGHT_CM;

        // 3. Return Strictly Typed Schema Object
        return {
            weight_lbs: Number(finalWeightLbs.toFixed(2)),
            height_cm: Math.round(finalHeightCm)
        };
    }
}
