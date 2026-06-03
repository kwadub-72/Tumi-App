import { Router } from 'expo-router';

/**
 * Safely signs the user out and clears the navigation stack to prevent
 * "The action 'GO_BACK' was not handled by any navigator" errors when
 * the AuthGate unmounts the protected stack during a pop transition.
 * 
 * Usage:
 * const router = useRouter();
 * const { signOut } = useAuthStore();
 * safeSignOut(router, signOut);
 */
export const safeSignOut = (router: Router, clearAuthStore: () => void) => {
    // 1. Dismiss all open modals and clear the routing history to prevent pop transition crashes
    if (router.canDismiss()) {
        router.dismissAll();
    }
    
    // 2. Force replace to the login screen so the protected stack is completely destroyed
    router.replace('/login');
    
    // 3. Defer clearing the auth store slightly to allow the transition to register
    // This prevents AuthGate from instantly destroying the stack while navigating
    setTimeout(() => {
        clearAuthStore();
    }, 50);
};
