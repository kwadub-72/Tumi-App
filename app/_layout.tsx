import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/AuthStore';
import { useNetworkStore } from '@/src/store/NetworkStore';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
    const { session, loading, initialize } = useAuthStore();
    const { init: initNetwork, clear: clearNetwork } = useNetworkStore();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inTabs = segments[0] === '(tabs)';
        const inAuth = segments[0] === 'login' || segments[0] === 'signup';
        // Never redirect away from the deep-link callback screens
        const inCallback = segments[0] === 'email-confirmed';

        if (inCallback) return;

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

        SplashScreen.hideAsync();
    }, [session, loading]);

    return <>{children}</>;
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

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
                    </Stack>
                </AuthGate>
                <StatusBar style="dark" />
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
