import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/AuthStore';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
    const { session, loading, initialize } = useAuthStore();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inTabs = segments[0] === '(tabs)';
        const inAuth = segments[0] === 'login' || segments[0] === 'signup';

        if (!session && inTabs) {
            // Not signed in but trying to access tabs — go to login
            router.replace('/login');
        } else if (session && (inAuth || !segments[0])) {
            // Signed in but on auth screens or root — go to tabs
            router.replace('/(tabs)');
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
