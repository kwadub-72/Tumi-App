import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Switch,
    Image,
    Alert,
    Modal,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { ACTIVITIES } from '@/src/shared/constants/Activities';
import { Tribe, TribeType } from '@/src/shared/models/types';
import EditCompetitionModal, { CompetitionConfig } from '@/src/features/tribes/components/EditCompetitionModal';

// Constants
const COLORS = [
    '#9FB89F', // Light Sage
    '#3E0000', // Dark Brown
    '#E6A8A8', // Pink
    '#007AFF', // Blue
    '#F5DEB3', // Wheat
    '#D2691E', // Chocolate
    '#556B2F', // Olive
    '#800080', // Purple
];

const FOCUS_OPTIONS: { label: string; value: TribeType; icon: string }[] = [
    { label: 'Accountability', value: 'accountability', icon: 'calendar' },
    { label: 'Head-to-Head', value: 'head-to-head', icon: 'trophy-outline' },
    { label: 'Tribe Battle', value: 'tribe-vs-tribe', icon: 'trophy-variant-outline' }
];

export default function CreateTribeScreen() {
    const router = useRouter();
    const user = useUserStore();
    const { createTribe } = useUserTribeStore();

    // Form Stats
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isPrivate, setIsPrivate] = useState(false); // Default public
    const [isNatural, setIsNatural] = useState(true);
    const [activity, setActivity] = useState(ACTIVITIES[0]); // Default first
    const [focus, setFocus] = useState(FOCUS_OPTIONS[0]); // Default Accountability

    // Visibilities
    const [mealVis, setMealVis] = useState<'public' | 'private' | 'tribe'>('public');
    const [workoutVis, setWorkoutVis] = useState<'public' | 'private' | 'tribe'>('public');
    const [macroVis, setMacroVis] = useState<'public' | 'private' | 'tribe'>('public');

    // Modals
    const [colorModalVisible, setColorModalVisible] = useState(false);
    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [focusModalVisible, setFocusModalVisible] = useState(false);

    // Competition State
    const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
    const [compConfigs, setCompConfigs] = useState<Record<string, CompetitionConfig>>({});
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingComp, setEditingComp] = useState<{ id: string, title: string, subtitle: string } | null>(null);

    const openCompEdit = (id: string, type: string, subtype: string) => {
        setSelectedCompId(id);
        const config = compConfigs[id];
        setEditingComp({ id, title: `${type} · Head-to-Head`, subtitle: subtype });
        setEditModalVisible(true);
    };

    const saveCompConfig = (cfg: CompetitionConfig) => {
        if (editingComp) {
            setCompConfigs(prev => ({ ...prev, [editingComp.id]: cfg }));
        }
        // Modal handles closing via separate prop if needed, or we close here?
        // EditCompetitionModal calls onSave then onClose.
        // But onClose prop needs to set visible false.
        setEditModalVisible(false);
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

    const handleCreate = () => {
        if (!name.trim()) {
            Alert.alert('Missing Information', 'Please enter a tribe name.');
            return;
        }
        if (!color) {
            Alert.alert('Missing Information', 'Please select a tribe color.');
            return;
        }

        const newTribe: Tribe = {
            id: `t_${Date.now()}`,
            name,
            avatar: avatar || 'https://i.pravatar.cc/150?u=999', // Fallback
            themeColor: color,
            type: focus.value,
            privacy: isPrivate ? 'private' : 'public',
            memberCount: 1,
            description: `A ${focus.label} tribe for ${activity.name}.`,
            joinStatus: 'joined',
            chief: {
                id: user.handle,
                name: user.name,
                handle: user.handle,
                avatar: user.avatar,
                verified: user.status !== 'none',
                status: user.status,
                activity: user.activity,
                activityIcon: user.activityIcon,
                height: user.height,
                weight: user.weight,
                bfs: user.bfs,
                tribe: user.tribe,
                tribeAvatar: user.tribeAvatar,
                stats: { meals: 0, workouts: 0, updates: 0 }
            },
            tags: isNatural ? ['natural'] : [],
            activity: activity.name,
            activityIcon: activity.icon,
            naturalStatus: isNatural,
            visibility: {
                meal: mealVis,
                workout: workoutVis,
                macro: macroVis
            }
        };

        createTribe(newTribe);
        router.back(); // Return to previous screen (Explore or Home? Prompt says "returned to the feed screen with the newly created tribe's feed selected")
        // My createTribe action updates 'selectedTribe', so if I go to Home ('/'), it should show the tribe feed.
        // But if I came from Explore tab, router.back() goes to Explore.
        // Prompt: "After pressing, this they should be returned to the feed screen with the newly created tribe’s feed selected."
        // So I should navigate to Home and ensure Tribe tab is active.
        // I'll use router.navigate('/(tabs)') which goes to index.
        // And I need to ensure the Tribe tab is selected on Home screen.
        // The Home screen uses local state for tab. I might need to pass a param or update store to trigger tab switch.
        // But for now, I'll just go back. Wait, "returned to the feed screen".
        // I'll try router.replace('/(tabs)') or similar.
        // But router.dismissAll() might be better if stack is deep.
        // I'll use router.push('/(tabs)') to be safe and force Home.
        router.push('/(tabs)');
    };

    // Modals related state already defined above.

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Edit Symbol */}
                <View style={styles.symbolSection}>
                    <TouchableOpacity style={styles.symbolCircle} onPress={pickImage}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.symbolImage} />
                        ) : (
                            <Ionicons name="person" size={40} color="rgba(79, 99, 82, 0.5)" />
                        )}
                        <View style={styles.editIconBadge}>
                            <MaterialCommunityIcons name="pencil" size={12} color="white" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.symbolText}>Edit tribe symbol</Text>
                </View>

                <View style={styles.form}>
                    {/* Tribe Name */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tribe name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter name..."
                            placeholderTextColor="rgba(79, 99, 82, 0.5)"
                            maxLength={20}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    {/* Tribe Color */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tribe color</Text>
                        <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setColorModalVisible(true)}>
                            {color ? (
                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color }} />
                            ) : (
                                <Text style={{ color: 'rgba(79, 99, 82, 0.5)' }}>Select color...</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Privacy */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Privacy</Text>
                        {/* Custom Switch: Public (Globe) vs Private (Lock) */}
                        <TouchableOpacity
                            style={[
                                styles.switchContainer,
                                isPrivate ? { backgroundColor: '#666', alignItems: 'flex-start' } : { backgroundColor: Colors.primary, alignItems: 'flex-end' }
                            ]}
                            onPress={() => setIsPrivate(!isPrivate)}
                        >
                            <View style={styles.switchKnob}>
                                <Ionicons name={isPrivate ? "lock-closed" : "earth"} size={14} color={isPrivate ? "#666" : Colors.primary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Natural/Enhanced */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Natural/Enhanced status</Text>
                        <TouchableOpacity
                            style={[
                                styles.switchContainer,
                                !isNatural ? { backgroundColor: '#FFD700', alignItems: 'flex-end' } : { backgroundColor: Colors.success, alignItems: 'flex-end' }
                            ]}
                            onPress={() => setIsNatural(!isNatural)}
                        >
                            <View style={styles.switchKnob}>
                                {isNatural ? (
                                    <MaterialCommunityIcons name="leaf" size={14} color={Colors.success} />
                                ) : (
                                    <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFD700" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Tribe Activity */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tribe activity</Text>
                        <TouchableOpacity style={styles.pillSelector} onPress={() => setActivityModalVisible(true)}>
                            <Text style={styles.pillText}>{activity.name}</Text>
                            <MaterialCommunityIcons name={activity.icon as any} size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tribe Focus */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tribe focus</Text>
                        <TouchableOpacity style={styles.pillSelector} onPress={() => setFocusModalVisible(true)}>
                            <Text style={styles.pillText}>{focus.label}</Text>
                            <MaterialCommunityIcons name={focus.icon as any} size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Competition Style (Conditional) */}
                    {(focus.value === 'head-to-head' || focus.value === 'tribe-vs-tribe') && (
                        <View style={styles.compSection}>
                            <Text style={styles.sectionHeader}>Competition style</Text>

                            <Text style={styles.sectionSubHeader}>Traditional</Text>
                            <CompetitionCard
                                type="Traditional"
                                subtype="Habits"
                                description="Compete against fellow tribe members in weekly 1-on-1 matchups. Points are awarded or deducted based on daily proximity to macro targets and/or completed exercise sessions. The user with the higher weekly point total wins their matchup. An elimination-style tournament determines the Tribe Champion. Meal photos and post-workout photos must be submitted for verification."
                                isSelected={selectedCompId === 'trad_habits'}
                                onPress={() => openCompEdit('trad_habits', 'Traditional', 'Habits')}
                            />
                            <CompetitionCard
                                type="Traditional"
                                subtype="Weight change"
                                description="Compete against fellow tribe members in weekly matchups. Users log daily weight with scale photos for verification. Each week, the user with the greater percentage change in bodyweight—either loss or gain, depending on the tribe's setting—wins their matchup. An elimination-style tournament determines the Tribe Champion."
                                isSelected={selectedCompId === 'trad_weight'}
                                onPress={() => openCompEdit('trad_weight', 'Traditional', 'Weight change')}
                            />

                            <Text style={styles.sectionSubHeader}>Premier</Text>
                            <CompetitionCard
                                type="Premier"
                                subtype="Habits"
                                description="Compete against fellow tribe members over a fixed competition period. Points are awarded or deducted based on daily proximity to macro targets and/or completed exercise sessions. The user with the highest total points at the end of the competition period is crowned Tribe Champion. Meal photos and post-workout photos must be submitted for verification."
                                isSelected={selectedCompId === 'prem_habits'}
                                onPress={() => openCompEdit('prem_habits', 'Premier', 'Habits')}
                            />
                            <CompetitionCard
                                type="Premier"
                                subtype="Weight change"
                                description="Compete against fellow tribe members over a fixed competition period. Users log daily weight with scale photos for verification. Weekly weight is calculated as the average of daily weigh-ins from Sunday through Saturday. The user with the greatest percent bodyweight change—either loss or gain, depending on the tribe's setting, at the end of the competition period is crowned Tribe Champion."
                                isSelected={selectedCompId === 'prem_weight'}
                                onPress={() => openCompEdit('prem_weight', 'Premier', 'Weight change')}
                            />
                        </View>
                    )}

                    {/* Visibilities */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Meal visibility</Text>
                        <TouchableOpacity
                            style={[styles.switchContainer, mealVis === 'public' ? { backgroundColor: Colors.primary, alignItems: 'flex-end' } : { backgroundColor: '#666', alignItems: 'flex-start' }]}
                            onPress={() => setMealVis(mealVis === 'public' ? 'private' : 'public')}
                        >
                            <View style={styles.switchKnob}>
                                <Ionicons name={mealVis === 'public' ? "earth" : "lock-closed"} size={14} color={mealVis === 'public' ? Colors.primary : '#666'} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Workout visibility</Text>
                        <TouchableOpacity
                            style={[styles.switchContainer, workoutVis === 'public' ? { backgroundColor: Colors.primary, alignItems: 'flex-end' } : { backgroundColor: '#666', alignItems: 'flex-start' }]}
                            onPress={() => setWorkoutVis(workoutVis === 'public' ? 'private' : 'public')}
                        >
                            <View style={styles.switchKnob}>
                                <Ionicons name={workoutVis === 'public' ? "earth" : "lock-closed"} size={14} color={workoutVis === 'public' ? Colors.primary : '#666'} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Macro visibility</Text>
                        <TouchableOpacity
                            style={[styles.switchContainer, macroVis === 'public' ? { backgroundColor: Colors.primary, alignItems: 'flex-end' } : { backgroundColor: '#666', alignItems: 'flex-start' }]}
                            onPress={() => setMacroVis(macroVis === 'public' ? 'private' : 'public')}
                        >
                            <View style={styles.switchKnob}>
                                <Ionicons name={macroVis === 'public' ? "earth" : "lock-closed"} size={14} color={macroVis === 'public' ? Colors.primary : '#666'} />
                            </View>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                    <Text style={styles.createButtonText}>Is that everything?</Text>
                    <View style={styles.plusBadge}>
                        <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <Modal visible={colorModalVisible} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setColorModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Color</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' }}>
                            {COLORS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorSelected]}
                                    onPress={() => { setColor(c); setColorModalVisible(false); }}
                                />
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={activityModalVisible} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setActivityModalVisible(false)}>
                    <View style={[styles.modalContent, { height: '60%' }]}>
                        <Text style={styles.modalTitle}>Select Activity</Text>
                        <FlatList
                            data={ACTIVITIES}
                            keyExtractor={item => item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.optionRow} onPress={() => { setActivity(item); setActivityModalVisible(false); }}>
                                    <Text style={styles.optionText}>{item.name}</Text>
                                    <MaterialCommunityIcons name={item.icon as any} size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={focusModalVisible} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setFocusModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Focus</Text>
                        {FOCUS_OPTIONS.map(opt => (
                            <TouchableOpacity key={opt.value} style={styles.optionRow} onPress={() => { setFocus(opt); setFocusModalVisible(false); }}>
                                <Text style={styles.optionText}>{opt.label}</Text>
                                <MaterialCommunityIcons name={opt.icon as any} size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Competition Modal */}
            <EditCompetitionModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                title={editingComp?.title || ''}
                subtitle={editingComp?.subtitle || ''}
                initialConfig={editingComp ? compConfigs[editingComp.id] : undefined}
                onSave={saveCompConfig}
            />
        </SafeAreaView>
    );
}

// Helper Component for Competition Card
const CompetitionCard = ({
    type,
    subtype,
    description,
    isSelected,
    onPress
}: {
    type: string,
    subtype: string,
    description: string,
    isSelected: boolean,
    onPress: () => void
}) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <TouchableOpacity
            style={[styles.compCard, isSelected && styles.compCardSelected]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Text style={styles.compCardHeader}>{type} · Head-to-Head</Text>
            <Text style={styles.compCardTitle}>{subtype}</Text>
            <TouchableOpacity onPress={() => setExpanded(!expanded)} hitSlop={10} style={{ padding: 5 }}>
                <MaterialCommunityIcons name="dots-horizontal" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            {expanded && (
                <Text style={styles.compCardDesc}>{description}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5DC', // Beige background
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
    },
    content: {
        paddingBottom: 100,
        alignItems: 'center',
    },
    symbolSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    symbolCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E8F0E5',
        borderWidth: 2,
        borderColor: Colors.primary,
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
        backgroundColor: Colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F5F5DC',
    },
    symbolText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    form: {
        width: '100%',
        paddingHorizontal: 20,
        gap: 15,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(79, 99, 82, 0.2)', // Light green card
        borderRadius: 30,
        height: 60,
        paddingHorizontal: 20,
    },
    label: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#E8F0E5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        minWidth: 150,
        textAlign: 'center',
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.3)',
    },
    switchContainer: {
        width: 50,
        height: 30,
        borderRadius: 15,
        padding: 2,
        justifyContent: 'center',
    },
    switchKnob: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    pillSelector: {
        flexDirection: 'row',
        backgroundColor: '#E8F0E5',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.3)',
        minWidth: 150,
        justifyContent: 'space-between',
    },
    pillText: {
        color: Colors.primary,
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
    createButton: {
        backgroundColor: Colors.background, // Or transparent with border?
        // Prompt image 2 bottom button looks like a pill with "Found a tribe" + (+) icon.
        // Wait, Image 2 bottom says "At the bottom of the screen is the add tribe button".
        // The user says "when the user is content, they can press this to finish creating the tribe."
        // I'll style it to look clickable.
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    createButtonText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    plusBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E8F0E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#F5F5DC',
        borderRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 20,
        textAlign: 'center',
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    colorSelected: {
        borderWidth: 3,
        borderColor: 'white',
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    optionText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
    compSection: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4F6352',
        marginBottom: 5,
    },
    sectionSubHeader: {
        fontSize: 14,
        color: '#4F6352',
        fontStyle: 'italic',
        marginBottom: 10,
        marginTop: 5,
    },
    compCard: {
        backgroundColor: '#9FB89F', // Light green
        borderRadius: 20,
        padding: 15,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    compCardSelected: {
        backgroundColor: '#4F6352', // Darker green
        borderColor: '#2F3A27',
    },
    compCardHeader: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
        marginBottom: 5,
        fontWeight: '600',
        textAlign: 'center',
    },
    compCardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 5,
    },
    compCardDesc: {
        color: 'white',
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 20,
    },
});
