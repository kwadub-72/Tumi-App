import { MacroNutrients } from '../models/types';

const CONVERSION_TO_OZ: Record<string, number> = {
    oz: 1,
    g: 0.035274,
    kg: 35.274,
    lb: 16,
    ml: 0.033814,
};

const BASE_OZ_MACROS = {
    cals: 300,
    p: 25,
    c: 25,
    f: 10
};

export class NutritionService {
    static convertToOz(amount: number, unit: string): number {
        const factor = CONVERSION_TO_OZ[unit];
        if (factor === undefined) return 0;
        return amount * factor;
    }

    static calculateMacros(amountInOz: number): { cals: number; macros: MacroNutrients } {
        const p = Math.round(BASE_OZ_MACROS.p * amountInOz);
        const c = Math.round(BASE_OZ_MACROS.c * amountInOz);
        const f = Math.round(BASE_OZ_MACROS.f * amountInOz);
        return {
            cals: Math.round(p * 4 + c * 4 + f * 9),
            macros: { p, c, f }
        };
    }

    static sumMacros(items: { cals?: number; calories?: number; macros: MacroNutrients }[]): { cals: number; macros: MacroNutrients } {
        const sums = items.reduce((acc, curr) => ({
            p: acc.p + curr.macros.p,
            c: acc.c + curr.macros.c,
            f: acc.f + curr.macros.f,
        }), { p: 0, c: 0, f: 0 });
        
        return {
            cals: Math.round((sums.p * 4) + (sums.c * 4) + (sums.f * 9)),
            macros: sums
        };
    }
}
