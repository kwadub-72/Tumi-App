import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();

    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider value={DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="scan-result" options={{ presentation: 'transparentModal', animation: 'fade' }} />
                    <Stack.Screen name="camera-capture" options={{ presentation: 'fullScreenModal' }} />
                </Stack>
                <StatusBar style="dark" />
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
