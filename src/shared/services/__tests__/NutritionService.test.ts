import { NutritionService } from '../NutritionService';

describe('NutritionService', () => {
    describe('convertToOz', () => {
        it('should return the same value for "oz"', () => {
            expect(NutritionService.convertToOz(10, 'oz')).toBe(10);
        });

        it('should convert "g" to "oz"', () => {
            // 1g = 0.035274 oz
            const result = NutritionService.convertToOz(100, 'g');
            expect(result).toBeCloseTo(3.5274, 4);
        });

        it('should convert "kg" to "oz"', () => {
            // 1kg = 35.274 oz
            const result = NutritionService.convertToOz(1, 'kg');
            expect(result).toBeCloseTo(35.274, 3);
        });

        it('should convert "lb" to "oz"', () => {
            // 1lb = 16 oz
            expect(NutritionService.convertToOz(1, 'lb')).toBe(16);
        });

        it('should convert "ml" to "oz" (assuming water density)', () => {
            // 1ml = 0.033814 oz
            const result = NutritionService.convertToOz(100, 'ml');
            expect(result).toBeCloseTo(3.3814, 4);
        });

        it('should return 0 for unknown units', () => {
            expect(NutritionService.convertToOz(10, 'unknown')).toBe(0);
        });
    });

    describe('calculateMacros', () => {
        it('should calculate macros correctly for 1 oz', () => {
            const result = NutritionService.calculateMacros(1);
            expect(result.cals).toBe(300);
            expect(result.macros).toEqual({ p: 25, c: 25, f: 10 });
        });

        it('should calculate macros correctly for 2 oz', () => {
            const result = NutritionService.calculateMacros(2);
            expect(result.cals).toBe(600);
            expect(result.macros).toEqual({ p: 50, c: 50, f: 20 });
        });

        it('should round values', () => {
            const result = NutritionService.calculateMacros(1.5);
            // 300 * 1.5 = 450
            // 25 * 1.5 = 37.5 -> 38
            // 10 * 1.5 = 15
            expect(result.cals).toBe(450);
            expect(result.macros.p).toBe(38);
            expect(result.macros.c).toBe(38);
            expect(result.macros.f).toBe(15);
        });
    });

    describe('sumMacros', () => {
        it('should return 0s for empty list', () => {
            const result = NutritionService.sumMacros([]);
            expect(result).toEqual({ cals: 0, macros: { p: 0, c: 0, f: 0 } });
        });

        it('should sum multiple items correctly', () => {
            const items = [
                { id: '1', name: 'A', amount: '1', cals: 100, macros: { p: 10, c: 5, f: 2 } },
                { id: '2', name: 'B', amount: '1', cals: 200, macros: { p: 20, c: 10, f: 5 } },
            ];
            const result = NutritionService.sumMacros(items);
            expect(result.cals).toBe(300);
            expect(result.macros).toEqual({ p: 30, c: 15, f: 7 });
        });
    });
});
