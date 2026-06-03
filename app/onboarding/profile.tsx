import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { supabase } from '@/src/shared/services/supabase';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { 
    UsernameInput, 
    EmailInput, 
    FirstNameInput, 
    LastNameInput, 
    BirthdayPicker, 
    PasswordInput 
} from '@/src/shared/components/AuthInputs';

export default function ProfileScreen() {
    const router = useRouter();
    const { handle, setHandle, name, setName, dob, setDob, bio, setBio, avatarUri, setAvatarUri, setAvatarBase64, setEmail: setStoreEmail, setPassword: setStorePassword } = useOnboardingStore();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
            setAvatarBase64(result.assets[0].base64 || null);
        }
    };

    // Local state for additional fields not directly inside the store right now
    const [firstName, setFirstName] = useState(name ? name.split(' ')[0] : '');
    const [lastName, setLastName] = useState(name ? name.split(' ').slice(1).join(' ') : '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [handleError, setHandleError] = useState<string>('');

    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [emailError, setEmailError] = useState<string>('');

    useEffect(() => {
        if (handle.length === 0) {
            setHandleStatus('idle');
            setHandleError('');
            return;
        }
        if (handle.length < 3) {
            setHandleStatus('error');
            setHandleError('Handle must be at least 3 characters');
            return;
        }

        setHandleStatus('checking');
        
        const timer = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('handle', handle.trim())
                    .maybeSingle();

                if (error) {
                    console.error('[Handle Validation Error]', error.message, error.details);
                }

                if (data) {
                    setHandleStatus('error');
                    setHandleError('This handle is already taken');
                } else {
                    setHandleStatus('success');
                    setHandleError('');
                }
            } catch (err) {
                setHandleStatus('error');
                setHandleError('Unable to verify handle');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [handle]);

    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.length === 0) {
            setEmailStatus('idle');
            setEmailError('');
            return;
        }
        
        if (!emailRegex.test(email)) {
            setEmailStatus('error');
            setEmailError('Please enter a valid email address');
        } else {
            // Pass validation locally. Supabase Auth will natively handle uniqueness during actual sign-up.
            setEmailStatus('success');
            setEmailError('');
        }
    }, [email]);

    // Input Refs for programmatic focus management
    const firstNameRef = useRef<TextInput>(null);
    const lastNameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const handleRef = useRef<TextInput>(null);
    const bioRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    // Validate 13+ Age Gate
    const isAgeValid = useMemo(() => {
        if (!dob || typeof dob !== 'string') return false;
        
        const [year, month, day] = dob.split('-').map(Number);
        if (!year || !month || !day) return false;
        
        const birthDate = new Date(year, month - 1, day);
        const today = new Date(2026, 4, 1); // Mocked current date based on AuthInputs
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 13 && age <= 120;
    }, [dob]);

    // Validate Email Format
    const isEmailValid = useMemo(() => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, [email]);

    const isPasswordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password);
    
    const getPasswordError = () => {
        if (password.length === 0) return undefined;
        if (password.length < 8) return 'Must be at least 8 characters';
        if (!/(?=.*[A-Z])/.test(password)) return 'Must contain an uppercase letter';
        if (!/(?=.*\d)/.test(password)) return 'Must contain a number';
        if (!/(?=.*[@$!%*?&#])/.test(password)) return 'Must contain a special character';
        return undefined;
    };

    // Master validation gate
    const isFormValid = 
        firstName.trim().length > 0 && 
        emailStatus === 'success' && 
        handleStatus === 'success' && 
        isPasswordStrong;

    const handleContinue = () => {
        if (!isFormValid) return;
        setName(`${firstName.trim()} ${lastName.trim()}`);
        setHandle(handle);
        setStoreEmail(email);
        setStorePassword(password);
        setDob(dob);
        setBio(bio);
        router.push('/onboarding/activity');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flex1}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                            </TouchableOpacity>
                            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                                <TabonoLogo size={32} color={Colors.theme.harvestGold} />
                            </View>
                            <View style={{ width: 28 }} pointerEvents="none" />
                        </View>

                        <ScrollView 
                            style={styles.content} 
                            showsVerticalScrollIndicator={false} 
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={styles.title}>Create Profile</Text>
                            <Text style={styles.subtitle}>Set up your Tribe identity.</Text>

                            <View style={styles.formContainer}>
                                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                    <TouchableOpacity onPress={pickImage}>
                                        <View style={{ 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            backgroundColor: Colors.background, 
                                            borderColor: 'rgba(255, 255, 255, 0.2)', 
                                            borderWidth: 1,
                                            borderRadius: 50, 
                                            width: 100, 
                                            height: 100, 
                                            overflow: 'hidden'
                                        }}>
                                            {avatarUri ? (
                                                <Image source={{ uri: avatarUri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                                            ) : (
                                                <Ionicons name="camera" size={40} color={Colors.theme.dust} />
                                            )}
                                        </View>
                                        <View style={{ 
                                            position: 'absolute', 
                                            right: 0, 
                                            bottom: 0, 
                                            backgroundColor: Colors.theme.harvestGold, 
                                            borderRadius: 15, 
                                            width: 30, 
                                            height: 30, 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Ionicons name="add" size={20} color={Colors.theme.charcoal} />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <FirstNameInput 
                                    ref={firstNameRef}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    returnKeyType="next"
                                    onSubmitEditing={() => lastNameRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                                <LastNameInput 
                                    ref={lastNameRef}
                                    value={lastName}
                                    onChangeText={setLastName}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                    blurOnSubmit={true}
                                />
                                <BirthdayPicker 
                                    value={dob || ''}
                                    onChange={(val: any) => setDob(val)}
                                />
                                <EmailInput 
                                    ref={emailRef}
                                    value={email}
                                    onChangeText={setEmail}
                                    returnKeyType="next"
                                    onSubmitEditing={() => handleRef.current?.focus()}
                                    blurOnSubmit={false}
                                    inputState={emailStatus === 'checking' ? 'idle' : emailStatus}
                                    errorText={emailError}
                                />
                                <UsernameInput 
                                    ref={handleRef}
                                    value={handle}
                                    onChangeText={setHandle}
                                    returnKeyType="next"
                                    onSubmitEditing={() => bioRef.current?.focus()}
                                    blurOnSubmit={false}
                                    inputState={handleStatus === 'checking' ? 'idle' : handleStatus}
                                    errorText={handleError}
                                />
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ 
                                        color: Colors.theme.softWhite, 
                                        fontSize: 14, 
                                        fontWeight: '600', 
                                        marginBottom: 8, 
                                        marginLeft: 4 
                                    }}>
                                        Bio (Optional)
                                    </Text>
                                    <TextInput 
                                        ref={bioRef}
                                        value={bio}
                                        onChangeText={setBio}
                                        placeholder="Share a quick blurb about your journey..."
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        maxLength={100}
                                        multiline={true}
                                        textAlignVertical="top"
                                        style={{
                                            backgroundColor: Colors.background,
                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                            borderWidth: 1,
                                            borderRadius: 12,
                                            padding: 16,
                                            color: '#FFFFFF',
                                            fontSize: 16,
                                            minHeight: 80,
                                        }}
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordRef.current?.focus()}
                                        blurOnSubmit={false}
                                    />
                                    <Text style={{ 
                                        alignSelf: 'flex-end', 
                                        color: Colors.theme.softWhite, 
                                        fontSize: 12, 
                                        marginTop: 4 
                                    }}>
                                        {bio.length}/100
                                    </Text>
                                </View>
                                <PasswordInput 
                                    ref={passwordRef}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                    inputState={password.length === 0 ? 'idle' : isPasswordStrong ? 'success' : 'error'}
                                    errorText={getPasswordError()}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={[styles.button, !isFormValid && styles.buttonDisabled]}
                                onPress={handleContinue}
                                disabled={!isFormValid}
                            >
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flex1: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5, marginLeft: -5 },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
    title: { fontSize: 32, fontWeight: '900', color: Colors.theme.softWhite, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.theme.dust, marginBottom: 32 },
    formContainer: { gap: 4, paddingBottom: 40 },
    footer: { padding: 24, paddingBottom: 40 },
    button: { backgroundColor: Colors.theme.harvestGold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' },
});
