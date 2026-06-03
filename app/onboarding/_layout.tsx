import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/AuthStore';

export default function OnboardingLayout() {
    const router = useRouter();
    const { session, profile, loading } = useAuthStore();

    useEffect(() => {
        if (loading) return;

        // Bouncer logic: If a user is fully authenticated and has a complete profile,
        // they should not be in the onboarding flow. Instantly bounce them out.
        if (session && profile && profile.handle) {
            router.replace('/(tabs)');
        }
    }, [session, profile, loading]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="landing" />
            <Stack.Screen name="about" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="activity" />
            <Stack.Screen name="path" />
            <Stack.Screen name="macros" />
            <Stack.Screen name="maintenance" />
            <Stack.Screen name="manual-macros" />
            <Stack.Screen name="confirm-macros" />
            <Stack.Screen name="tribe" />
            <Stack.Screen 
                name="welcome" 
                options={{ 
                    // Disable native swipe-back on the final submission screen
                    // to prevent users from returning to a broken transient state.
                    gestureEnabled: false 
                }} 
            />
        </Stack>
    );
}
