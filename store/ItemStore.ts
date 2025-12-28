import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Item {
  id: string;
  timestamp: string; // ISO string
}

const STORAGE_KEY = 'forge_items';

export const ItemStore = {
  async loadItems(): Promise<Item[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error('Failed to load items', e);
      return [];
    }
  },

  async addItem(item: Item): Promise<void> {
    const items = await this.loadItems();
    items.unshift(item); // Add to top
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  async deleteItem(id: string): Promise<void> {
    const items = await this.loadItems();
    const filtered = items.filter(i => i.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};
