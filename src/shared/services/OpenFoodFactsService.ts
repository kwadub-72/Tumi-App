import { MacroNutrients } from '../models/types';

export interface ProductData {
    name: string;
    brand: string;
    calories: number; // per 100g
    macros: MacroNutrients; // per 100g
    servingSize?: string;
}

const API_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';

export class OpenFoodFactsService {
    static async fetchProduct(barcode: string): Promise<ProductData | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/${barcode}.json`);
            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            if (data.status !== 1 || !data.product) {
                return null;
            }

            const product = data.product;
            const nutriments = product.nutriments || {};

            // Extract per 100g values. 
            // OFF usually provides 'energy-kcal_100g', 'proteins_100g', etc.
            const calories = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0;
            const protein = nutriments['proteins_100g'] || nutriments['proteins'] || 0;
            const carbs = nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0;
            const fat = nutriments['fat_100g'] || nutriments['fat'] || 0;

            return {
                name: product.product_name || 'Unknown Product',
                brand: product.brands || 'Unknown Brand',
                calories: Number(calories),
                macros: {
                    p: Number(protein),
                    c: Number(carbs),
                    f: Number(fat)
                },
                servingSize: product.serving_size
            };
        } catch (error) {
            console.error('Error fetching product from OpenFoodFacts:', error);
            return null;
        }
    }
}
