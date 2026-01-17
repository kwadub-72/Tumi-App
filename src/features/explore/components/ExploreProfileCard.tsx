import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '@/src/shared/models/types';

interface ExploreProfileCardProps {
    user: User;
    onToggleFollow: () => void;
    onPressHammer: () => void;
    onPressStatus: () => void;
}

export default function ExploreProfileCard({ user, onToggleFollow, onPressHammer, onPressStatus }: ExploreProfileCardProps) {
    const isPeach = user.activity === 'Glute Growth';
    const isBulk = user.activity?.toLowerCase().includes('bulk');
    const isCut = user.activity?.toLowerCase().includes('cut');

    return (
        <View style={styles.card}>
            <View style={styles.topSection}>
                <Image source={typeof user.avatar === 'string' ? { uri: user.avatar } : user.avatar} style={styles.avatar} />
                <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{user.name}</Text>
                        {(user.status && user.status !== 'none') && (
                            <TouchableOpacity onPress={onPressStatus}>
                                <MaterialCommunityIcons
                                    name={user.status === 'enhanced' ? "lightning-bolt" : "leaf"}
                                    size={20}
                                    color={user.status === 'enhanced' ? "#FFD700" : "#4ADE80"}
                                    style={{ marginHorizontal: 4 }}
                                />
                            </TouchableOpacity>
                        )}
                        {user.activityIcon && (
                            <TouchableOpacity onPress={onPressHammer} style={styles.activityContainer}>
                                <MaterialCommunityIcons
                                    name={user.activityIcon as any}
                                    size={20}
                                    color={isPeach ? '#FFB07C' : "white"}
                                />
                                {isBulk && <Text style={styles.symbol}>+</Text>}
                                {isCut && <Text style={styles.symbol}>-</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.handle}>{user.handle}</Text>
                    <View style={styles.tribeRow}>
                        <Image source={{ uri: user.tribeAvatar || 'https://i.pravatar.cc/150' }} style={styles.tribeAvatar} />
                        <Text style={styles.tribeName}>{user.tribe}</Text>
                    </View>
                    <Text style={styles.statsText}>{user.height} • {user.weight} lbs • {user.bfs} BF</Text>
                </View>

                <TouchableOpacity
                    style={[styles.followBtn, user.isFollowing && styles.followingBtn]}
                    onPress={onToggleFollow}
                >
                    <MaterialCommunityIcons
                        name={user.isFollowing ? "account-check" : "account-plus"}
                        size={24}
                        color={user.isFollowing ? "#F5F5DC" : "#4F6352"}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.metricsRow}>
                {/* ... existing metrics ... */}
                <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="fire" size={28} color="#2F3A27" />
                    <Text style={styles.metricValue}>{user.stats?.meals || 0}</Text>
                    <Text style={styles.metricLabel}>meals</Text>
                </View>
                <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="dumbbell" size={28} color="#2F3A27" />
                    <Text style={styles.metricValue}>{user.stats?.workouts || 0}</Text>
                    <Text style={styles.metricLabel}>workouts</Text>
                </View>
                <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="chart-bar" size={28} color="#2F3A27" />
                    <Text style={styles.metricValue}>{user.stats?.updates || 0}</Text>
                    <Text style={styles.metricLabel}>updates</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#A8C0A8', // Sage green as per image
        borderRadius: 25,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#8FA88F',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    topSection: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        marginRight: 15,
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginRight: 4,
    },
    activityContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    symbol: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -3,
    },
    handle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        marginBottom: 4,
    },
    tribeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    tribeAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 6,
    },
    tribeName: {
        color: '#3E0000', // Dark brownish red
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    statsText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    followBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginLeft: 10,
        marginTop: 15, // Moved down to avoid overlap
    },
    followingBtn: {
        backgroundColor: '#2F3A27', // Dark green
    },
    followingIconBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 15,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    }
});
