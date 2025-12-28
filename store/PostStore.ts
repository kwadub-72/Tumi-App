import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedPost } from '../src/shared/models/types';
export { FeedPost };

const STORAGE_KEY = 'forge_posts';

// Simple callback system for state updates
type Listener = (posts: FeedPost[]) => void;
let listeners: Listener[] = [];

export const PostStore = {
    async loadPosts(): Promise<FeedPost[]> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load posts', e);
            return [];
        }
    },

    async savePosts(posts: FeedPost[]): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        listeners.forEach(l => l(posts));
    },

    async addPost(post: FeedPost): Promise<void> {
        const posts = await this.loadPosts();
        const updated = [post, ...posts];
        await this.savePosts(updated);
    },

    async clearPosts(): Promise<void> {
        await this.savePosts([]);
    },
    subscribe(listener: Listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
};
