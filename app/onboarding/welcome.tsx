import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useAuthStore } from '@/store/AuthStore';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { supabase } from '@/src/shared/services/supabase';
import { decode } from 'base64-arraybuffer';

export default function WelcomeScreen() {
    const router = useRouter();
    const { submitOnboarding } = useOnboardingStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWaitingForEmail, setIsWaitingForEmail] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                useAuthStore.setState({ session });
                
                // Upload avatar if pending in the onboarding store
                const { avatarUri, avatarBase64 } = useOnboardingStore.getState();
                if (avatarUri && avatarBase64) {
                    const finalUserId = session.user.id;
                    try {
                        const arrayBuffer = decode(avatarBase64);
                        const fileExt = avatarUri.split('.').pop() || 'jpeg';
                        const fileName = `${finalUserId}-${Date.now()}.${fileExt}`;
                        const filePath = `${finalUserId}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, arrayBuffer, {
                                contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                                upsert: true
                            });

                        if (!uploadError) {
                            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                            const finalAvatarUrl = publicUrlData.publicUrl;
                            await supabase
                                .from('profiles')
                                .update({ avatar_url: finalAvatarUrl })
                                .eq('id', finalUserId);
                        } else {
                            console.error('onAuthStateChange avatar upload error:', uploadError);
                        }
                    } catch (err) {
                        console.error('onAuthStateChange avatar upload exception:', err);
                    }
                }

                await useAuthStore.getState().refreshProfile();
                useOnboardingStore.getState().reset();
                router.replace('/(tabs)');
            }
        });
        return () => subscription.unsubscribe();
    }, [router]);

    const checkVerification = useCallback(async () => {
        const { email, password, reset } = useOnboardingStore.getState();
        if (!email || !password) {
            // Fallback: check if we already have a session set by a deep link
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                useAuthStore.setState({ session });
                await useAuthStore.getState().refreshProfile();
                reset();
                router.replace('/(tabs)');
                return;
            }
            Alert.alert(
                'Session Not Found',
                'Your onboarding details could not be found. Please log in with your email and password.',
                [{ text: 'OK', onPress: () => router.replace('/login') }]
            );
            return;
        }

        try {
            setIsVerifying(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // If it fails because of email verification, guide the user
                if (
                    error.message.toLowerCase().includes('confirm') ||
                    error.message.toLowerCase().includes('verified') ||
                    error.message.toLowerCase().includes('verification')
                ) {
                    Alert.alert(
                        'Not Verified Yet',
                        'We checked the database, but your email is not verified yet. Please check your inbox and tap the link in the email.'
                    );
                } else {
                    Alert.alert('Verification Check Failed', error.message);
                }
                return;
            }

            if (data.session) {
                useAuthStore.setState({ session: data.session });

                // Upload avatar if pending in the onboarding store
                const { avatarUri, avatarBase64 } = useOnboardingStore.getState();
                if (avatarUri && avatarBase64) {
                    const finalUserId = data.session.user.id;
                    try {
                        const arrayBuffer = decode(avatarBase64);
                        const fileExt = avatarUri.split('.').pop() || 'jpeg';
                        const fileName = `${finalUserId}-${Date.now()}.${fileExt}`;
                        const filePath = `${finalUserId}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, arrayBuffer, {
                                contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                                upsert: true
                            });

                        if (!uploadError) {
                            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                            const finalAvatarUrl = publicUrlData.publicUrl;
                            await supabase
                                .from('profiles')
                                .update({ avatar_url: finalAvatarUrl })
                                .eq('id', finalUserId);
                        } else {
                            console.error('checkVerification avatar upload error:', uploadError);
                        }
                    } catch (err) {
                        console.error('checkVerification avatar upload exception:', err);
                    }
                }

                await useAuthStore.getState().refreshProfile();
                reset();
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'An error occurred during verification check.');
        } finally {
            setIsVerifying(false);
        }
    }, [router]);

    const handleResendEmail = async () => {
        const { email } = useOnboardingStore.getState();
        if (!email) {
            Alert.alert('Error', 'Email address not found. Please go back to login.');
            return;
        }

        try {
            setIsResending(true);
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });

            if (error) {
                Alert.alert('Resend Failed', error.message);
            } else {
                Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'An error occurred while resending the email.');
        } finally {
            setIsResending(false);
        }
    };

    const handleBackToLogin = () => {
        useOnboardingStore.getState().reset();
        router.replace('/login');
    };

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && isWaitingForEmail) {
                checkVerification();
            }
        });

        return () => subscription.remove();
    }, [isWaitingForEmail, checkVerification]);

    const handleEnter = async () => {
        setIsSubmitting(true);
        const { success, error, requiresEmailConfirmation } = await submitOnboarding();
        setIsSubmitting(false);

        if (success) {
            if (requiresEmailConfirmation) {
                setIsWaitingForEmail(true);
            } else {
                router.replace('/(tabs)');
            }
        } else {
            Alert.alert('Setup Failed', error?.message || 'Something went wrong during onboarding.');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.content}>
                <TabonoLogo size={180} color={Colors.theme.harvestGold} />
                <Text style={styles.title}>Welcome to Tribe</Text>
                <Text style={styles.subtitle}>{"Let's do it together"}</Text>
            </View>

            <View style={styles.footer}>
                {isWaitingForEmail ? (
                    <View style={styles.waitingContainer}>
                        <Ionicons name="mail-unread-outline" size={64} color={Colors.theme.harvestGold} style={{ marginBottom: 16 }} />
                        <Text style={styles.waitingTitle}>Check your email!</Text>
                        <Text style={styles.waitingSubtitle}>
                            We sent a verification link to your inbox. Tap it to activate your Tribe account.
                        </Text>

                        <View style={styles.waitingButtons}>
                            <TouchableOpacity
                                style={[styles.button, isVerifying && styles.buttonDisabled]}
                                onPress={checkVerification}
                                disabled={isVerifying || isResending}
                            >
                                {isVerifying ? (
                                    <ActivityIndicator color={Colors.theme.charcoal} />
                                ) : (
                                    <Text style={styles.buttonText}>{"I've Verified My Email"}</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryButton, isResending && styles.buttonDisabled]}
                                onPress={handleResendEmail}
                                disabled={isVerifying || isResending}
                            >
                                {isResending ? (
                                    <ActivityIndicator color={Colors.theme.softWhite} />
                                ) : (
                                    <Text style={styles.secondaryButtonText}>Resend Link</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={handleBackToLogin}
                                disabled={isVerifying || isResending}
                            >
                                <Text style={styles.linkButtonText}>Back to Log in</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={[styles.button, isSubmitting && styles.buttonDisabled]} 
                        onPress={handleEnter}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={Colors.theme.charcoal} />
                        ) : (
                            <Text style={styles.buttonText}>Enter</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: Colors.theme.softWhite,
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 28,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
    },
    button: {
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
    waitingContainer: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    waitingTitle: {
        color: Colors.theme.softWhite,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    waitingSubtitle: {
        color: Colors.theme.dust,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    waitingButtons: {
        width: '100%',
        gap: 12,
    },
    secondaryButton: {
        backgroundColor: Colors.theme.charcoal,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    secondaryButtonText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    linkButtonText: {
        color: Colors.theme.dust,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
