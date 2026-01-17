import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedPost, User } from '../src/shared/models/types';
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

    async deletePost(postId: string): Promise<void> {
        const posts = await this.loadPosts();
        const updated = posts.filter(p => p.id !== postId);
        await this.savePosts(updated);
    },

    async clearPosts(): Promise<void> {
        await this.savePosts([]);
    },

    async updateUser(handle: string, updates: Partial<User>): Promise<void> {
        const posts = await this.loadPosts();
        const updated = posts.map(p => {
            if (p.user.handle === handle) {
                return { ...p, user: { ...p.user, ...updates } };
            }
            return p;
        });
        await this.savePosts(updated);
    },

    async toggleLike(postId: string, postData?: FeedPost): Promise<void> {
        const posts = await this.loadPosts();
        let found = false;
        const updated = posts.map(p => {
            if (p.id === postId) {
                found = true;
                const isLiked = !p.isLiked;
                return {
                    ...p,
                    isLiked,
                    stats: {
                        ...p.stats,
                        likes: isLiked ? p.stats.likes + 1 : Math.max(0, p.stats.likes - 1)
                    }
                };
            }
            return p;
        });

        if (!found && postData) {
            // If post is not in store but user liked it (e.g. fake post)
            updated.push({
                ...postData,
                isLiked: true,
                stats: {
                    ...postData.stats,
                    likes: postData.stats.likes + 1
                }
            });
        }

        await this.savePosts(updated);
    },

    async clearPostLikes(handle: string): Promise<void> {
        const posts = await this.loadPosts();
        const updated = posts.map(p => {
            if (p.user.handle === handle) {
                return { ...p, isLiked: false };
            }
            return p;
        });
        await this.savePosts(updated);
    },

    subscribe(listener: Listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
};
