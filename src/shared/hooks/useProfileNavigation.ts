import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/AuthStore';
import { useUserStore } from '@/store/UserStore';
import { User } from '@/src/shared/models/types';

/**
 * Standardized hook for profile navigation across the app.
 * Handles the logic of navigating to the current user's editable profile
 * vs. another user's public profile.
 */
export function useProfileNavigation() {
    const router = useRouter();
    const session = useAuthStore(state => state.session);
    const userStore = useUserStore();

    const currentUserHandle = userStore.handle?.replace('@', '').toLowerCase() ?? '';
    const currentUserId = session?.user?.id ?? '';

    const navigateToProfile = (user: Pick<User, 'id' | 'handle'>) => {
        const isOwnProfile =
            (currentUserId && user.id === currentUserId) ||
            (user.handle?.replace('@', '').toLowerCase() === currentUserHandle);

        if (isOwnProfile) {
            // Navigate to the own profile tab (which allows editing)
            router.push('/(tabs)/profile' as any);
        } else {
            // Navigate to the public profile of another user
            router.push({ 
                pathname: '/user/[handle]', 
                params: { handle: user.handle } 
            } as any);
        }
    };

    const isSelf = (user: Pick<User, 'id' | 'handle'>): boolean => {
        if (currentUserId && user.id === currentUserId) return true;
        if (user.handle?.replace('@', '').toLowerCase() === currentUserHandle) return true;
        return false;
    };

    return { navigateToProfile, isSelf };
}
