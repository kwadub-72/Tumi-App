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
    Alert
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';

export default function ChangeEmailScreen() {
    const router = useRouter();
    const { email, setProfile } = useUserStore();
    const [newEmail, setNewEmail] = useState('');

    const handleSave = () => {
        if (!newEmail.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        setProfile({ email: newEmail });
        Alert.alert('Success', 'Email updated successfully', [
            { text: 'OK', onPress: () => router.back() }
        ]);
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
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
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
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
