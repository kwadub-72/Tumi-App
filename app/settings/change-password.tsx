import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    Keyboard,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/src/shared/services/supabase';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const PASSWORD_RULES = {
    minLength: 8,
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    digit: /[0-9]/,
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

interface ValidationResult {
    valid: boolean;
    message: string;
}

function validateNewPassword(password: string): ValidationResult {
    if (password.length < PASSWORD_RULES.minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!PASSWORD_RULES.uppercase.test(password)) {
        return { valid: false, message: 'Password must include at least one uppercase letter.' };
    }
    if (!PASSWORD_RULES.lowercase.test(password)) {
        return { valid: false, message: 'Password must include at least one lowercase letter.' };
    }
    if (!PASSWORD_RULES.digit.test(password)) {
        return { valid: false, message: 'Password must include at least one number.' };
    }
    if (!PASSWORD_RULES.special.test(password)) {
        return { valid: false, message: 'Password must include at least one special character (e.g. !, @, #).' };
    }
    return { valid: true, message: '' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChangePasswordScreen() {
    const router = useRouter();

    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // ------------------------------------------------------------------
    // Submission logic
    // ------------------------------------------------------------------

    const handleSave = async () => {
        setErrorMessage(null);
        Keyboard.dismiss();

        // 1. Ensure all fields are filled
        if (!currentPass || !newPass || !confirmPass) {
            setErrorMessage('Please fill in all fields.');
            return;
        }

        // 2. Validate new password strength
        const { valid, message } = validateNewPassword(newPass);
        if (!valid) {
            setErrorMessage(message);
            return;
        }

        // 3. Confirm passwords match
        if (newPass !== confirmPass) {
            setErrorMessage('New password and confirmation do not match.');
            return;
        }

        setIsLoading(true);

        try {
            // 4. Read the user's email from the local session cache.
            //    IMPORTANT: We use getSession() NOT getUser() here.
            //    getUser() makes a network call AND acquires an AsyncStorage write lock.
            //    The persistent auth listener in AuthStore already holds that lock,
            //    causing an infinite deadlock. getSession() reads from the in-memory
            //    cache only — no network call, no lock, no hang.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user?.email) {
                setErrorMessage('You must be logged in to change your password.');
                setIsLoading(false);
                return;
            }

            const userEmail = session.user.email;

            // 5. Use a stateless tempClient for ALL auth operations so we never
            //    touch the main client's AsyncStorage lock.
            const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            });

            // 5a. Verify the current password.
            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email: userEmail,
                password: currentPass,
            });

            if (signInError) {
                const isWrongPassword =
                    signInError.message.toLowerCase().includes('invalid login credentials') ||
                    signInError.message.toLowerCase().includes('invalid credentials') ||
                    signInError.status === 400;

                setErrorMessage(isWrongPassword
                    ? 'Incorrect current password. Please try again.'
                    : `Authentication failed: ${signInError.message}`);
                setIsLoading(false);
                return;
            }

            // 5b. Sign into tempClient first so it has a valid session, then update.
            //    updateUser needs an active session on the client making the call.
            const { data: tempSession } = await tempClient.auth.signInWithPassword({
                email: userEmail,
                password: currentPass,
            });

            const { error: updateError } = await tempClient.auth.updateUser({
                password: newPass,
            });

            if (updateError) {
                setErrorMessage(`Failed to update password: ${updateError.message}`);
                setIsLoading(false);
                return;
            }

            // 7. Success
            Alert.alert(
                'Password Updated',
                'Your password has been changed successfully.',
                [{ text: 'OK', onPress: () => router.back() }],
            );
        } catch (e: any) {
            console.error('Diagnostic [ChangePassword] - Unexpected error:', e);
            setErrorMessage(e.message || 'An unexpected error occurred. Please check your network connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // ------------------------------------------------------------------
    // Render helpers
    // ------------------------------------------------------------------

    const renderPasswordField = (
        label: string,
        value: string,
        setter: (v: string) => void,
        isVisible: boolean,
        toggleVisibility: () => void,
        editable = true,
    ) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.passwordWrapper, !editable && styles.disabledWrapper]}>
                <TextInput
                    style={styles.input}
                    secureTextEntry={!isVisible}
                    value={value}
                    onChangeText={(text) => {
                        setErrorMessage(null);
                        setter(text);
                    }}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor="#999"
                    editable={editable}
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={toggleVisibility}
                    disabled={!editable}
                >
                    <Ionicons
                        name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={24}
                        color={Colors.primary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Change Password</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Error banner */}
                    {errorMessage && (
                        <View style={styles.errorBanner}>
                            <Ionicons
                                name="alert-circle-outline"
                                size={18}
                                color="#fff"
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    )}

                    {/* Password strength hint */}
                    <View style={styles.hintCard}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} style={{ marginRight: 6, opacity: 0.7 }} />
                        <Text style={styles.hintText}>
                            Password must be 8+ characters with uppercase, lowercase, a number, and a special character.
                        </Text>
                    </View>

                    {renderPasswordField(
                        'Current Password',
                        currentPass,
                        setCurrentPass,
                        showCurrentPass,
                        () => setShowCurrentPass((v) => !v),
                        !isLoading,
                    )}
                    {renderPasswordField(
                        'New Password',
                        newPass,
                        setNewPass,
                        showNewPass,
                        () => setShowNewPass((v) => !v),
                        !isLoading,
                    )}
                    {renderPasswordField(
                        'Confirm New Password',
                        confirmPass,
                        setConfirmPass,
                        showConfirmPass,
                        () => setShowConfirmPass((v) => !v),
                        !isLoading,
                    )}

                    <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
        gap: 20,
        paddingBottom: 40,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C0392B',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
        flexWrap: 'wrap',
    },
    hintCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(45, 58, 38, 0.08)',
    },
    hintText: {
        fontSize: 13,
        color: Colors.primary,
        opacity: 0.65,
        flex: 1,
        lineHeight: 18,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.primary,
        marginLeft: 5,
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(45, 58, 38, 0.1)',
    },
    disabledWrapper: {
        opacity: 0.5,
    },
    input: {
        flex: 1,
        height: 60,
        paddingHorizontal: 20,
        color: Colors.primary,
        fontSize: 16,
    },
    visibilityToggle: {
        paddingHorizontal: 15,
        height: 60,
        justifyContent: 'center',
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
        opacity: 0.6,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
