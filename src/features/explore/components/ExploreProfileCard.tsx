import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '@/src/shared/models/types';
import { ACTIVITIES } from '@/src/shared/constants/Activities';

interface ExploreProfileCardProps {
    user: User;
    onToggleFollow: () => void;
    onPressHammer: () => void;
    onPressStatus: () => void;
    onPressCard?: () => void;
    rank?: string | number;
    matchPercent?: string | number;
    /** When true this card belongs to the authenticated user — hides match % and follow button. */
    isSelf?: boolean;
}

export default function ExploreProfileCard({ 
    user, 
    onToggleFollow, 
    onPressHammer, 
    onPressStatus, 
    onPressCard,
    rank,
    matchPercent = 68,
    isSelf = false,
}: ExploreProfileCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isBulk = user.activity?.toLowerCase().includes('bulk');
    const isCut = user.activity?.toLowerCase().includes('cut');

    const getFormattedHeight = (height?: string) => {
        if (!height) return '--';
        // Normalize format to X'Y, removing trailing quotes or extra symbols
        return height.replace(/["]+/g, '').replace(/[']+/g, "'").replace(/'$/, '');
    };

    /**
     * Looks up the canonical icon for a given activity name from the ACTIVITIES
     * constant — the single source of truth for valid app activities and their icons.
     * Falls back to the DB-stored icon (if it looks like a valid icon name, not an emoji),
     * then to 'hammer' as the final default.
     */
    const getEffectiveActivityIcon = (activity?: string, providedIcon?: string): string => {
        if (activity) {
            const match = ACTIVITIES.find(a => a.name === activity);
            if (match) return match.icon;
        }
        // Accept the DB icon only if it looks like a valid icon slug (no emojis, no spaces)
        if (providedIcon && /^[a-z0-9-_]+$/.test(providedIcon)) {
            return providedIcon;
        }
        return 'hammer';
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPressCard} activeOpacity={0.9}>
            <View style={styles.topSection}>
                <View style={styles.avatarContainer}>
                    <Image source={typeof user.avatar === 'string' ? { uri: user.avatar } : user.avatar} style={styles.avatar} />
                    {rank && (
                        <Text style={styles.rankIndicator}>#{rank}</Text>
                    )}
                </View>
                
                <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
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
                        {user.activity && (
                            <TouchableOpacity onPress={onPressHammer} style={styles.activityContainer}>
                                <MaterialCommunityIcons
                                    name={getEffectiveActivityIcon(user.activity, user.activityIcon) as any}
                                    size={20}
                                    color={"white"}
                                />
                                {isBulk && <Text style={styles.symbol}>+</Text>}
                                {isCut && <Text style={styles.symbol}>-</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.handle}>@{user.handle.replace('@', '')}</Text>
                    <Text 
                        style={styles.statsText} 
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {getFormattedHeight(user.height)} • {user.weight} lbs • {user.bfs?.toString().replace('%', '')}% BF
                    </Text>
                    <Text style={styles.tribeName}>{user.tribe || 'Team Flex'}</Text>
                </View>

                <View style={styles.actionCol}>
                    {isSelf ? (
                        // Self-card: show a neutral "You" indicator instead of follow/match UI
                        <View style={[styles.followBtn, styles.selfBtn]}>
                            <MaterialCommunityIcons name="account" size={24} color="#4F6352" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.followBtn, 
                                user.isFollowing && styles.followingBtn,
                                user.isRequested && styles.requestedBtn
                            ]}
                            onPress={onToggleFollow}
                        >
                            <MaterialCommunityIcons
                                name={user.isFollowing ? "account-check" : (user.isRequested ? "account-clock" : "account-plus")}
                                size={24}
                                color={user.isFollowing || user.isRequested ? "#F5F5DC" : "#4F6352"}
                            />
                        </TouchableOpacity>
                    )}
                    {/* Match % is hidden for self — logically irrelevant */}
                    {!isSelf && (
                        <Text style={styles.matchText}>
                            {typeof matchPercent === 'string' && (matchPercent.includes('match') || matchPercent.includes('Trending'))
                                ? matchPercent
                                : `${typeof matchPercent === 'number' ? (Number.isInteger(matchPercent) ? matchPercent : parseFloat(matchPercent.toFixed(1))) : matchPercent}% match`
                            }
                        </Text>
                    )}
                </View>
            </View>

            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.dotsContainer}>
                <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" />
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.metricsRow}>
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
                        <Ionicons name="stats-chart" size={28} color="#2F3A27" />
                        <Text style={styles.metricValue}>{user.stats?.updates || 0}</Text>
                        <Text style={styles.metricLabel}>macro updates</Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#A8C0A8', // Sage green as per image
        borderRadius: 25,
        padding: 15,
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
        alignItems: 'flex-start',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    rankIndicator: {
        position: 'absolute',
        top: -5,
        left: -8,
        color: 'white',
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    infoCol: {
        flex: 1,
        paddingTop: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 19,
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
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    statsText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    tribeName: {
        color: '#421C1C', // Dark brownish red as per image
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    dotsContainer: {
        alignItems: 'center',
        marginTop: 0,
        marginBottom: -5,
    },
    actionCol: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 35, // Moved button down
    },
    followBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    followingBtn: {
        backgroundColor: '#2F3A27', // Dark green
    },
    requestedBtn: {
        backgroundColor: 'gray', // Gray for pending
    },
    selfBtn: {
        backgroundColor: 'rgba(79, 99, 82, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.3)',
    },
    matchText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: 'bold',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 15,
        marginTop: 10,
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
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

