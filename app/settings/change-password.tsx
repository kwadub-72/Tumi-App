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
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const handleSave = () => {
        if (!oldPass || !newPass || !confirmPass) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPass !== confirmPass) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        Alert.alert('Success', 'Password changed successfully', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    };

    const renderPasswordField = (
        label: string,
        value: string,
        setter: (v: string) => void,
        isVisible: boolean,
        toggleVisibility: () => void
    ) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.passwordWrapper}>
                <TextInput
                    style={styles.input}
                    secureTextEntry={!isVisible}
                    value={value}
                    onChangeText={setter}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.visibilityToggle} onPress={toggleVisibility}>
                    <Ionicons
                        name={isVisible ? "eye-off-outline" : "eye-outline"}
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
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Change Password</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {renderPasswordField('Old Password', oldPass, setOldPass, showOldPass, () => setShowOldPass(!showOldPass))}
                    {renderPasswordField('New Password', newPass, setNewPass, showNewPass, () => setShowNewPass(!showNewPass))}
                    {renderPasswordField('Confirm New Password', confirmPass, setConfirmPass, showConfirmPass, () => setShowConfirmPass(!showConfirmPass))}

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Update Password</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
        gap: 20,
        paddingBottom: 40,
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
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
