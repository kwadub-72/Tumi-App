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
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="scan-result" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
                    <Stack.Screen name="meal-entry" options={{ headerShown: false }} />
                    <Stack.Screen name="weight-history" options={{ headerShown: false }} />
                    <Stack.Screen name="camera-capture" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                </Stack>
                <StatusBar style="light" />
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
