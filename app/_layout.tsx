import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore, DbProfile } from '../store/AuthStore';
import { useNetworkStore } from '@/src/store/NetworkStore';
import { supabase } from '@/src/shared/services/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate({ children }: { children: React.ReactNode }) {
    const { session, loading, initialize } = useAuthStore();
    const { init: initNetwork, clear: clearNetwork } = useNetworkStore();
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase.channel('realtime:profile-sync')
            .on('postgres_changes', { 
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${session.user.id}`
            }, (payload) => { 
                useAuthStore.setState({ profile: payload.new as DbProfile });
            })
            .subscribe();

        // MANDATORY CLEANUP TO PREVENT SOCKET RACE CONDITIONS
        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    useEffect(() => {
        if (loading) return;

        // EXPO ROUTER FIX: Wait for the navigation tree to fully mount
        if (!rootNavigationState?.key) return;

        const inTabs = segments[0] === '(tabs)';
        const inAuth = segments[0] === 'login' || segments[0] === 'signup';
        const inOnboarding = segments[0] === 'onboarding';
        // Never redirect away from the deep-link callback screens
        const inCallback = segments[0] === 'email-confirmed';

        // Never redirect away from the callback OR the active onboarding flow
        if (inCallback || inOnboarding) return;

        if (!session && inTabs) {
            clearNetwork();
            router.replace('/login');
        } else if (session && (inAuth || !segments[0])) {
            initNetwork(session.user.id);
            router.replace('/(tabs)');
        } else if (session) {
            // Already in tabs but maybe just reloaded
            initNetwork(session.user.id);
        }

        SplashScreen.hideAsync().catch(() => {});
    }, [session, loading, rootNavigationState?.key]);

    return <>{children}</>;
}

import { useFonts } from 'expo-font';

export default function RootLayout() {
    const colorScheme = useColorScheme();

    // Pre-load custom font assets. Uncomment the BackoutPrint mapping once the .ttf/.otf file is placed in assets/fonts/
    /*
    const [fontsLoaded] = useFonts({
        BackoutPrint: require('../assets/fonts/BackoutPrint.ttf'),
    });
    */

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider value={DefaultTheme}>
                <AuthGate>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="login" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="email-confirmed" />
                        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
                        <Stack.Screen name="scan-result" options={{ presentation: 'transparentModal', animation: 'fade' }} />
                        <Stack.Screen name="camera-capture" options={{ presentation: 'fullScreenModal' }} />
                        <Stack.Screen name="chiefs-chamber" options={{ presentation: 'fullScreenModal' }} />
                    </Stack>
                </AuthGate>
                <StatusBar style="dark" />
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
