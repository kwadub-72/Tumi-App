import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
    FlatList,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { ACTIVITIES } from '@/src/shared/constants/Activities';
import { Tribe, TribeType } from '@/src/shared/models/types';
import { SupabaseTribeService } from '@/src/shared/services/SupabaseTribeService';
import { useAuthStore } from '@/store/AuthStore';


export default function CreateTribeScreen() {
    const router = useRouter();
    const { mode, tribeId } = useLocalSearchParams();
    const isEditMode = mode === 'edit';

    const user = useUserStore();
    const { session } = useAuthStore();
    const { refreshMyTribes } = useUserTribeStore();

    // Form State
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isPrivate, setIsPrivate] = useState(false); // Default public
    const [naturalStatus, setNaturalStatus] = useState<boolean | null>(true); // true = Natural, false = Enhanced, null = No Restriction
    const [activity, setActivity] = useState(ACTIVITIES[0]); // Default first
    // Modals
    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Tribe data if in Edit Mode
    useEffect(() => {
        if (isEditMode && tribeId) {
            const loadTribe = async () => {
                setIsLoading(true);
                try {
                    const data = await SupabaseTribeService.getTribe(tribeId as string);
                    if (data) {
                        setName(data.name);
                        setAvatar(data.avatar);
                        setIsPrivate(data.privacy === 'private');
                        setNaturalStatus(data.naturalStatus ?? null);
                        
                        if (data.activityType) {
                            const act = ACTIVITIES.find(a => a.name === data.activityType);
                            if (act) setActivity(act);
                        }
                    }
                } catch (err) {
                    console.error('[CreateTribe.loadTribe]', err);
                } finally {
                    setIsLoading(false);
                }
            };
            loadTribe();
        }
    }, [isEditMode, tribeId]);

    const handleLeaveTribe = async () => {
        const userId = session?.user?.id;
        if (!userId || !tribeId) return;

        Alert.alert(
            'Leave Chribe & Resign',
            'Are you sure you want to leave this chribe? If other members exist, leadership will be auto-assigned to the longest-tenured member. If no other members exist, this chribe will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave & Resign',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await SupabaseTribeService.leaveTribe(userId, tribeId as string);
                            await refreshMyTribes(userId);
                            Alert.alert('Left Chribe', 'You have successfully resigned and left the chribe.', [
                                {
                                    text: 'OK',
                                    onPress: () => router.replace('/(tabs)')
                                }
                            ]);
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to leave chribe.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    // Helpers
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    // Strict validation trigger for Natural Status Switch/Segment
    const selectNaturalStatus = async (status: boolean | null) => {
        if (status === true) {
            // Condition A: Chief Verification Rule
            if (user.status !== 'natural') {
                Alert.alert(
                    'Verification Blocked',
                    'Only athletes with verified Natural status can establish or manage a Natural Chribe.'
                );
                return;
            }

            // Condition B: Active Membership Integrity Sweep (For Edit Modality)
            if (isEditMode && tribeId) {
                const eligible = await SupabaseTribeService.checkTribeNaturalEligibility(tribeId as string);
                if (!eligible) {
                    Alert.alert(
                        'Roster Violation',
                        'Cannot convert to a Natural Chribe while non-natural or unverified members belong to the roster.'
                    );
                    return;
                }
            }
        }
        setNaturalStatus(status);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Missing Information', 'Please enter a chribe name.');
            return;
        }

        const userId = session?.user?.id;
        if (!userId) {
            Alert.alert('Not signed in', 'Please sign in to continue.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditMode && tribeId) {
                // Secondary check for security on final submit
                if (naturalStatus === true) {
                    if (user.status !== 'natural') {
                        Alert.alert('Verification Blocked', 'Only athletes with verified Natural status can establish or manage a Natural Chribe.');
                        setIsSubmitting(false);
                        return;
                    }
                    const eligible = await SupabaseTribeService.checkTribeNaturalEligibility(tribeId as string);
                    if (!eligible) {
                        Alert.alert('Roster Violation', 'Cannot convert to a Natural Chribe while non-natural or unverified members belong to the roster.');
                        setIsSubmitting(false);
                        return;
                    }
                }

                const updated = await SupabaseTribeService.updateTribe({
                    tribeId: tribeId as string,
                    name: name.trim(),
                    avatarUrl: avatar,
                    privacy: isPrivate ? 'private' : 'public',
                    activityType: activity.name,
                    activityIcon: activity.icon as string,
                    naturalStatus: naturalStatus ?? undefined,
                });

                if (!updated) {
                    Alert.alert('Error', 'Failed to update chribe. Please try again.');
                    return;
                }

                await refreshMyTribes(userId);
                Alert.alert('Success', 'Chribe updated successfully!', [
                    { text: 'OK', onPress: () => router.push(`/tribe/${tribeId}`) }
                ]);
            } else {
                // Create Mode Condition A check
                if (naturalStatus === true && user.status !== 'natural') {
                    Alert.alert('Verification Blocked', 'Only athletes with verified Natural status can establish or manage a Natural Chribe.');
                    setIsSubmitting(false);
                    return;
                }

                const created = await SupabaseTribeService.createAndPersistTribe({
                    userId,
                    name: name.trim(),
                    avatarUrl: avatar,
                    tribeType: 'accountability',
                    privacy: isPrivate ? 'private' : 'public',
                    description: `A chribe for ${activity.name}.`,
                    activityType: activity.name,
                    activityIcon: activity.icon as string,
                    naturalStatus: naturalStatus ?? undefined,
                });

                if (!created) {
                    Alert.alert('Error', 'Failed to create chribe. Please try again.');
                    return;
                }

                // Forcefully inject and select the newly created Chribe locally to bypass any DB replication lag
                const store = useUserTribeStore.getState();
                store.createTribe(created);

                // Optionally refresh in the background, but proceed to navigate immediately
                store.refreshMyTribes(userId).catch(console.error);
                router.push('/(tabs)');
            }
        } catch (err: any) {
            console.error('[CreateTribe.handleSubmit]', err);
            Alert.alert('Error', err?.message ?? 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isEditMode ? 'Edit Chribe' : 'Create a Chribe'}
                    </Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView 
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Edit Symbol */}
                    <View style={styles.symbolSection}>
                        <TouchableOpacity style={styles.symbolCircle} onPress={pickImage}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.symbolImage} />
                            ) : (
                                <Ionicons name="people" size={40} color="rgba(237, 232, 213, 0.4)" />
                            )}
                            <View style={styles.editIconBadge}>
                                <MaterialCommunityIcons name="pencil" size={12} color="white" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.symbolText}>Edit chribe symbol</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Tribe Name */}
                        <View style={styles.fieldColumn}>
                            <Text style={styles.label}>Chribe name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter chribe name..."
                                placeholderTextColor="rgba(237, 232, 213, 0.3)"
                                maxLength={20}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Privacy Toggle */}
                        <View style={styles.fieldRow}>
                            <Text style={styles.label}>Privacy</Text>
                            <TouchableOpacity
                                style={[
                                    styles.switchContainer,
                                    isPrivate ? styles.switchActive : styles.switchInactive
                                ]}
                                onPress={() => setIsPrivate(!isPrivate)}
                            >
                                <Text style={styles.switchText}>{isPrivate ? 'Private' : 'Public'}</Text>
                                <View style={styles.switchKnob}>
                                    <Ionicons name={isPrivate ? "lock-closed" : "earth"} size={14} color={Colors.theme.matteBlack} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Natural / Enhanced Status Selector */}
                        <View style={styles.fieldColumn}>
                            <Text style={styles.label}>Natural status guardrail</Text>
                            <View style={styles.segmentedContainer}>
                                {[
                                    { label: 'Natural', value: true, icon: 'leaf' },
                                    { label: 'Enhanced', value: false, icon: 'lightning-bolt' },
                                    { label: 'No Restriction', value: null, icon: 'shield-off' }
                                ].map((opt) => {
                                    const isSelected = naturalStatus === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.label}
                                            style={[
                                                styles.segmentButton,
                                                isSelected && styles.segmentButtonActive
                                            ]}
                                            onPress={() => selectNaturalStatus(opt.value)}
                                        >
                                            <MaterialCommunityIcons 
                                                name={opt.icon as any} 
                                                size={14} 
                                                color={isSelected ? Colors.theme.matteBlack : Colors.theme.dust} 
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={[
                                                styles.segmentText,
                                                isSelected && styles.segmentTextActive
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Tribe Activity Dropdown */}
                        <View style={styles.fieldRow}>
                            <Text style={styles.label}>Chribe activity</Text>
                            <TouchableOpacity style={styles.pillSelector} onPress={() => setActivityModalVisible(true)}>
                                <Text style={styles.pillText}>{activity.name}</Text>
                                <MaterialCommunityIcons name={activity.icon as any} size={16} color={Colors.theme.harvestGold} />
                            </TouchableOpacity>
                        </View>
{isEditMode && (
                            <TouchableOpacity
                                style={styles.leaveTribeButton}
                                onPress={handleLeaveTribe}
                            >
                                <Ionicons name="exit-outline" size={16} color="#FF6B6B" style={{ marginRight: 6 }} />
                                <Text style={styles.leaveTribeButtonText}>Leave Chribe</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                {/* Bottom Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Colors.theme.matteBlack} />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>
                                    {isEditMode ? 'Save Changes' : 'Is that everything?'}
                                </Text>
                                <View style={styles.badgeCircle}>
                                    <MaterialCommunityIcons 
                                        name={isEditMode ? "check" : "plus"} 
                                        size={16} 
                                        color={Colors.theme.harvestGold} 
                                    />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Activity Selector Modal */}
                <Modal visible={activityModalVisible} transparent animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setActivityModalVisible(false)}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Chribe Activity</Text>
                            <FlatList
                                data={ACTIVITIES}
                                keyExtractor={item => item.name}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={styles.optionRow} 
                                        onPress={() => { setActivity(item); setActivityModalVisible(false); }}
                                    >
                                        <Text style={styles.optionText}>{item.name}</Text>
                                        <MaterialCommunityIcons name={item.icon as any} size={20} color={Colors.theme.harvestGold} />
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>

            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#262525', // Deep Charcoal
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#262525',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: '#1A1A1A',
        borderBottomWidth: 1,
        borderBottomColor: '#262525',
    },
    headerTitle: {
        color: '#DAA520', // Harvest Gold
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        paddingBottom: 120,
        alignItems: 'center',
        paddingTop: 20,
    },
    symbolSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    symbolCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1A1A1A',
        borderWidth: 2,
        borderColor: '#DAA520',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    symbolImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    editIconBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#DAA520',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1A1A1A',
    },
    symbolText: {
        color: '#EDE8D5',
        fontWeight: '600',
        fontSize: 14,
    },
    form: {
        width: '100%',
        paddingHorizontal: 20,
        gap: 20,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A1A', // Matte Black
        borderRadius: 20,
        height: 64,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
    },
    fieldColumn: {
        backgroundColor: '#1A1A1A', // Matte Black
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
        gap: 8,
    },
    label: {
        color: '#DAA520', // Harvest Gold
        fontSize: 15,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#262525',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        fontSize: 15,
        color: '#FFFFFF', // Soft White Text
        fontWeight: '500',
        borderWidth: 1,
        borderColor: '#DAA520', // Harvest Gold Active Border
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
    },
    switchActive: {
        backgroundColor: 'rgba(218, 165, 32, 0.2)',
        borderColor: '#DAA520',
    },
    switchInactive: {
        backgroundColor: '#262525',
        borderColor: 'rgba(237, 232, 213, 0.2)',
    },
    switchText: {
        color: '#EDE8D5',
        fontSize: 13,
        fontWeight: 'bold',
    },
    switchKnob: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#DAA520',
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#262525',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    segmentButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    segmentButtonActive: {
        backgroundColor: '#DAA520',
    },
    segmentText: {
        color: '#EDE8D5',
        fontSize: 12,
        fontWeight: 'bold',
    },
    segmentTextActive: {
        color: '#1A1A1A',
    },
    pillSelector: {
        flexDirection: 'row',
        backgroundColor: '#262525',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
        minWidth: 150,
        justifyContent: 'space-between',
    },
    pillSelectorDisabled: {
        opacity: 0.6,
        borderColor: 'rgba(237, 232, 213, 0.1)',
    },
    pillText: {
        color: '#EDE8D5',
        fontWeight: '600',
        fontSize: 14,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        backgroundColor: '#DAA520', // Harvest Gold
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    submitButtonText: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    badgeCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#1A1A1A',
        borderColor: '#DAA520',
        borderWidth: 1,
        borderRadius: 24,
        padding: 20,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DAA520',
        marginBottom: 15,
        textAlign: 'center',
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.1)',
    },
    optionText: {
        fontSize: 15,
        color: '#EDE8D5',
        fontWeight: '600',
    },
    compSection: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#DAA520',
        marginBottom: 5,
    },
    sectionSubHeader: {
        fontSize: 13,
        color: '#EDE8D5',
        opacity: 0.6,
        fontStyle: 'italic',
        marginBottom: 10,
        marginTop: 5,
    },
    compCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.1)',
    },
    compCardSelected: {
        borderColor: '#DAA520',
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    compCardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    compCardHeader: {
        fontSize: 11,
        color: '#DAA520',
        textTransform: 'uppercase',
        marginBottom: 2,
        fontWeight: '700',
    },
    compCardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    compCardDesc: {
        color: '#EDE8D5',
        opacity: 0.8,
        fontSize: 13,
        marginTop: 10,
        lineHeight: 18,
    },
    leaveTribeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FF6B6B',
        borderRadius: 16,
        paddingVertical: 14,
        marginTop: 20,
        marginBottom: 10,
        backgroundColor: 'rgba(255, 107, 107, 0.05)',
    },
    leaveTribeButtonText: {
        color: '#FF6B6B',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
