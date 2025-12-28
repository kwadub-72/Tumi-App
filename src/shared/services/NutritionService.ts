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
        return {
            cals: Math.round(BASE_OZ_MACROS.cals * amountInOz),
            macros: {
                p: Math.round(BASE_OZ_MACROS.p * amountInOz),
                c: Math.round(BASE_OZ_MACROS.c * amountInOz),
                f: Math.round(BASE_OZ_MACROS.f * amountInOz)
            }
        };
    }

    static sumMacros(items: { cals?: number; calories?: number; macros: MacroNutrients }[]): { cals: number; macros: MacroNutrients } {
        return items.reduce((acc, curr) => ({
            cals: acc.cals + (curr.cals ?? curr.calories ?? 0),
            macros: {
                p: acc.macros.p + curr.macros.p,
                c: acc.macros.c + curr.macros.c,
                f: acc.macros.f + curr.macros.f,
            }
        }), { cals: 0, macros: { p: 0, c: 0, f: 0 } } as { cals: number; macros: MacroNutrients });
    }
}
