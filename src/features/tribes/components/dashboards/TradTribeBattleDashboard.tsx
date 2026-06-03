import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../../../../shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';
import { useAuthStore } from '@/store/AuthStore';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { useTribeScoreboard } from '../../hooks/useTribeScoreboard';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';
import * as Haptics from 'expo-haptics';
import Reanimated, { LinearTransition } from 'react-native-reanimated';

// Helper to determine top 3 rank medal coloring
const getRankColor = (rank: number) => {
    if (rank === 1) return '#DAA520'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'rgba(237, 232, 213, 0.6)'; // Soft Dust
};

export const TradTribeBattleDashboard = ({ tribeId }: { tribeId?: string }) => {
    const { session } = useAuthStore();
    const { navigateToProfile } = useProfileNavigation();
    
    const { loading, data } = useTribeScoreboard(tribeId || '');
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoModalConfig, setInfoModalConfig] = useState<any>({});

    const openInfoModal = (config: any) => {
        setInfoModalConfig(config);
        setInfoModalVisible(true);
    };

    const handleRowPress = (member: any) => {
        if (!member.id) return;
        navigateToProfile({ id: member.id, handle: member.handle || '' });
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                <Text style={styles.loadingText}>Syncing Scoreboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.tableHeaderRow}>
                <Text style={[styles.columnHeader, styles.colIdentityCompetitive]}>MEMBER</Text>
                <Text style={[styles.columnHeader, styles.colLoggedCompetitive, { textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit>LOGGED</Text>
                <Text style={[styles.columnHeader, styles.colTrendCompetitive, { textAlign: 'center' }]}>TREND</Text>
                <Text style={[styles.columnHeader, styles.colPointsCompetitive, { textAlign: 'center' }]}>RECORD</Text>
            </View>

            {data.map((member) => {
                const isCurrentUser = session?.user?.id === member.id;
                
                return (
                    <Reanimated.View 
                        key={member.id} 
                        layout={LinearTransition.duration(400)}
                        style={isCurrentUser && styles.currentUserRowWrapper}
                    >
                        <TouchableOpacity
                            style={[
                                styles.memberRow,
                                isCurrentUser && styles.currentUserHighlightRow
                            ]}
                            activeOpacity={0.85}
                            onPress={() => handleRowPress(member)}
                        >
                            <View style={[styles.memberCell, styles.colIdentityCompetitive, styles.identityContainer]}>
                                <View style={styles.rankContainer}>
                                    <Text style={[styles.rankNumberText, { color: getRankColor(member.rank) }]}>{member.rank}</Text>
                                </View>
                                <Image source={member.avatar ? { uri: member.avatar } : require('@/assets/images/react-logo.png')} style={styles.avatar} />
                                <View style={styles.nameContainer}>
                                    <Text style={styles.displayName} numberOfLines={1}>{member.name}</Text>
                                    <Text style={styles.userHandle} numberOfLines={1}>{member.handle}</Text>
                                    <View style={styles.metaIndicatorRow}>
                                        {member.status && member.status !== 'none' && (
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={styles.metaIndicatorPill}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    const isNatural = member.status !== 'enhanced';
                                                    openInfoModal({
                                                        title: isNatural ? 'Natural' : 'Enhanced',
                                                        description: isNatural
                                                            ? `${member.name} is verified as 100% Natural.`
                                                            : `${member.name} is verified as Enhanced.`,
                                                        iconName: isNatural ? 'leaf' : 'lightning-bolt',
                                                        iconColor: isNatural ? Colors.natural : Colors.theme.harvestGold,
                                                    });
                                                }}
                                            >
                                                <MaterialCommunityIcons
                                                    name={member.status === 'enhanced' ? 'lightning-bolt' : 'leaf'}
                                                    size={14}
                                                    color={member.status === 'enhanced' ? Colors.theme.harvestGold : Colors.natural}
                                                />
                                            </TouchableOpacity>
                                        )}
                                        {member.activity && (
                                            (() => {
                                                    const actLower = member.activity.toLowerCase();
                                                    const isBulk = actLower.includes('bulk') || actLower.includes('increase');
                                                    const isCut = actLower.includes('cut') || actLower.includes('decrease');
                                                    const modifier = isBulk ? '+' : (isCut ? '-' : '');
                                                    const activeIconName = resolveActivityIcon(member.activity, member.activityIcon);

                                                    return (
                                                        <TouchableOpacity
                                                            activeOpacity={0.7}
                                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            style={[styles.metaIndicatorPill, styles.activityPill]}
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                openInfoModal({
                                                                    title: member.activity || 'Activity',
                                                                    description: '',
                                                                    iconName: activeIconName,
                                                                    modifier: modifier || undefined,
                                                                });
                                                            }}
                                                        >
                                                            <MaterialCommunityIcons name={activeIconName as any} size={14} color={Colors.theme.dust} />
                                                            {modifier ? <Text style={styles.mathModifierText}>{modifier}</Text> : null}
                                                        </TouchableOpacity>
                                                    );
                                            })()
                                        )}
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.memberCell, styles.colLoggedCompetitive, styles.centerCell]}>
                                {member.logged ? (
                                    <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />
                                ) : (
                                    <View style={styles.unloggedCircle} />
                                )}
                            </View>

                            <View style={[styles.memberCell, styles.colTrendCompetitive, styles.centerCell]}>
                                {member.rankChange > 0 ? (
                                    <View style={styles.trendRow}>
                                        <Text style={styles.trendUpArrow}>▲</Text>
                                        <Text style={styles.trendUpText}>{member.rankChange}</Text>
                                    </View>
                                ) : member.rankChange < 0 ? (
                                    <View style={styles.trendRow}>
                                        <Text style={styles.trendDownArrow}>▼</Text>
                                        <Text style={styles.trendDownText}>{Math.abs(member.rankChange)}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.trendStagnant}>—</Text>
                                )}
                            </View>

                            <View style={[styles.memberCell, styles.colPointsCompetitive, styles.centerCell]}>
                                <Text style={styles.recordText}>
                                    {`${member.wins ?? 0}-${member.losses ?? 0}`}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </Reanimated.View>
                );
            })}

            <TribeInfoModal
                visible={infoModalVisible}
                onClose={() => setInfoModalVisible(false)}
                type="icon-title"
                {...infoModalConfig}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.12)',
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    columnHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#8B4513',
        letterSpacing: 1,
    },
    currentUserRowWrapper: {
        borderRadius: 16,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.08)',
        minHeight: 52,
        borderRadius: 16,
        paddingHorizontal: 8,
        marginVertical: 1,
    },
    currentUserHighlightRow: {
        backgroundColor: 'rgba(218, 165, 32, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.35)',
    },
    memberCell: {
        justifyContent: 'center',
    },
    centerCell: {
        alignItems: 'center',
    },
    colIdentityCompetitive: {
        flex: 2.5,
    },
    colLoggedCompetitive: {
        flex: 0.8,
    },
    colTrendCompetitive: {
        flex: 1.0,
    },
    colPointsCompetitive: {
        flex: 1.2,
        alignItems: 'flex-end',
    },
    identityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    rankContainer: {
        width: 22,
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNumberText: {
        fontSize: 14,
        fontWeight: '900',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#DAA520', 
        marginRight: 10,
    },
    nameContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    displayName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 1,
    },
    userHandle: {
        color: '#EDE8D5',
        fontSize: 11,
        opacity: 0.65,
    },
    unloggedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#EDE8D5', 
        backgroundColor: 'transparent',
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    trendUpArrow: {
        fontSize: 11,
        color: '#AEDD63', 
    },
    trendUpText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#AEDD63',
    },
    trendDownArrow: {
        fontSize: 11,
        color: '#8B2613', 
    },
    trendDownText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#8B2613',
    },
    trendStagnant: {
        fontSize: 12,
        fontWeight: '800',
        color: '#EDE8D5',
        opacity: 0.5,
    },
    recordText: {
        color: '#FFFFFF', 
        fontSize: 14,
        fontWeight: '900',
    },
    metaIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    metaIndicatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityPill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mathModifierText: {
        color: '#EDE8D5',
        fontSize: 11,
        fontWeight: '900',
        marginLeft: 1.5,
        marginTop: -3,
    },
});
