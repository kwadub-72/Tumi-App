import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';
import { useTribeScoreboard, ScoreboardMember } from '../../hooks/useTribeScoreboard';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import Reanimated, { LinearTransition } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getCompetitionWeek = () => {
    const START_DATE = new Date('2026-03-22T00:00:00Z');
    const now = new Date();
    const diffMs = now.getTime() - START_DATE.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7) + 1;
    return Math.max(1, weeks);
};

export const H2HLeaderboardDashboard = () => {
    const tribeId = 'b0000000-0000-0000-0000-000000000004'; // The Cut Squad ID
    const { loading, data, header, competition, mutateRecord } = useTribeScoreboard(tribeId);
    const { navigateToProfile } = useProfileNavigation();
    
    const [expanded, setExpanded] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean, title: string, description: string, iconName: any } | null>(null);
    const week = getCompetitionWeek();

    const visibleUsers = expanded ? data : data.slice(0, 5);

    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    const handleRowPress = (member: ScoreboardMember) => {
        navigateToProfile({ id: member.id, handle: member.handle });
    };

    return (
        <View style={styles.container}>
            {/* Line 1 (Context Metadata) */}
            <Text style={styles.dashboardType}>Head-to-Head · Faceoff · Habits</Text>

            {/* Line 2 (Tribe Identifier) */}
            <View style={styles.header}>
                <Text style={styles.leagueName}>THE CUT SQUAD</Text>
                <Image source={{ uri: 'https://i.pravatar.cc/100?img=26' }} style={styles.leagueImage} />
            </View>
            <Text style={styles.weekText}>Week {week}</Text>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color="#DAA520" />
                </View>
            ) : (
                <>
                    <View style={styles.tableHeader}>
                        <View style={{ flex: 2.2, paddingLeft: 22 }}>
                            <Text style={styles.headerText}>MEMBER</Text>
                        </View>
                        <View style={{ width: '18%', alignItems: 'center' }}>
                            <Text style={styles.headerText}>LOGGED</Text>
                        </View>
                        <View style={{ width: '18%', alignItems: 'center' }}>
                            <Text style={styles.headerText}>TREND</Text>
                        </View>
                        <View style={{ width: '18%', alignItems: 'flex-end', paddingRight: 4, marginRight: -12 }}>
                            <Text style={styles.headerText}>RECORD</Text>
                        </View>
                    </View>

                    <View style={styles.rowsWrapper}>
                        {visibleUsers.map((member) => (
                            <Reanimated.View 
                                key={member.id} 
                                layout={LinearTransition.springify().damping(22).stiffness(130)}
                            >
                                <TouchableOpacity 
                                    activeOpacity={0.7} 
                                    onPress={() => handleRowPress(member)}
                                    style={styles.userRow}
                                >
                                    <Text style={styles.rankNum}>#{member.rank}</Text>

                                    <View style={styles.userInfo}>
                                        <Image 
                                            source={member.avatar ? { uri: member.avatar } : require('@/assets/images/react-logo.png')} 
                                            style={styles.avatar} 
                                        />
                                        <View style={styles.nameContainer}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.userName} numberOfLines={1}>{member.name}</Text>
                                                {member.status === 'natural' && (
                                                    <TouchableOpacity onPress={() => setModalInfo({
                                                        visible: true, title: 'Natural Athlete', description: 'This user is verified as a natural athlete by the tribe.', iconName: 'leaf'
                                                    })}>
                                                        <MaterialCommunityIcons name="leaf" size={13} color="#1BB607" style={styles.icon} />
                                                    </TouchableOpacity>
                                                )}
                                                {member.activityIcon && (
                                                    <TouchableOpacity onPress={() => setModalInfo({
                                                        visible: true, title: member.activity || 'Activity', description: '', iconName: resolveActivityIcon(member.activity, member.activityIcon) as any
                                                    })}>
                                                        <MaterialCommunityIcons name={resolveActivityIcon(member.activity, member.activityIcon) as any} size={13} color="#DAA520" style={styles.icon} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <Text style={styles.userHandle} numberOfLines={1}>{member.handle}</Text>
                                        </View>
                                    </View>

                                    {/* Column 2: Logged Status */}
                                    <View style={styles.iconCol}>
                                        {member.logged ? (
                                            <Ionicons 
                                                name="checkmark-circle" 
                                                size={22} 
                                                color="#DAA520" 
                                            />
                                        ) : (
                                            <View style={styles.unloggedCircle} />
                                        )}
                                    </View>

                                    {/* Column 3: Trend */}
                                    <View style={styles.col}>
                                        {member.rankChange > 0 ? (
                                            <View style={styles.trendContainer}>
                                                <Text style={styles.trendUpArrow}>▲</Text>
                                                <Text style={styles.trendUpText}>{member.rankChange}</Text>
                                            </View>
                                        ) : member.rankChange < 0 ? (
                                            <View style={styles.trendContainer}>
                                                <Text style={styles.trendDownArrow}>▼</Text>
                                                <Text style={styles.trendDownText}>{Math.abs(member.rankChange)}</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.trendStagnant}>—</Text>
                                        )}
                                    </View>

                                    {/* Column 4: Record */}
                                    <View style={styles.recordCol}>
                                        <Text style={styles.recordText}>
                                            {`${member.wins ?? 0}-${member.losses ?? 0}`}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Reanimated.View>
                        ))}
                    </View>

                    {data.length > 5 && (
                        <TouchableOpacity style={styles.expandButton} onPress={toggleExpand}>
                            <MaterialCommunityIcons 
                                name={expanded ? "chevron-up" : "dots-horizontal"} 
                                size={24} 
                                color="#EDE8D5" 
                            />
                        </TouchableOpacity>
                    )}

                    {/* QA Engineering Synthetic Testing Rig */}
                    <View style={styles.qaRigContainer}>
                        <Text style={styles.qaRigLabel}>QA ANIMATION TESTING RIG</Text>
                        <View style={styles.qaActionRow}>
                            <TouchableOpacity
                                style={styles.qaPlusButton}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (data.length === 0) return;
                                    // Select random member and mutate record
                                    const randomMember = data[Math.floor(Math.random() * data.length)];
                                    const isWin = Math.random() > 0.5;
                                    mutateRecord(randomMember.id, isWin ? 1 : 0, isWin ? 0 : 1);
                                }}
                            >
                                <Ionicons name="add" size={16} color="#DAA520" />
                                <Text style={styles.qaPlusText}>Mutate record</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </>
            )}

            {modalInfo && (
                <TribeInfoModal
                    visible={modalInfo.visible}
                    onClose={() => setModalInfo(null)}
                    title={modalInfo.title}
                    description={modalInfo.description}
                    type="icon-title"
                    iconName={modalInfo.iconName}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#262525', // Signature deep Charcoal background
        borderRadius: 32,
        padding: 16,
        paddingTop: 20,
        borderWidth: 2,
        borderColor: '#DAA520', // Glowing Harvest Gold border
        marginVertical: 12,
    },
    dashboardType: {
        textAlign: 'center',
        color: '#DAA520', // Harvest Gold context metadata
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    leagueName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#EDE8D5', // Uppercase Dust tribe name
        letterSpacing: 1,
    },
    leagueImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DAA520',
    },
    weekText: {
        textAlign: 'center',
        color: '#EDE8D5',
        fontStyle: 'italic',
        fontSize: 11,
        marginBottom: 16,
        opacity: 0.7,
    },
    loaderContainer: {
        paddingVertical: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerText: {
        color: '#787878',
        fontWeight: '900',
        fontSize: 10,
        letterSpacing: 1.2,
    },
    rowsWrapper: {
        gap: 2,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.05)',
        position: 'relative',
    },
    rankNum: {
        position: 'absolute',
        left: 0,
        fontSize: 11,
        fontWeight: '900',
        color: '#EDE8D5',
        opacity: 0.6,
    },
    userInfo: {
        flex: 2.2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 22,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#DAA520', // Harvest Gold avatar border
    },
    nameContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    userName: {
        color: '#EDE8D5',
        fontWeight: 'bold',
        fontSize: 14,
        maxWidth: SCREEN_WIDTH * 0.28,
    },
    userHandle: {
        color: '#8B4513', // Burnt Sienna username handles
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    icon: {
        marginLeft: 1,
    },
    iconCol: {
        width: '18%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    col: {
        width: '18%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordCol: {
        width: '18%',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 4,
    },
    unloggedCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#EDE8D5', // Empty Dust circle
        backgroundColor: 'transparent',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    trendUpArrow: {
        color: '#AEDD63', // Green caret
        fontSize: 11,
        fontWeight: '900',
    },
    trendUpText: {
        color: '#AEDD63',
        fontSize: 11,
        fontWeight: 'bold',
    },
    trendDownArrow: {
        color: '#8B2613', // Crimson caret
        fontSize: 11,
        fontWeight: '900',
    },
    trendDownText: {
        color: '#8B2613',
        fontSize: 11,
        fontWeight: 'bold',
    },
    trendStagnant: {
        color: '#EDE8D5',
        fontSize: 11,
        fontWeight: 'bold',
    },
    recordText: {
        color: '#FFFFFF', // Bold Soft White records
        fontWeight: '900',
        fontSize: 14,
    },
    expandButton: {
        alignItems: 'center',
        marginTop: 12,
        padding: 4,
    },
    qaRigContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1.5,
        borderTopColor: 'rgba(237, 232, 213, 0.08)',
        alignItems: 'center',
    },
    qaRigLabel: {
        color: '#DAA520',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 8,
        opacity: 0.6,
    },
    qaActionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    qaPlusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#DAA520',
        borderRadius: 100,
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 6,
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    qaPlusText: {
        color: '#DAA520',
        fontSize: 11,
        fontWeight: 'bold',
    },
});
