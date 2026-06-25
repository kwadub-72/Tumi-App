import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';
import { useRouter } from 'expo-router';
import { CustomSwitch } from '@/components/ui/CustomSwitch';
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
    Alert,
    Modal,
    FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/shared/theme/Colors';
import { PostStore } from '@/store/PostStore';
import { useUserStore } from '@/store/UserStore';
import { useAuthStore } from '@/store/AuthStore';
import { supabase } from '@/src/shared/services/supabase';
import { decode } from 'base64-arraybuffer';
import TribeSelectionModal from '@/src/features/home/components/TribeSelectionModal';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { MetricNormalizer } from '@/src/shared/utils/MetricNormalizer';

export default function EditProfileScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const { setProfile } = userInfo;

    // Form State
    const authProfile = useAuthStore(state => state.profile);
    const [firstName, setFirstName] = useState(authProfile?.first_name || '');
    const [lastName, setLastName] = useState(authProfile?.last_name || '');
    const [displayName, setDisplayName] = useState(userInfo.name);
    const [avatarUrl, setAvatarUrl] = useState(userInfo.avatar);
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [bio, setBio] = useState(userInfo.bio);
    const [height, setHeight] = useState(() => {
        const raw = userInfo.height || '';
        if (!raw) return '';
        
        let heightCm = 0;
        if (raw.includes("'")) {
            const match = raw.match(/(\d+)'(\d+)/);
            if (match) {
                const feet = parseInt(match[1], 10);
                const inches = parseInt(match[2], 10);
                heightCm = Math.round((feet * 30.48) + (inches * 2.54));
            }
        } else {
            const clean = raw.replace(' cm', '').trim();
            const cmVal = parseFloat(clean);
            if (!isNaN(cmVal)) {
                heightCm = Math.round(cmVal);
            }
        }
        
        if (heightCm <= 0) return '';
        
        if (userInfo.units === 'imperial') {
            const { feet, inches } = MetricNormalizer.cmToImperial(heightCm);
            return `${feet}'${inches}`;
        } else {
            return `${heightCm} cm`;
        }
    });
    const [bodyFat, setBodyFat] = useState(userInfo.bfs);
    const [isHeightModalVisible, setIsHeightModalVisible] = useState(false);
    const [isTribeModalVisible, setIsTribeModalVisible] = useState(false);
    
    const { selectedTribe } = useUserTribeStore();
    
    // Imperial specific state
    const [tempFeet, setTempFeet] = useState(6);
    const [tempInches, setTempInches] = useState(3);
    
    const [profileVisible, setProfileVisible] = useState(!userInfo.isPrivate);
    const [mealVisible, setMealVisible] = useState(userInfo.showMeals ?? false);
    const [workoutVisible, setWorkoutVisible] = useState(userInfo.showWorkouts ?? false);
    const [macroVisible, setMacroVisible] = useState(userInfo.showMacros ?? false);
    const [likeVisible, setLikeVisible] = useState(userInfo.showLikes ?? false);
    const [measurementsVisible, setMeasurementsVisible] = useState(userInfo.showMeasurements ?? false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setAvatarUrl(result.assets[0].uri);
            setAvatarBase64(result.assets[0].base64 || null);
        }
    };

    const handleSave = async () => {
        if (!firstName || firstName.trim().length === 0) {
            Alert.alert('Error', 'First Name cannot be empty');
            return;
        }
        if (!lastName || lastName.trim().length === 0) {
            Alert.alert('Error', 'Last Name cannot be empty');
            return;
        }
        if (!displayName || displayName.trim().length === 0) {
            Alert.alert('Error', 'Display Name cannot be empty');
            return;
        }
        if (displayName.length > 10) {
            Alert.alert('Error', 'Display Name cannot exceed 10 characters');
            return;
        }
        try {
            let finalAvatarUrl = avatarUrl;
            
            if (avatarBase64) {
                Alert.alert('Uploading...', 'Uploading profile photo');
                
                const arrayBuffer = decode(avatarBase64);
                
                const fileExt = avatarUrl.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}.${fileExt}`;
                const userId = useAuthStore.getState().session?.user?.id;
                
                if (!userId) throw new Error("Not authenticated");
                
                const filePath = `${userId}/${fileName}`;
                
                const { data, error } = await supabase.storage
                     .from('avatars')
                     .upload(filePath, arrayBuffer, {
                         contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                         upsert: true
                     });
                     
                if (error) {
                     throw error;
                }
                
                const { data: publicUrlData } = supabase.storage
                     .from('avatars')
                     .getPublicUrl(filePath);
                     
                finalAvatarUrl = publicUrlData.publicUrl;
            }
            let heightCm: number | null = null;
            if (height) {
                if (userInfo.units === 'imperial') {
                    const match = height.match(/(\d+)'(\d+)/);
                    if (match) {
                        const feet = parseInt(match[1], 10);
                        const inches = parseInt(match[2], 10);
                        heightCm = Math.round((feet * 30.48) + (inches * 2.54));
                    }
                } else {
                    const clean = height.replace(' cm', '').trim();
                    const cmVal = parseInt(clean, 10);
                    if (!isNaN(cmVal)) {
                        heightCm = cmVal;
                    }
                }
            }

            // Sync to backend via AuthStore
            await useAuthStore.getState().updateProfile({
                name: displayName,
                first_name: firstName,
                last_name: lastName,
                avatar_url: finalAvatarUrl ? (typeof finalAvatarUrl === 'string' ? finalAvatarUrl : undefined) : undefined,
                bio,
                height,
                height_cm: heightCm,
                body_fat_pct: bodyFat,
                activity: userInfo.activity,
                activity_icon: userInfo.activityIcon,
                is_private: !profileVisible,
                show_meals_to_public: mealVisible,
                show_workouts_to_public: workoutVisible,
                show_macros_to_public: macroVisible,
                show_likes_to_public: likeVisible,
                show_measurements_to_public: measurementsVisible,
            });

            // Update UserStore - this will now trigger PostStore.updateUser automatically
            await setProfile({
                name: displayName,
                avatar: finalAvatarUrl ? (typeof finalAvatarUrl === 'string' ? finalAvatarUrl : finalAvatarUrl) : undefined,
                bio,
                height,
                bfs: bodyFat,
                activity: userInfo.activity,
                activityIcon: userInfo.activityIcon,
                isPrivate: !profileVisible,
                showMeals: mealVisible,
                showWorkouts: workoutVisible,
                showMacros: macroVisible,
                showLikes: likeVisible,
                showMeasurements: measurementsVisible,
            });

            Alert.alert('Success', 'Profile updated successfully');
            router.back();
        } catch (error) {
            console.error('Failed to save profile', error);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const handleHeightPress = () => {
        if (userInfo.units === 'imperial') {
            // Parse current height like "6'3"
            const match = height.match(/(\d+)'(\d+)/);
            if (match) {
                setTempFeet(parseInt(match[1]));
                setTempInches(parseInt(match[2]));
            }
            setIsHeightModalVisible(true);
        }
    };

    const saveImperialHeight = () => {
        setHeight(`${tempFeet}'${tempInches}`);
        setIsHeightModalVisible(false);
    };

    const renderRolodex = (data: number[], selectedValue: number, onValueChange: (val: number) => void, unit: string) => {
        return (
            <View style={styles.rolodexColumn}>
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.toString()}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={40}
                    decelerationRate="fast"
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => onValueChange(item)}
                            style={[styles.rolodexItem, selectedValue === item && styles.rolodexItemSelected]}
                        >
                            <Text style={[styles.rolodexText, selectedValue === item && styles.rolodexTextSelected]}>
                                {item}{unit}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingVertical: 80 }}
                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                    initialScrollIndex={Math.max(0, data.indexOf(selectedValue))}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Height Modal */}
            <Modal
                visible={isHeightModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsHeightModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1} 
                    onPress={() => setIsHeightModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Height</Text>
                        <View style={styles.rolodexContainer}>
                            {renderRolodex(Array.from({ length: 5 }, (_, i) => i + 3), tempFeet, setTempFeet, "'")}
                            {renderRolodex(Array.from({ length: 12 }, (_, i) => i), tempInches, setTempInches, '"')}
                        </View>
                        <TouchableOpacity style={styles.doneButton} onPress={saveImperialHeight}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            
            <TribeSelectionModal 
                visible={isTribeModalVisible} 
                onClose={() => setIsTribeModalVisible(false)} 
            />

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
                        {avatarUrl ? (
                            <Image
                                source={{ uri: avatarUrl }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Ionicons name="person" size={60} color={Colors.theme.dust} />
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage}>
                        <Text style={styles.editPhotoText}>Edit photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>

                    {/* Display Name */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={displayName}
                            onChangeText={setDisplayName}
                            maxLength={10}
                        />
                    </View>

                    {/* First Name */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="First Name"
                        />
                    </View>

                    {/* Last Name */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Last Name"
                        />
                    </View>

                    {/* Bio */}
                    <View style={styles.bioFieldColumn}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={styles.bioTextInput}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            maxLength={60}
                            placeholder="Enter bio..."
                            placeholderTextColor="#A0A0A0"
                        />
                    </View>

                    {/* Measurements */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Height</Text>
                        {userInfo.units === 'imperial' ? (
                            <TouchableOpacity style={styles.heightDisplay} onPress={handleHeightPress}>
                                <Text style={styles.heightDisplayText}>{height}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.metricInputContainer}>
                                <TextInput
                                    style={styles.textInput}
                                    value={height.replace(' cm', '')}
                                    onChangeText={(val) => {
                                        const clean = val.replace(/[^0-9]/g, '');
                                        setHeight(clean ? `${clean} cm` : '');
                                    }}
                                    keyboardType="number-pad"
                                    placeholder="cm"
                                />
                                <Text style={styles.unitSuffix}>cm</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Body fat %</Text>
                        <TextInput
                            style={styles.textInput}
                            value={bodyFat}
                            onChangeText={(val) => {
                                // Allow only numbers and a single decimal point
                                const clean = val.replace(/[^0-9.]/g, '');
                                // Prevent multiple decimal points
                                if ((clean.match(/\./g) || []).length <= 1) {
                                    setBodyFat(clean);
                                }
                            }}
                            keyboardType="decimal-pad"
                            placeholder="e.g. 8%"
                            textAlign="center"
                        />
                    </View>

                    {/* Tribe Displayed */}
                    <View style={styles.tribeFieldColumn}>
                        <Text style={styles.label}>Tribe displayed</Text>
                        <TouchableOpacity 
                            style={[styles.tribePill, selectedTribe ? { backgroundColor: selectedTribe.themeColor } : {}]} 
                            onPress={() => setIsTribeModalVisible(true)}
                        >
                            <Image
                                source={selectedTribe && selectedTribe.avatar 
                                    ? { uri: typeof selectedTribe.avatar === 'string' ? selectedTribe.avatar : selectedTribe.avatar.uri } 
                                    : { uri: userInfo.tribeAvatar || 'https://via.placeholder.com/150' }}
                                style={styles.tribeAvatar}
                            />
                            <Text style={[styles.tribeText, { color: 'white' }]}>
                                {selectedTribe ? selectedTribe.name : 'Join a Tribe'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Account Privacy */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Account privacy</Text>
                        <CustomSwitch
                            value={profileVisible}
                            onValueChange={(val) => {
                                setProfileVisible(val);
                                setMealVisible(val);
                                setWorkoutVisible(val);
                                setMacroVisible(val);
                                setLikeVisible(val);
                            }}
                        />
                    </View>

                    <Text style={styles.sectionHeader}>Non-tribe member visibility</Text>

                    {/* Measurements */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Measurements</Text>
                        <CustomSwitch
                            value={measurementsVisible}
                            onValueChange={setMeasurementsVisible}
                        />
                    </View>


                    {/* Activity */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Activity</Text>
                        <TouchableOpacity
                            style={styles.goalPill}
                            onPress={() => router.push('/select-activity')}
                        >
                            <Text style={styles.goalText}>{userInfo.activity}</Text>
                            <ActivityIcon 
                                activity={userInfo.activity} 
                                icon={userInfo.activityIcon} 
                                size={16} 
                            />
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
    placeholderAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
        flex: 1, 
        maxWidth: 150, 
        textAlign: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    bioFieldColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        backgroundColor: Colors.card,
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
    },
    bioTextInput: {
        backgroundColor: Colors.background,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
        width: '100%',
        minHeight: 100,
        textAlignVertical: 'top',
        textAlign: 'left',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    tribeFieldColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: Colors.card,
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
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
    sectionHeader: {
        color: '#666',
        fontSize: 14,
        marginTop: 10,
        marginBottom: -5,
        marginLeft: 5,
    },
    // Height Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: Colors.background,
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 20,
    },
    rolodexContainer: {
        flexDirection: 'row',
        height: 200,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 20,
    },
    rolodexColumn: {
        flex: 1,
        alignItems: 'center',
    },
    rolodexItem: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    rolodexItemSelected: {
        backgroundColor: Colors.card,
        borderRadius: 10,
    },
    rolodexText: {
        fontSize: 18,
        color: '#999',
    },
    rolodexTextSelected: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 22,
    },
    doneButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    doneButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    heightDisplay: {
        backgroundColor: Colors.background,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        minWidth: 150,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    heightDisplayText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    metricInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unitSuffix: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
