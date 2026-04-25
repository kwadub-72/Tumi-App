import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';

// ---------------------------------------------------------------------------
// This screen is the landing point for the deep link that Supabase sends in
// the "Confirm email change" email:
//
//   forge://email-confirmed?token_hash=<hash>&type=email_change
//
// Expo Router maps `forge://email-confirmed` → `/email-confirmed` and passes
// any query-string parameters as searchParams.
// ---------------------------------------------------------------------------

type Status = 'loading' | 'success' | 'error';

export default function EmailConfirmedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ token_hash?: string; type?: string; error?: string; error_description?: string }>();
    const { refreshProfile } = useAuthStore();

    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('Verifying your email…');

    useEffect(() => {
        handleConfirmation();
    }, []);

    const handleConfirmation = async () => {
        try {
            // Supabase sends the token in the URL query string for PKCE flow or
            // in the hash fragment for the implicit flow. Expo Router exposes
            // query params via useLocalSearchParams; we also parse the hash.
            const tokenHash = params.token_hash ?? extractHashParam('token_hash');
            const type = (params.type ?? extractHashParam('type')) as 'email_change' | 'signup' | undefined;

            // Implicit flow: Supabase redirects with access_token in the hash
            const accessToken = extractHashParam('access_token');
            const refreshToken = extractHashParam('refresh_token');

            if (params.error) {
                setMessage(params.error_description ?? params.error ?? 'Verification failed.');
                setStatus('error');
                return;
            }

            if (tokenHash && type) {
                // PKCE / OTP flow — verify the token hash
                const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
                if (error) {
                    setMessage(error.message);
                    setStatus('error');
                    return;
                }
            } else if (accessToken && refreshToken) {
                // Implicit flow — set the session directly
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (error) {
                    setMessage(error.message);
                    setStatus('error');
                    return;
                }
            } else {
                setMessage('Invalid or missing confirmation token. Please try again.');
                setStatus('error');
                return;
            }

            // Refresh the local profile so the new email is reflected immediately
            await refreshProfile();

            setMessage('Your email address has been updated successfully!');
            setStatus('success');
        } catch (e: any) {
            console.error('[EmailConfirmed] Unexpected error:', e);
            setMessage(e.message ?? 'An unexpected error occurred.');
            setStatus('error');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                {status === 'loading' && (
                    <>
                        <ActivityIndicator size="large" color={Colors.primary} style={styles.icon} />
                        <Text style={styles.title}>Verifying…</Text>
                        <Text style={styles.subtitle}>{message}</Text>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <View style={[styles.iconCircle, styles.successCircle]}>
                            <Ionicons name="checkmark" size={36} color="#fff" />
                        </View>
                        <Text style={styles.title}>Email Updated!</Text>
                        <Text style={styles.subtitle}>{message}</Text>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => router.replace('/(tabs)')}
                        >
                            <Text style={styles.buttonText}>Back to App</Text>
                        </TouchableOpacity>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <View style={[styles.iconCircle, styles.errorCircle]}>
                            <Ionicons name="close" size={36} color="#fff" />
                        </View>
                        <Text style={styles.title}>Verification Failed</Text>
                        <Text style={styles.subtitle}>{message}</Text>
                        <TouchableOpacity
                            style={[styles.button, styles.retryButton]}
                            onPress={() => router.replace('/settings/change-email')}
                        >
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Helper: parse a value from the current URL's hash fragment.
// Supabase's implicit flow appends tokens after '#', e.g.:
//   forge://email-confirmed#access_token=...&type=email_change
// ---------------------------------------------------------------------------
function extractHashParam(key: string): string | undefined {
    try {
        const url = Linking.getLinkingURL() ?? '';
        const hash = url.includes('#') ? url.split('#')[1] : '';
        const params = new URLSearchParams(hash);
        return params.get(key) ?? undefined;
    } catch {
        return undefined;
    }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    icon: {
        marginBottom: 8,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    successCircle: {
        backgroundColor: '#2ECC71',
    },
    errorCircle: {
        backgroundColor: '#E74C3C',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: Colors.primary,
        opacity: 0.65,
        textAlign: 'center',
        lineHeight: 22,
    },
    button: {
        marginTop: 8,
        backgroundColor: Colors.primary,
        borderRadius: 25,
        paddingVertical: 14,
        paddingHorizontal: 40,
    },
    retryButton: {
        backgroundColor: '#E74C3C',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});
