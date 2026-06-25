import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { Tribe } from '@/src/shared/models/types';
import { useAuthStore } from '@/store/AuthStore';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';

interface TribeSelectionModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function TribeSelectionModal({ visible, onClose }: TribeSelectionModalProps) {
    const { myTribes, selectTribe, leaveTribe, selectedTribe } = useUserTribeStore();
    const session = useAuthStore(state => state.session);
    const currentUserId = session?.user?.id ?? '';
    const router = useRouter();

    const handleSelect = (tribe: Tribe) => {
        selectTribe(tribe.id);
        onClose();
    };

    const handleLeavePress = (tribe: Tribe) => {
        Alert.alert(
            "Leave Chribe",
            `Are you sure you want to leave ${tribe.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave Chribe",
                    style: "destructive",
                    onPress: () => {
                        if (currentUserId) leaveTribe(currentUserId, tribe.id);
                        if (myTribes.length <= 1) onClose();
                    }
                }
            ]
        );
    };

    const renderFooter = () => (
        <TouchableOpacity
            style={[
                styles.tribeRow,
                {
                    backgroundColor: '#262525',
                    borderColor: '#DAA520',
                    borderWidth: 2,
                    marginTop: 10,
                    paddingHorizontal: 16,
                }
            ]}
            onPress={() => {
                onClose();
                router.push('/create-tribe');
            }}
        >
            <View style={[styles.tribeAvatar, { backgroundColor: '#262525', borderColor: '#DAA520', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }]}>
                <TabonoLogo size={24} color="#DAA520" />
            </View>
            <View style={styles.tribeInfo}>
                <Text style={[styles.tribeName, { color: '#DAA520' }]}>Create a chribe</Text>
            </View>
            <View style={{ borderColor: '#DAA520', borderWidth: 1.5, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#262525' }}>
                <MaterialCommunityIcons name="pencil-plus-outline" size={20} color="#DAA520" />
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

                    <Text style={styles.headerTitle}>Select a Chribe</Text>

                    <FlatList
                        data={myTribes}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.tribeRow,
                                    { backgroundColor: '#262525', borderColor: '#DAA520', borderWidth: 1.5, paddingHorizontal: 16 }
                                ]}
                                onPress={() => handleSelect(item)}
                            >
                                {item.avatar ? (
                                    <Image source={{ uri: item.avatar }} style={styles.tribeAvatar} />
                                ) : (
                                    <View style={[styles.tribeAvatar, { backgroundColor: '#262525', justifyContent: 'center', alignItems: 'center' }]}>
                                        <TabonoLogo size={24} color="#8B6D25" />
                                    </View>
                                )}
                                <View style={styles.tribeInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={styles.tribeName} numberOfLines={1}>{item.name}</Text>
                                    </View>
                                    <View style={styles.tribeMetaRow}>
                                        {item.naturalStatus !== null && item.naturalStatus !== undefined && (
                                            <MaterialCommunityIcons
                                                name={item.naturalStatus ? "leaf" : "lightning-bolt"}
                                                size={14}
                                                color={item.naturalStatus ? "#1BB607" : "#DAA520"}
                                                style={{ marginRight: 6 }}
                                            />
                                        )}
                                        {(() => {
                                            const activityIconName = resolveActivityIcon(item.activityType, item.activityIcon);
                                            const isPositive = item.activityType?.toLowerCase().includes('bulk') || item.activityType?.toLowerCase().includes('increase');
                                            const isNegative = item.activityType?.toLowerCase().includes('cut') || item.activityType?.toLowerCase().includes('decrease');
                                            const mathIndicator = isPositive ? '+' : (isNegative ? '–' : '');
                                            const color = '#EDE8D5';
                                            
                                            return (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6 }}>
                                                    <MaterialCommunityIcons name={activityIconName as any} size={14} color={color} />
                                                    {mathIndicator ? (
                                                        <Text style={{ color, fontSize: 10, fontWeight: 'bold', marginLeft: 1 }}>{mathIndicator}</Text>
                                                    ) : null}
                                                </View>
                                            );
                                        })()}
                                        {item.type === 'accountability' && <MaterialCommunityIcons name="calendar" size={14} color="#EDE8D5" style={{ marginRight: 6 }} />}
                                        {item.type === 'head-to-head' && <MaterialCommunityIcons name="trophy-outline" size={14} color="#EDE8D5" style={{ marginRight: 6 }} />}
                                        {item.type === 'tribe-vs-tribe' && <MaterialCommunityIcons name="trophy-variant-outline" size={14} color="#EDE8D5" style={{ marginRight: 6 }} />}
                                        <MaterialCommunityIcons name="earth" size={14} color="#EDE8D5" />
                                    </View>
                                </View>

                                {/* Right side button: Activity/Joined Indicator */}
                                <TouchableOpacity
                                    style={{ padding: 6 }}
                                    onPress={() => handleLeavePress(item)}
                                >
                                    <View style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: '#DAA520',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        <View style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            backgroundColor: '#1E1E1E',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}>
                                            <Ionicons name="checkmark" size={13} color="#DAA520" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.4)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 'bold', marginTop: 12 }}>No Chribes yet</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 4 }}>Join a chribe to showcase it on your profile!</Text>
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
        backgroundColor: '#262525', // Deep Charcoal
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
        backgroundColor: '#262525',
        borderRadius: 25,
        padding: 10,
        marginBottom: 12,
        height: 80,
        borderWidth: 1.5,
        borderColor: '#DAA520',
    },
    tribeAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#DAA520',
    },
    tribeInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    tribeName: {
        color: '#DAA520',
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
