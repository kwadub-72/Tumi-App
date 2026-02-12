import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { Tribe } from '@/src/shared/models/types';

interface TribeSelectionModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function TribeSelectionModal({ visible, onClose }: TribeSelectionModalProps) {
    const { myTribes, selectTribe, leaveTribe, selectedTribe } = useUserTribeStore();

    const router = useRouter();

    const handleSelect = (tribe: Tribe) => {
        selectTribe(tribe.id);
        onClose();
    };

    const handleLeavePress = (tribe: Tribe) => {
        Alert.alert(
            "Leave Tribe",
            `Are you sure you want to leave ${tribe.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave Tribe",
                    style: "destructive",
                    onPress: () => {
                        leaveTribe(tribe.id);
                        if (myTribes.length <= 1) {
                            // If they left the only tribe or last one
                            onClose();
                        }
                    }
                }
            ]
        );
    };

    const renderFooter = () => (
        <TouchableOpacity
            style={[styles.tribeRow, { backgroundColor: '#5D735D', marginTop: 10 }]}
            onPress={() => {
                onClose();
                router.push('/create-tribe');
            }}
        >
            <View style={[styles.tribeAvatar, { backgroundColor: '#A8C0A8', alignItems: 'center', justifyContent: 'center', borderWidth: 0 }]}>
                <Ionicons name="person" size={24} color="white" />
            </View>
            <View style={styles.tribeInfo}>
                <Text style={styles.tribeName}>Found a tribe</Text>
            </View>
            <View style={{ backgroundColor: '#F5F5DC', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="pencil-plus-outline" size={20} color="#4F6352" />
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                    <View style={styles.handle} />

                    <Text style={styles.headerTitle}>Select a Tribe</Text>

                    <FlatList
                        data={myTribes}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.tribeRow,
                                    { backgroundColor: item.themeColor }
                                ]}
                                onPress={() => handleSelect(item)}
                            >
                                <Image source={{ uri: item.avatar }} style={styles.tribeAvatar} />
                                <View style={styles.tribeInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={styles.tribeName} numberOfLines={1}>{item.name}</Text>
                                    </View>
                                    <View style={styles.tribeMetaRow}>
                                        {/* Icons reflecting 'Image 1' style metadata */}
                                        <MaterialCommunityIcons name="leaf" size={14} color="#4ADE80" style={{ marginRight: 6 }} />
                                        <MaterialCommunityIcons name="hammer" size={14} color="white" style={{ marginRight: 6 }} />
                                        {item.type === 'accountability' && <MaterialCommunityIcons name="calendar" size={14} color="white" style={{ marginRight: 6 }} />}
                                        {item.type === 'head-to-head' && <MaterialCommunityIcons name="trophy-outline" size={14} color="white" style={{ marginRight: 6 }} />}
                                        {item.type === 'tribe-vs-tribe' && <MaterialCommunityIcons name="trophy-variant-outline" size={14} color="white" style={{ marginRight: 6 }} />}
                                        <MaterialCommunityIcons name="earth" size={14} color="white" />
                                    </View>
                                </View>

                                {/* Right side button: Activity/Joined Indicator */}
                                <TouchableOpacity
                                    style={styles.leaveButtonArea}
                                    onPress={() => handleLeavePress(item)}
                                >
                                    <View style={styles.activityCircle}>
                                        <View style={styles.dotsContainer}>
                                            <View style={[styles.dot, { marginTop: 2 }]} />
                                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                                <View style={styles.dot} />
                                                <View style={styles.dot} />
                                            </View>
                                        </View>
                                        <View style={styles.checkBadge}>
                                            <Ionicons name="checkmark" size={8} color="white" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>You haven't joined any tribes yet.</Text>
                            </View>
                        }
                        ListFooterComponent={renderFooter}
                        contentContainerStyle={styles.listContent}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#2D3A26', // Dark green background for modal
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 10,
        paddingHorizontal: 20,
        height: '50%',
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#fff',
        opacity: 0.3,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 10,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    tribeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5D735D', // Fallback, usually overridden by themeColor
        borderRadius: 25,
        padding: 10,
        marginBottom: 12,
        height: 80,
    },
    tribeAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tribeInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    tribeName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tribeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leaveButtonArea: {
        padding: 5,
    },
    activityCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    dotsContainer: {
        alignItems: 'center',
        gap: 2,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'white',
        opacity: 0.8,
    },
    checkBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'transparent', // Or themed? Reference didn't specify color, usually standard check
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        color: '#ddd',
        fontSize: 12,
        marginLeft: 8,
        fontWeight: 'bold',
    }
});
