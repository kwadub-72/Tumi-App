import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';

Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    debug: __DEV__,
});
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore, DbProfile } from '../store/AuthStore';
import { useNetworkStore } from '@/src/store/NetworkStore';
import { supabase } from '@/src/shared/services/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePushNotifications } from '../src/shared/hooks/usePushNotifications';
import NaturalDecisionOverlay from '../components/NaturalDecisionOverlay';
import { NaturalApplication } from '../src/shared/models/database.types';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate({ children }: { children: React.ReactNode }) {
    const { session, loading, initialize, profile } = useAuthStore();
    const { init: initNetwork, clear: clearNetwork } = useNetworkStore();
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();
    const [pendingDecision, setPendingDecision] = useState<NaturalApplication | null>(null);

    usePushNotifications();

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (!session?.user?.id) {
            setPendingDecision(null);
            return;
        }

        const checkDecision = async () => {
            try {
                const decision = await useAuthStore.getState().fetchUnacknowledgedDecision();
                if (decision) {
                    setPendingDecision(decision);
                }
            } catch (err) {
                console.error('[AuthGate] Error checking unacknowledged decision:', err);
            }
        };
        checkDecision();
    }, [session?.user?.id]);

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

    const isBanned = profile?.banned_until && new Date(profile.banned_until) > new Date();

    if (isBanned) {
        const daysRemaining = Math.max(1, Math.ceil((new Date(profile.banned_until!).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
        return (
            <SafeAreaView style={styles.banContainer}>
                <View style={styles.banContent}>
                    <Ionicons name="warning" size={80} color="#FF3B30" style={styles.banIcon} />
                    <Text style={styles.banHeader}>Account Temporarily Suspended</Text>
                    <Text style={styles.banBody}>
                        You have been temporarily banned for violation of Chribe's user policies:
                    </Text>
                    <Text style={styles.banReason}>
                        "{profile.ban_reason || 'Community Guidelines Violation'}"
                    </Text>
                    <Text style={styles.banBody}>
                        Your account will be reinstated in <Text style={{ fontWeight: 'bold', color: Colors.theme.harvestGold }}>{daysRemaining} day(s)</Text>.
                    </Text>
                    <Text style={styles.banFooter}>
                        With future infractions, your account may be permanently banned.
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.signOutBtn}
                    onPress={() => useAuthStore.getState().signOut()}
                >
                    <Text style={styles.signOutBtnText}>Sign Out</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <>
            <NaturalDecisionOverlay
                visible={pendingDecision !== null}
                application={pendingDecision}
                onClose={async () => {
                    if (pendingDecision) {
                        await useAuthStore.getState().acknowledgeDecision(pendingDecision.id);
                        setPendingDecision(null);
                        await useAuthStore.getState().refreshProfile();
                    }
                }}
            />
            {children}
        </>
    );
}

import { useFonts } from 'expo-font';

function RootLayout() {
    const colorScheme = useColorScheme();

    // Pre-load custom font assets. Uncomment the BackoutPrint mapping once the .ttf/.otf file is placed in assets/fonts/
    /*
    const [fontsLoaded] = useFonts({
        BackoutPrint: require('../assets/fonts/BackoutPrint.ttf'),
    });
    */

    return (
        <QueryClientProvider client={queryClient}>
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
                            <Stack.Screen name="notifications" />
                        </Stack>
                    </AuthGate>
                    <StatusBar style="dark" />
                </ThemeProvider>
            </GestureHandlerRootView>
        </QueryClientProvider>
    );
}

const styles = StyleSheet.create({
    banContainer: {
        flex: 1,
        backgroundColor: Colors.theme.charcoal,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 40,
    },
    banContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    banIcon: {
        marginBottom: 24,
    },
    banHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: 20,
    },
    banBody: {
        fontSize: 16,
        color: '#EDE8D5',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
    },
    banReason: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DAA520',
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#1A1A1A',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
        marginBottom: 24,
        width: '100%',
    },
    banFooter: {
        fontSize: 13,
        color: '#EDE8D5',
        opacity: 0.5,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 10,
    },
    signOutBtn: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#FF3B30',
        borderRadius: 100,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
    },
    signOutBtnText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});

export default Sentry.wrap(RootLayout);

