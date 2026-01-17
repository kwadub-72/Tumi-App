import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/shared/theme/Colors';
import { PostStore } from '@/store/PostStore';
import { useUserStore } from '@/store/UserStore';

export default function EditProfileScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const { setProfile } = userInfo;

    // Form State
    const [displayName, setDisplayName] = useState(userInfo.name);
    const [avatarUrl, setAvatarUrl] = useState(userInfo.avatar);
    const [profileVisible, setProfileVisible] = useState(true);
    const [mealVisible, setMealVisible] = useState(false);
    const [workoutVisible, setWorkoutVisible] = useState(true);
    const [macroVisible, setMacroVisible] = useState(false);
    const [likeVisible, setLikeVisible] = useState(false);
    const [measurementsVisible, setMeasurementsVisible] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setAvatarUrl(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        try {
            // Update UserStore - this will now trigger PostStore.updateUser automatically
            await setProfile({
                name: displayName,
                avatar: avatarUrl ? (typeof avatarUrl === 'string' ? avatarUrl : avatarUrl) : undefined
            });

            Alert.alert('Success', 'Profile updated successfully');
            router.back();
        } catch (error) {
            console.error('Failed to save profile', error);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save changes</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                        <Image
                            source={avatarUrl ? { uri: avatarUrl } : require('../assets/images/kwadub.jpg')}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage}>
                        <Text style={styles.editPhotoText}>Edit photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>

                    {/* Display Name */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Display name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={displayName}
                            onChangeText={setDisplayName}
                        />
                    </View>

                    {/* Tribe Displayed */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tribe displayed</Text>
                        <View style={styles.tribePill}>
                            <Image
                                source={{ uri: userInfo.tribeAvatar }}
                                style={styles.tribeAvatar}
                            />
                            <Text style={styles.tribeText}>{userInfo.tribe}</Text>
                        </View>
                    </View>

                    {/* Profile Visibility */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Profile visibility</Text>
                        <TouchableOpacity
                            style={[styles.toggleContainer, profileVisible ? styles.toggleActive : styles.toggleInactive]}
                            onPress={() => setProfileVisible(!profileVisible)}
                        >
                            <Ionicons name={profileVisible ? "earth" : "lock-closed"} size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Meal Visibility */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Meal visibility</Text>
                        <TouchableOpacity
                            style={[styles.toggleContainer, mealVisible ? styles.toggleActive : styles.toggleInactive]}
                            onPress={() => setMealVisible(!mealVisible)}
                        >
                            <Ionicons name={mealVisible ? "earth" : "lock-closed"} size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Workout Visibility */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Workout visibility</Text>
                        <TouchableOpacity
                            style={[styles.toggleContainer, workoutVisible ? styles.toggleActive : styles.toggleInactive]}
                            onPress={() => setWorkoutVisible(!workoutVisible)}
                        >
                            <Ionicons name={workoutVisible ? "earth" : "lock-closed"} size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Macro Visibility */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Macro visibility</Text>
                        <TouchableOpacity
                            style={[styles.toggleContainer, macroVisible ? styles.toggleActive : styles.toggleInactive]}
                            onPress={() => setMacroVisible(!macroVisible)}
                        >
                            <Ionicons name={macroVisible ? "earth" : "lock-closed"} size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Like Visibility */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Like visiblity</Text>
                        <TouchableOpacity
                            style={[styles.toggleContainer, likeVisible ? styles.toggleActive : styles.toggleInactive]}
                            onPress={() => setLikeVisible(!likeVisible)}
                        >
                            <Ionicons name={likeVisible ? "earth" : "lock-closed"} size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Measurements */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Measurements</Text>
                        <TouchableOpacity
                            style={[styles.toggleContainer, measurementsVisible ? styles.toggleActive : styles.toggleInactive]}
                            onPress={() => setMeasurementsVisible(!measurementsVisible)}
                        >
                            <Ionicons name={measurementsVisible ? "earth" : "lock-closed"} size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Activity */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Activity</Text>
                        <TouchableOpacity
                            style={styles.goalPill}
                            onPress={() => router.push('/select-activity')}
                        >
                            <Text style={styles.goalText}>{userInfo.activity}</Text>
                            <MaterialCommunityIcons name={userInfo.activityIcon as any} size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: 10,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    editPhotoText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    formContainer: {
        paddingHorizontal: 20,
        gap: 15,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.card,
        borderRadius: 30,
        height: 60,
        paddingHorizontal: 20,
    },
    label: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    textInput: {
        backgroundColor: Colors.background,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
        minWidth: 150,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    tribePill: {
        flexDirection: 'row',
        backgroundColor: '#3D0C02',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
        gap: 8,
    },
    tribeAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ccc',
    },
    tribeText: {
        color: '#D22B2B',
        fontWeight: 'bold',
        fontSize: 14,
        fontStyle: 'italic',
    },
    toggleContainer: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#666',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    toggleActive: {
        backgroundColor: Colors.primary,
        alignItems: 'flex-end',
    },
    toggleInactive: {
        backgroundColor: '#666',
        alignItems: 'flex-start',
    },
    goalPill: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    goalText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
});
