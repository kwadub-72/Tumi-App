import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/src/shared/services/supabase';
import { createClient } from '@supabase/supabase-js';

const withTimeout = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
};

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#4F6352'; // Dark Green Background
const DARK_GREEN = '#2F3A27';

export default function SignupWelcome() {
    const router = useRouter();
    const [fadeAnim] = useState(new Animated.Value(0));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleEnter = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const email = await AsyncStorage.getItem('signup_email');
            const username = await AsyncStorage.getItem('signup_username');
            const password = await AsyncStorage.getItem('signup_password');
            const firstName = await AsyncStorage.getItem('signup_firstName');
            const lastName = await AsyncStorage.getItem('signup_lastName');
            const bio = await AsyncStorage.getItem('signup_bio');
            const isPrivate = await AsyncStorage.getItem('signup_isPrivate');

            if (!email || !username || !password) {
                Alert.alert("Error", "Missing account details.");
                setLoading(false);
                return;
            }

            // 1. Check availability with timeout
            const rpcPromise = supabase.rpc('check_account_availability', {
                new_email: email,
                new_username: username
            });

            const { data: availability, error: rpcError } = await withTimeout(
                rpcPromise, 
                10000, 
                "Availability check timed out."
            ) as any;

            if (rpcError) {
                console.error("Availability check error:", rpcError);
                Alert.alert("Error", "Could not verify availability. Try again later.");
                setLoading(false);
                return;
            }

            if (availability && !availability.available) {
                Alert.alert("Account creation failed", availability.reason);
                setLoading(false);
                return;
            }

            // 2. Sign up using a lockless temporary client to avoid AsyncStorage deadlocks
            const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            });

            const signUpPromise = tempClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        handle: username,
                        name: `${firstName} ${lastName}`.trim(),
                        bio: bio || '',
                        is_private: isPrivate === 'true',
                    }
                }
            });

            const { data, error: signUpError } = await withTimeout(
                signUpPromise,
                15000,
                "Sign up timed out. Please try again."
            ) as any;

            if (signUpError) {
                console.error("Sign up error:", signUpError);
                Alert.alert("Error", signUpError.message);
                setLoading(false);
                return;
            }

            // 3. Log into the main client to persist the session
            const signInPromise = supabase.auth.signInWithPassword({
                email,
                password
            });

            const { error: signInError } = await withTimeout(
                signInPromise,
                15000,
                "Sign in timed out."
            ) as any;

            if (signInError) {
                if (signInError.message.includes("Email not confirmed")) {
                    Alert.alert(
                        "Verify Your Email",
                        "Your account has been created! Please check your email to verify your account before logging in.",
                        [
                            {
                                text: "OK",
                                onPress: async () => {
                                    // Clear storage
                                    const keys = await AsyncStorage.getAllKeys();
                                    const signupKeys = keys.filter(k => k.startsWith('signup_'));
                                    await AsyncStorage.multiRemove(signupKeys);
                                    router.replace('/');
                                }
                            }
                        ]
                    );
                    setLoading(false);
                    return;
                }
                console.error("Sign in error:", signInError);
                Alert.alert("Error", signInError.message);
                setLoading(false);
                return;
            }

            // Clear storage
            const keys = await AsyncStorage.getAllKeys();
            const signupKeys = keys.filter(k => k.startsWith('signup_'));
            await AsyncStorage.multiRemove(signupKeys);

            router.replace('/(tabs)');
        } catch (err: any) {
            console.error("Unexpected error:", err);
            Alert.alert("Error", "An unexpected error occurred.");
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <TabonoLogo size={120} color={CREAM_COLOR} />

                <Text style={styles.title}>Welcome to{'\n'}Tribe</Text>

                <TouchableOpacity style={styles.enterButton} onPress={handleEnter} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={CREAM_COLOR} />
                    ) : (
                        <Text style={styles.enterText}>Enter</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
    },
    title: {
        fontSize: 48,
        color: CREAM_COLOR,
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: 50,
    },
    enterButton: {
        backgroundColor: DARK_GREEN,
        paddingVertical: 15,
        paddingHorizontal: 60,
        borderRadius: 30,
        marginTop: 40,
    },
    enterText: {
        color: CREAM_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
