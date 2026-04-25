import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Linking,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import { useAuthStore } from '@/store/AuthStore';

const PLATFORM_CONFIG = {
    instagram: {
        label: 'Instagram',
        icon: 'logo-instagram' as const,
        domain: 'instagram.com',
        placeholder: 'https://www.instagram.com/yourhandle',
        color: '#E1306C',
        dbField: 'instagram_link' as const,
        storeField: 'instagramLink' as const,
    },
    tiktok: {
        label: 'TikTok',
        icon: 'logo-tiktok' as const,
        domain: 'tiktok.com',
        placeholder: 'https://www.tiktok.com/@yourhandle',
        color: '#010101',
        dbField: 'tiktok_link' as const,
        storeField: 'tiktokLink' as const,
    },
};

export default function SocialLinkScreen() {
    const router = useRouter();
    const { platform } = useLocalSearchParams<{ platform: string }>();

    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    const userInfo = useUserStore();

    const currentLink = platform === 'instagram' ? userInfo.instagramLink : userInfo.tiktokLink;
    const [link, setLink] = useState(currentLink ?? '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    if (!config) {
        return null;
    }

    const validate = (value: string): boolean => {
        if (!value.trim()) return true; // Empty = clearing the link, allowed
        if (!value.includes(config.domain)) {
            setError(`Please enter a valid ${config.label} link.`);
            return false;
        }
        setError('');
        return true;
    };

    const handleChange = (value: string) => {
        setLink(value);
        if (error) validate(value); // Clear error as user types valid input
    };

    const handleSave = async () => {
        if (!validate(link)) return;
        setSaving(true);

        const updateError = await useAuthStore.getState().updateProfile({
            [config.dbField]: link.trim() || null,
        });

        if (updateError) {
            Alert.alert('Error', 'Failed to save. Please try again.');
        } else {
            // Update local store
            userInfo.setProfile({ [config.storeField]: link.trim() });
            Alert.alert('Saved', `Your ${config.label} link has been updated.`);
            router.back();
        }

        setSaving(false);
    };

    const handleOpenLink = async () => {
        const url = link.trim();
        if (!url) return;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Cannot Open', 'This link does not appear to be valid.');
        }
    };

    const handleClear = () => {
        setLink('');
        setError('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Link {config.label}</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
                    <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Platform Icon */}
                <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
                    <Ionicons name={config.icon} size={56} color={config.color} />
                </View>

                <Text style={styles.instructionText}>
                    Paste your {config.label} profile link below. Followers can tap your icon to visit your page.
                </Text>

                {/* Input */}
                <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                    <Ionicons name={config.icon} size={18} color={error ? '#E53E3E' : Colors.primary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.input}
                        value={link}
                        onChangeText={handleChange}
                        onBlur={() => validate(link)}
                        placeholder={config.placeholder}
                        placeholderTextColor="#A0A0A0"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                    {link.length > 0 && (
                        <TouchableOpacity onPress={handleClear} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color="#A0A0A0" />
                        </TouchableOpacity>
                    )}
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}

                {/* Preview open button */}
                {link.trim().length > 0 && !error ? (
                    <TouchableOpacity style={styles.previewButton} onPress={handleOpenLink}>
                        <Ionicons name="open-outline" size={16} color={Colors.primary} />
                        <Text style={styles.previewButtonText}>Preview link</Text>
                    </TouchableOpacity>
                ) : null}

                {/* Current status */}
                {currentLink ? (
                    <View style={styles.currentLinkRow}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        <Text style={styles.currentLinkText} numberOfLines={1}>
                            Currently linked: {currentLink}
                        </Text>
                    </View>
                ) : null}
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
    saveButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        alignItems: 'center',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    instructionText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        width: '100%',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: '#E53E3E',
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
    },
    errorText: {
        color: '#E53E3E',
        fontSize: 13,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    previewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.card,
    },
    previewButtonText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    currentLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.card,
        borderRadius: 12,
        width: '100%',
    },
    currentLinkText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
    },
});
