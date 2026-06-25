import { MacroNutrients } from '../models/types';
import { Alert } from 'react-native';
import { supabase } from './supabase';

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
    // Hardcoded override for Highland Pop, Slim Kim Popcorn (FDC ID: 2664487)
    // to correct the manufacturer's incorrect USDA entry.
    if (raw.fdcId === 2664487) {
        return {
            fdcId: 2664487,
            name: "Highland pop, slim kim popcorn",
            brand: "Highland Pop",
            servingSizeG: 34,
            servingSizeText: "34g",
            caloriesPer100g: 441, // 150 kcal per 34g -> (150/34)*100
            macrosPer100g: {
                p: 8.8,   // 3g per 34g -> (3/34)*100
                c: 61.8,  // 21g per 34g -> (21/34)*100 (Total Carbs)
                f: 17.6,  // 6g per 34g -> (6/34)*100
            },
            netCarbsPer100g: 50.0, // (21 - 4) / 34 * 100 = 50.0
            servingUnits: [
                { label: '1 g', amount: 1, unit: 'g', gramsPerUnit: 1 },
                { label: '1 oz', amount: 1, unit: 'oz', gramsPerUnit: 28.35 },
                { label: '1 ml', amount: 1, unit: 'ml', gramsPerUnit: 1 },
                { label: '1 serving (34g)', amount: 1, unit: 'serving', gramsPerUnit: 34 }
            ]
        };
    }

    const nutrients: any[] = raw.foodNutrients ?? [];
    let servingG = Number(raw.servingSize) || 100;
    let unitLabel = (raw.servingSizeUnit || '').trim();
    if (unitLabel.toUpperCase() === 'ONZ') {
        servingG = servingG * 28.35;
        unitLabel = 'oz';
    }
    // USDA reports nutrients per 100g. They do not need to be scaled in mapping.
    const pPer100g = extractNutrient(nutrients, NUTRIENT_PROTEIN);
    const fPer100g = extractNutrient(nutrients, NUTRIENT_FAT);
    const totalCarbsPer100g = extractNutrient(nutrients, NUTRIENT_CARBS);
    const fiberPer100g = extractNutrient(nutrients, NUTRIENT_FIBER);

    const netCarbsPer100g = Math.max(0, totalCarbsPer100g - fiberPer100g);
    
    // Custom calorie calculation using total carbs: (total carbs * 4) + (protein * 4) + (fats * 9)
    const caloriesPer100g = (totalCarbsPer100g * 4) + (pPer100g * 4) + (fPer100g * 9);

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
        caloriesPer100g: Math.round(caloriesPer100g),
        macrosPer100g: {
            p: Math.round(pPer100g * 10) / 10,
            c: Math.round(totalCarbsPer100g * 10) / 10,
            f: Math.round(fPer100g * 10) / 10,
        },
        netCarbsPer100g: Math.round(netCarbsPer100g * 10) / 10,
        servingUnits
    };
}

export interface USDASearchResult {
    items: USDAFoodItem[];
    totalHits: number;
}

export class USDAFoodService {

    /**
     * Search foods with a cap on results.
     * @param query  - text to search
     * @param pageSize - how many results to return (default 20)
     */
    static async search(query: string, pageSize = 20): Promise<USDAFoodItem[]> {
        if (!query.trim()) return [];

        try {
            console.log('Outgoing USDA Edge Function Request:', { query, pageSize });

            const { data, error } = await supabase.functions.invoke('usda-food-search', {
                body: { 
                    query, 
                    pageSize,
                    dataType: ['Branded', 'Foundation', 'SR Legacy']
                }
            });

            if (error) {
                throw new Error(error.message || 'Edge Function execution failed');
            }

            const foods: any[] = data?.foods ?? [];
            
            // If the user wants branded first, we can sort them
            const sortedFoods = [...foods].sort((a, b) => {
                if (a.dataType === 'Branded' && b.dataType !== 'Branded') return -1;
                if (a.dataType !== 'Branded' && b.dataType === 'Branded') return 1;
                return 0;
            });

            return sortedFoods.map(mapFood);
        } catch (err: any) {
            console.error('[USDAFoodService] search error', err);
            Alert.alert('USDA Search Error', err?.message || 'Failed to fetch USDA food details');
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
            const raw = barcode.trim();
            if (!raw) return null;

            // Generate variants to handle USDA database inconsistencies:
            // 1. Raw scanned barcode (e.g. 12-digit UPC or 13-digit EAN)
            // 2. 14-digit padded GTIN (standard for many USDA records)
            // 3. Leading-zero-stripped version (in case stored without zeros)
            const padded = raw.padStart(14, '0');
            const stripped = raw.replace(/^0+/, '');
            
            // Create a space-separated search query containing all variants
            const searchQuery = Array.from(new Set([raw, padded, stripped])).join(' ');

            console.log('Outgoing USDA Edge Function Barcode Request:', { barcode, searchQuery });

            const { data, error } = await supabase.functions.invoke('usda-food-search', {
                body: { 
                    query: searchQuery, 
                    pageSize: 1,
                    dataType: ['Branded', 'Foundation', 'SR Legacy']
                }
            });

            if (error) {
                throw new Error(error.message || 'Edge Function barcode execution failed');
            }

            const foods = data?.foods ?? [];
            if (foods.length > 0) {
                return mapFood(foods[0]);
            }
            return null;
        } catch (err: any) {
            console.error('[USDAFoodService] barcode search error', err);
            Alert.alert('USDA Search Error', err?.message || 'Failed to fetch USDA food barcode details');
            return null;
        }
    }
}
