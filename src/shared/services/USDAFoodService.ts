import { MacroNutrients } from '../models/types';

export interface USDAServingUnit {
    label: string;
    amount: number; // how many of this unit
    unit: string; // the unit name (g, oz, ml, tbsp, cup, piece, etc)
    gramsPerUnit: number; // conversion factor to grams
}

export interface USDAFoodItem {
    fdcId: number;
    name: string;
    brand?: string;
    servingSizeG: number;
    servingSizeText?: string;
    caloriesPer100g: number;
    macrosPer100g: MacroNutrients;
    netCarbsPer100g: number;
    servingUnits: USDAServingUnit[];
}

// Nutrient IDs in the USDA schema
const NUTRIENT_PROTEIN = 1003;
const NUTRIENT_FAT = 1004;
const NUTRIENT_CARBS = 1005;
const NUTRIENT_FIBER = 1079;

function extractNutrient(nutrients: any[], id: number): number {
    const n = nutrients.find((n: any) => n.nutrientId === id);
    return n ? Number(n.value) || 0 : 0;
}

function toSentenceCase(str: string): string {
    if (!str) return '';
    const s = str.trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function toTitleCase(str: string): string {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Map a raw USDA food object to our clean USDAFoodItem shape.
 * Values from the API are per-serving; we normalise to per-100g.
 */
function mapFood(raw: any): USDAFoodItem {
    const nutrients: any[] = raw.foodNutrients ?? [];
    let servingG = Number(raw.servingSize) || 100;
    let unitLabel = (raw.servingSizeUnit || '').trim();
    if (unitLabel.toUpperCase() === 'ONZ') {
        servingG = servingG * 28.35;
        unitLabel = 'oz';
    }
    const scale = 100 / servingG;

    // Macros
    const pPerServing = extractNutrient(nutrients, NUTRIENT_PROTEIN);
    const fPerServing = extractNutrient(nutrients, NUTRIENT_FAT);
    const totalCarbsPerServing = extractNutrient(nutrients, NUTRIENT_CARBS);
    const fiberPerServing = extractNutrient(nutrients, NUTRIENT_FIBER);

    const netCarbsPerServing = Math.max(0, totalCarbsPerServing - fiberPerServing);
    
    // Custom calorie calculation as requested: (total carbs * 4) + (protein * 4) + (fats * 9)
    const calPerServing = (totalCarbsPerServing * 4) + (pPerServing * 4) + (fPerServing * 9);

    // Casing and shorter description logic
    let rawName = raw.description || 'Unknown';
    if (raw.shortDescription && raw.shortDescription.length < rawName.length) {
        rawName = raw.shortDescription;
    }
    const name = toSentenceCase(rawName);
    const brandRaw = raw.brandName || raw.brandOwner || undefined;
    const brand = brandRaw ? toTitleCase(brandRaw) : undefined;

    // Serving Units logic
    const servingUnits: USDAServingUnit[] = [
        { label: '1 g', amount: 1, unit: 'g', gramsPerUnit: 1 },
        { label: '1 oz', amount: 1, unit: 'oz', gramsPerUnit: 28.35 },
        { label: '1 ml', amount: 1, unit: 'ml', gramsPerUnit: 1 }, // simplified dense-ish
    ];

    let household = raw.householdServingFullText || '';
    household = household.replace(/onz/ig, 'oz');
    
    if (!household && raw.servingSize) {
        household = `${raw.servingSize} ${unitLabel || 'g'}`;
    }
    let defaultUnit: USDAServingUnit | null = null;

    // Check for tbsp or cup
    const lowerHouse = household.toLowerCase();
    if (lowerHouse.includes('tbsp') || lowerHouse.includes('tablespoon')) {
        servingUnits.push({ label: '1 Tbsp', amount: 1, unit: 'tbsp', gramsPerUnit: servingG }); // assuming household maps to servingG
    }
    if (lowerHouse.includes('cup')) {
        servingUnits.push({ label: '1 cup', amount: 1, unit: 'cup', gramsPerUnit: servingG });
    }

    // Pieces / Count parsing (e.g. "2 tenders", "1 piece")
    const pieceMatch = household.match(/^(\d+(\.\d+)?)\s+(.+)$/);
    if (pieceMatch) {
        const amount = parseFloat(pieceMatch[1]);
        const unit = pieceMatch[3];
        servingUnits.push({ 
            label: `${amount} ${unit}`, 
            amount, 
            unit, 
            gramsPerUnit: servingG / amount 
        });
    } else if (household && !servingUnits.find(u => u.label === household)) {
        // Fallback for descriptions like "per 1 can"
        servingUnits.push({ label: household, amount: 1, unit: household, gramsPerUnit: servingG });
    }

    return {
        fdcId: raw.fdcId,
        name,
        brand,
        servingSizeG: servingG,
        servingSizeText: household || `${servingG}g`,
        caloriesPer100g: Math.round(calPerServing * scale),
        macrosPer100g: {
            p: Math.round(pPerServing * scale * 10) / 10,
            c: Math.round(totalCarbsPerServing * scale * 10) / 10,
            f: Math.round(fPerServing * scale * 10) / 10,
        },
        netCarbsPer100g: Math.round(netCarbsPerServing * scale * 10) / 10,
        servingUnits
    };
}

export interface USDASearchResult {
    items: USDAFoodItem[];
    totalHits: number;
}

export class USDAFoodService {
    private static readonly BASE = 'https://api.nal.usda.gov/fdc/v1';
    private static readonly KEY = 'ZvnkYoppXH2RTrdri4TQrMTGKaIQbe1KJNp5QKBN';
    // Prioritise Branded as requested
    private static readonly DATA_TYPES = 'Branded,Foundation,SR%20Legacy';

    /**
     * Search foods with a cap on results.
     * @param query  - text to search
     * @param pageSize - how many results to return (default 20)
     */
    static async search(query: string, pageSize = 20): Promise<USDAFoodItem[]> {
        if (!query.trim()) return [];

        try {
            const url =
                `${this.BASE}/foods/search` +
                `?query=${encodeURIComponent(query)}` +
                `&api_key=${this.KEY}` +
                `&dataType=${this.DATA_TYPES}` +
                `&pageSize=${pageSize}`;

            const res = await fetch(url);
            if (!res.ok) {
                console.warn('[USDAFoodService] search failed', res.status);
                return [];
            }

            const json = await res.json();
            const foods: any[] = json.foods ?? [];
            
            // If the user wants branded first, we can sort them
            const sortedFoods = [...foods].sort((a, b) => {
                if (a.dataType === 'Branded' && b.dataType !== 'Branded') return -1;
                if (a.dataType !== 'Branded' && b.dataType === 'Branded') return 1;
                return 0;
            });

            return sortedFoods.map(mapFood);
        } catch (err) {
            console.error('[USDAFoodService] search error', err);
            return [];
        }
    }

    /**
     * Lightweight inline suggestions — only 3 results, faster.
     */
    /**
     * Lightweight inline suggestions — only 3 results, faster.
     */
    static async suggest(query: string): Promise<USDAFoodItem[]> {
        return this.search(query, 3);
    }

    /**
     * Search specifically by GTIN (UPC/Barcode).
     */
    static async findByBarcode(barcode: string): Promise<USDAFoodItem | null> {
        try {
            const url =
                `${this.BASE}/foods/search` +
                `?query=${barcode}` +
                `&api_key=${this.KEY}` +
                `&dataType=${this.DATA_TYPES}` +
                `&pageSize=1`;

            const res = await fetch(url);
            if (!res.ok) return null;

            const json = await res.json();
            const foods = json.foods ?? [];
            if (foods.length > 0) {
                return mapFood(foods[0]);
            }
            return null;
        } catch (err) {
            console.error('[USDAFoodService] barcode search error', err);
            return null;
        }
    }
}
