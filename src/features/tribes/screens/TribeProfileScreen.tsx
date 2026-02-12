import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Tribe, FeedPost } from '@/src/shared/models/types';
import { generateFakeTribes, generateFakePosts } from '@/src/shared/utils/FakeDataGenerator';
import TribePost from '../components/TribePost';
import { CalendarIcon, ShieldVSIcon, TrophyTribeIcon, PrivacyIcon } from '../components/TribeIcons';
import TribeInfoModal from '../components/TribeInfoModal';
import { useUserTribeStore } from '@/src/store/UserTribeStore';

// Helper to darken color (shared)
function darkenColor(hex: string, amount: number) {
    if (hex.toUpperCase() === '#DEA5A4' || hex.toUpperCase() === '#E6A8A8') return '#5D4037';
    if (hex.toUpperCase() === '#9FB89F') return '#2F3A27';
    if (hex.toUpperCase() === '#007AFF') return '#004080';
    if (hex.toUpperCase() === '#3E0000') return '#1A0000';
    return '#333333';
}

export default function TribeProfileScreen({ tribeId }: { tribeId: string }) {
    const router = useRouter();
    const { isMember, isRequested, joinTribe, leaveTribe } = useUserTribeStore();

    // Local state for the tribe data (mock fetch)
    const [tribe, setTribe] = useState<Tribe | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [cardColor, setCardColor] = useState('#333');

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<any>({});

    useEffect(() => {
        const allTribes = generateFakeTribes();
        const t = allTribes.find(tr => tr.id === tribeId);
        if (t) {
            setTribe(t);
            setCardColor(darkenColor(t.themeColor, 40));
            setPosts(generateFakePosts(10));
        }
    }, [tribeId]);

    if (!tribe) return <View style={{ flex: 1, backgroundColor: 'black' }} />;

    const isUserMember = isMember(tribe.id);
    const isUserRequested = isRequested(tribe.id);
    const isPrivate = tribe.privacy === 'private';
    const canView = !isPrivate || isUserMember;

    const handleJoinPress = () => {
        if (isUserMember) {
            // Leave logic
            Alert.alert(
                "Leave Tribe",
                "Are you sure you want to leave this tribe?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Leave", style: "destructive", onPress: () => leaveTribe(tribe.id) }
                ]
            );
            return;
        }

        if (isUserRequested) {
            // Cancel request logic?
            Alert.alert(
                "Cancel Request",
                "Do you want to cancel your join request?",
                [
                    { text: "No", style: "cancel" },
                    { text: "Yes", style: "destructive", onPress: () => leaveTribe(tribe.id) }
                ]
            );
            return;
        }

        // Join
        joinTribe(tribe);
        if (isPrivate) {
            Alert.alert("Requested", "Your request to join has been sent.");
        }
    };

    const openModal = (config: any) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const renderTypeIcon = () => {
        switch (tribe.type) {
            case 'accountability':
                return <CalendarIcon onPress={() => openModal({
                    title: 'Accountability',
                    description: 'Tribe focused on keeping members on track.',
                    type: 'icon-title',
                    iconName: 'calendar'
                })} />;
            case 'head-to-head':
                return <ShieldVSIcon onPress={() => openModal({
                    title: 'Head-to-Head',
                    description: 'Tribe members compete against each other.',
                    type: 'icon-title',
                    iconName: 'shield-outline'
                })} />;
            case 'tribe-vs-tribe':
                return <TrophyTribeIcon onPress={() => openModal({
                    title: 'Tribe vs Tribe',
                    description: 'Compete against other tribes.',
                    type: 'icon-title',
                    iconName: 'trophy-outline'
                })} />;
            default: return null;
        }
    };

    const renderMemberButton = () => {
        if (isUserMember) {
            return (
                <TouchableOpacity
                    style={[styles.mainButton, { backgroundColor: cardColor }]}
                    onPress={handleJoinPress}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle" size={16} color="white" style={{ marginRight: 5 }} />
                        <Text style={[styles.mainButtonText, { color: 'white' }]}>Member</Text>
                    </View>
                </TouchableOpacity>
            );
        }
        if (isUserRequested) {
            return (
                <TouchableOpacity
                    style={[styles.mainButton, { backgroundColor: '#888' }]}
                    onPress={handleJoinPress}
                >
                    <Text style={[styles.mainButtonText, { color: 'white' }]}>Requested</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: 'white' }]}
                onPress={handleJoinPress}
            >
                <Text style={[styles.mainButtonText, { color: '#2F3A27' }]}>
                    {isPrivate ? 'Request' : 'Join'}
                </Text>
            </TouchableOpacity>
        );
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: tribe.themeColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Profile Header */}
                <View style={styles.profileSection}>
                    <Image source={{ uri: tribe.avatar }} style={styles.avatar} />
                    <Text style={styles.name}>{tribe.name}</Text>

                    <View style={styles.iconRow}>
                        {renderTypeIcon()}
                        <PrivacyIcon privacy={tribe.privacy} />
                    </View>

                    <TouchableOpacity onPress={() => router.push(`/(tabs)/search` /* Mock Chief Profile */)}>
                        <Text style={styles.chiefHandle}>{tribe.chief.handle} <MaterialCommunityIcons name="leaf" size={14} color="#4ADE80" /> <MaterialCommunityIcons name="hammer" size={14} color="white" /></Text>
                    </TouchableOpacity>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.outlineButton}
                            onPress={() => Alert.alert('Message', `Message sent to ${tribe.chief.handle}`)}
                        >
                            <Text style={styles.outlineButtonText}>Message</Text>
                        </TouchableOpacity>

                        {renderMemberButton()}

                        <TouchableOpacity
                            style={styles.outlineButton}
                            onPress={() => Alert.alert('Similar', 'Showing similar tribes...')}
                        >
                            <Text style={styles.outlineButtonText}>Similar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Member Count Link */}
                    <TouchableOpacity onPress={() => {
                        if (canView) {
                            router.push(`/tribe/${tribe.id}/members`);
                        } else {
                            Alert.alert('Private Tribe', 'Join tribe to view members.');
                        }
                    }}>
                        <Text style={styles.memberCount}>{tribe.memberCount}</Text>
                        <Text style={styles.memberLabel}>Members</Text>
                    </TouchableOpacity>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <TouchableOpacity style={styles.statItem} onPress={() => Alert.alert("Meals", "Filtering by meals...")}>
                            <MaterialCommunityIcons name="fire" size={30} color="white" />
                            <Text style={[styles.statVal, { color: 'white' }]}>500</Text>
                            <Text style={[styles.statLabel, { color: 'white' }]}>meals</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.statItem} onPress={() => Alert.alert("Workouts", "Filtering by workouts...")}>
                            <MaterialCommunityIcons name="dumbbell" size={30} color="white" />
                            <Text style={[styles.statVal, { color: 'white' }]}>500</Text>
                            <Text style={[styles.statLabel, { color: 'white' }]}>workouts</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.statItem} onPress={() => Alert.alert("History", "Viewing macro history...")}>
                            <MaterialCommunityIcons name="chart-bar" size={30} color="white" />
                            <Text style={[styles.statLabel, { color: 'white', marginTop: 4 }]}>Macro</Text>
                            <Text style={[styles.statLabel, { color: 'white' }]}>history</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider Bars */}
                    <View style={styles.barsContainer}>
                        <View style={[styles.bar, { backgroundColor: cardColor, width: '30%' }]} />
                        <View style={[styles.bar, { backgroundColor: 'white', width: '70%', opacity: 0.5 }]} />
                    </View>

                </View>

                {/* Feed */}
                <View style={styles.feed}>
                    {canView ? (
                        posts.map(post => (
                            <TribePost key={post.id} post={post} cardColor={cardColor} />
                        ))
                    ) : (
                        <View style={styles.privateLock}>
                            <MaterialCommunityIcons name="lock" size={60} color="white" />
                            <Text style={styles.lockText}>Join tribe to view</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <TribeInfoModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 10,
    },
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: 'white',
        marginBottom: 10,
    },
    name: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    iconRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 8,
    },
    chiefHandle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    outlineButton: {
        backgroundColor: '#F5F5DC', // Beige
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    outlineButtonText: {
        color: '#2F3A27',
        fontWeight: 'bold',
    },
    mainButton: {
        paddingVertical: 10,
        paddingHorizontal: 30, // Wider
        borderRadius: 20,
    },
    mainButtonText: {
        fontWeight: 'bold',
    },
    memberCount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    memberLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        opacity: 0.8,
    },
    barsContainer: {
        flexDirection: 'row',
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 20,
    },
    bar: {
        height: '100%',
    },
    feed: {
        paddingHorizontal: 20,
    },
    privateLock: {
        alignItems: 'center',
        marginTop: 50,
        opacity: 0.8,
    },
    lockText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    }
});
