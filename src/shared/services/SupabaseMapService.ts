import { supabase } from './supabase';
import { DiscoveryMap } from '@/src/features/macromaps/store/useMarketplaceStore';

export class SupabaseMapService {
  /**
   * Toggles the saved status of a macro map for a user.
   * Inserts a record if not saved, deletes it if currently saved.
   */
  static async toggleSaveMap(userId: string, mapId: string, currentlySaved: boolean): Promise<boolean> {
    try {
      if (currentlySaved) {
        const { error } = await supabase
          .from('saved_macro_maps')
          .delete()
          .eq('user_id', userId)
          .eq('map_id', mapId);

        if (error) throw error;
        return false; // No longer saved
      } else {
        const { error } = await supabase
          .from('saved_macro_maps')
          .insert({
            user_id: userId,
            map_id: mapId
          });

        if (error) throw error;
        return true; // Successfully saved
      }
    } catch (error) {
      console.error('[SupabaseMapService] Error toggling save map:', error);
      throw error;
    }
  }

  /**
   * Fetches all saved maps for a specific user.
   * Joins public_discovery_maps to retrieve full map details.
   */
  static async getSavedMaps(userId: string): Promise<DiscoveryMap[]> {
    try {
      const { data, error } = await supabase
        .from('saved_macro_maps')
        .select(`
          created_at,
          map:public_discovery_maps (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.map)
        .filter((map): map is DiscoveryMap => map !== null);
    } catch (error) {
      console.error('[SupabaseMapService] Error fetching saved maps:', error);
      return [];
    }
  }
}
