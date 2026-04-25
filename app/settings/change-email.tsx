import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    Alert,
    ActivityIndicator,
    Keyboard
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/src/shared/services/supabase';
import { createClient } from '@supabase/supabase-js';

export default function ChangeEmailScreen() {
    const router = useRouter();
    const { email } = useUserStore();
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return;
        }

        if (newEmail.toLowerCase() === email.toLowerCase()) {
            Alert.alert('No Change', 'Please enter a different email address than your current one.');
            return;
        }

        Keyboard.dismiss();
        setIsLoading(true);

        try {
            // IMPORTANT: We use getSession() (reads in-memory cache, no lock)
            // NOT getUser() (network call that deadlocks with AuthStore's storage listener).
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                Alert.alert('Authentication Error', 'You must be logged in to change your email.');
                setIsLoading(false);
                return;
            }

            // Route the write through a stateless tempClient to avoid
            // the main client's AsyncStorage lock deadlock.
            const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            });

            // tempClient needs an active session before it can update the user.
            // We re-use the existing access token directly via setSession.
            await tempClient.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
            });

            // emailRedirectTo tells Supabase where to send the user after they click
            // the confirmation link. This MUST be on the allowlist in:
            //   Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
            // Add both: forge://email-confirmed   AND   exp://localhost:8081/--/email-confirmed
            const { error } = await tempClient.auth.updateUser(
                { email: newEmail.trim() },
                { emailRedirectTo: 'forge://email-confirmed' }
            );

            if (error) {
                console.error('Email update error:', error);
                Alert.alert('Update Failed', error.message);
                return;
            }

            Alert.alert(
                'Check Your Inbox',
                `A confirmation link has been sent to ${newEmail}. \n\nIMPORTANT: If you have "Secure Email Change" enabled in Supabase, you must also click the link sent to your CURRENT email (${email}) to confirm the switch.`,
                [
                    { text: 'Got it', onPress: () => router.back() }
                ]
            );
        } catch (e: any) {
            console.error('[ChangeEmail] Unexpected error:', e);
            Alert.alert('Error', e.message || 'An unexpected error occurred. Please check your network connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change Email</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.currentEmailCard}>
                    <Text style={styles.label}>Current Email</Text>
                    <Text style={styles.currentEmailText}>{email}</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter new email"
                        placeholderTextColor="#999"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    content: {
        paddingHorizontal: 20,
        gap: 25,
    },
    currentEmailCard: {
        backgroundColor: Colors.card,
        borderRadius: 25,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(45, 58, 38, 0.1)',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 8,
        opacity: 0.7,
    },
    currentEmailText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    inputGroup: {
        gap: 8,
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        height: 60,
        paddingHorizontal: 20,
        color: Colors.primary,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(45, 58, 38, 0.1)',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 25,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
