import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Colors } from '../../../../shared/theme/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';

const getCompetitionWeek = () => {
    const START_DATE = new Date('2026-03-22T00:00:00Z');
    const now = new Date();
    const diffMs = now.getTime() - START_DATE.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7) + 1;
    return Math.max(1, weeks);
};

const mockMatchupData = {
    leftUser: {
        rank: 1,
        name: 'Kwaku',
        handle: '@kwadub',
        avatar: 'https://i.pravatar.cc/100?img=33',
        record: '7-1',
        streak: 'L1',
        score: 100,
        leaf: true,
        activity: 'hammer',
        caloriesLoggedPct: 80,
    },
    rightUser: {
        rank: 2,
        name: 'Michael',
        handle: '@MikeyMike123',
        avatar: 'https://i.pravatar.cc/100?img=60',
        record: '7-1',
        streak: 'W1',
        score: 100,
        leaf: true,
        activity: 'hammer',
        caloriesLoggedPct: 50,
    },
    dailyHistory: [
        { date: 'Sat - 3/29', leftScore: '+10', rightScore: '-10' },
        { date: 'Fri - 3/28', leftScore: '+10', rightScore: '-10' },
        { date: 'Thu - 3/27', leftScore: '+10', rightScore: '-10' },
        { date: 'Wed - 3/26', leftScore: '+10', rightScore: '-10' },
        { date: 'Tue - 3/25', leftScore: '+10', rightScore: '-10' },
        { date: 'Mon - 3/24', leftScore: '+10', rightScore: '-10' },
    ]
};

export const H2HUserMatchupDashboard = () => {
    const [expanded, setExpanded] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean, title: string, description: string, iconName: any } | null>(null);
    const week = getCompetitionWeek();

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const renderIcons = (user: any) => (
        <>
            {user.leaf && (
                <TouchableOpacity onPress={() => setModalInfo({
                    visible: true, title: 'Natural Athlete', description: 'This user is verified as a natural athlete by the tribe.', iconName: 'leaf'
                })}>
                    <MaterialCommunityIcons name="leaf" size={16} color="#4ADE80" style={styles.icon} />
                </TouchableOpacity>
            )}
            {user.activity && (
                <TouchableOpacity onPress={() => setModalInfo({
                    visible: true, title: 'Tribe Activity', description: 'This is the verified activity for the user.', iconName: user.activity
                })}>
                    <MaterialCommunityIcons name={user.activity as any} size={16} color={Colors.primary} style={styles.icon} />
                </TouchableOpacity>
            )}
        </>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.dashboardType}>Traditional • Head-to-Head • Habits</Text>

            <View style={styles.header}>
                <Text style={styles.leagueName}>Team flex</Text>
                <Image source={{ uri: 'https://i.pravatar.cc/100?img=26' }} style={styles.leagueImage} />
            </View>
            <Text style={styles.weekText}>Week {week}</Text>

            <View style={styles.matchupContainer}>
                {/* Left User */}
                <View style={styles.playerCol}>
                    <Text style={styles.rankNum}>#{mockMatchupData.leftUser.rank}</Text>
                    <Image source={{ uri: mockMatchupData.leftUser.avatar }} style={styles.bigAvatar} />

                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{mockMatchupData.leftUser.name}</Text>
                        {renderIcons(mockMatchupData.leftUser)}
                    </View>
                    <Text style={styles.userHandle}>{mockMatchupData.leftUser.handle}</Text>

                    <Text style={styles.recordText}>
                        {mockMatchupData.leftUser.record} <Text style={{ color: Colors.error }}>({mockMatchupData.leftUser.streak})</Text>
                    </Text>

                    <View style={styles.calorieBarContainer}>
                        <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                        <View style={styles.calorieBarBg}>
                            <View style={[styles.calorieBarFill, { width: `${mockMatchupData.leftUser.caloriesLoggedPct}%` }]} />
                        </View>
                    </View>
                </View>

                {/* Score */}
                <View style={styles.scoreCol}>
                    <Text style={styles.bigScore}>{mockMatchupData.leftUser.score}-{mockMatchupData.rightUser.score}</Text>
                </View>

                {/* Right User */}
                <View style={styles.playerCol}>
                    <Text style={styles.rankNum}>#{mockMatchupData.rightUser.rank}</Text>
                    <Image source={{ uri: mockMatchupData.rightUser.avatar }} style={styles.bigAvatarRight} />

                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{mockMatchupData.rightUser.name}</Text>
                        {renderIcons(mockMatchupData.rightUser)}
                    </View>
                    <Text style={styles.userHandle}>{mockMatchupData.rightUser.handle}</Text>

                    <Text style={styles.recordText}>
                        {mockMatchupData.rightUser.record} <Text style={{ color: '#4ADE80' }}>({mockMatchupData.rightUser.streak})</Text>
                    </Text>

                    <View style={styles.calorieBarContainer}>
                        <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                        <View style={styles.calorieBarBg}>
                            <View style={[styles.calorieBarFill, { width: `${mockMatchupData.rightUser.caloriesLoggedPct}%` }]} />
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.expandButton} onPress={toggleExpand}>
                <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContent}>
                    {mockMatchupData.dailyHistory.map((day, idx) => (
                        <View key={idx} style={styles.historyRow}>
                            <View style={styles.historyUserLeft}>
                                <Image source={{ uri: mockMatchupData.leftUser.avatar }} style={styles.smallAvatar} />
                                <View style={styles.historyNameCol}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName}>{mockMatchupData.leftUser.name}</Text>
                                        <MaterialCommunityIcons name="leaf" size={12} color="#4ADE80" style={{ marginLeft: 2 }} />
                                        <MaterialCommunityIcons name="hammer" size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                                    </View>
                                    <Text style={styles.historyHandle}>{mockMatchupData.leftUser.handle}</Text>
                                </View>
                            </View>

                            <View style={styles.historyScoreBox}>
                                <Text style={styles.historyDate}>{day.date}</Text>
                                <View style={styles.historyScoreRow}>
                                    <Text style={[styles.historyScore, { color: Colors.primary }]}>{day.leftScore}</Text>
                                    <View style={styles.historyDivider} />
                                    <Text style={[styles.historyScore, { color: Colors.error }]}>{day.rightScore}</Text>
                                </View>
                            </View>

                            <View style={styles.historyUserRight}>
                                <View style={[styles.historyNameCol, { alignItems: 'flex-end' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName}>{mockMatchupData.rightUser.name}</Text>
                                        <MaterialCommunityIcons name="leaf" size={12} color="#4ADE80" style={{ marginLeft: 2 }} />
                                        <MaterialCommunityIcons name="hammer" size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                                    </View>
                                    <Text style={styles.historyHandle}>{mockMatchupData.rightUser.handle}</Text>
                                </View>
                                <Image source={{ uri: mockMatchupData.rightUser.avatar }} style={styles.smallAvatar} />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <Text style={styles.timestamp}>Just now</Text>

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
        backgroundColor: Colors.card,
        borderRadius: 35,
        padding: 20,
        paddingTop: 15,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.4)',
        position: 'relative',
    },
    dashboardType: {
        textAlign: 'center',
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    leagueName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: 'white',
    },
    leagueImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    weekText: {
        textAlign: 'center',
        color: 'white',
        fontStyle: 'italic',
        fontSize: 12,
        marginBottom: 15,
        opacity: 0.8,
    },
    matchupContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    playerCol: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    scoreCol: {
        width: 120,
        alignItems: 'center',
        paddingTop: 40,
    },
    bigScore: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.8)',
    },
    rankNum: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        alignSelf: 'flex-start',
        position: 'absolute',
        top: -10,
        left: 0,
        zIndex: 1,
    },
    bigAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: Colors.primary,
        marginBottom: 10,
    },
    bigAvatarRight: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FCA5A5',
        marginBottom: 10,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    userHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: -2,
    },
    icon: {
        marginLeft: 2,
    },
    recordText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        marginTop: 5,
        marginBottom: 10,
    },
    calorieBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
        gap: 5,
    },
    calorieBarBg: {
        flex: 1,
        height: 20,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    calorieBarFill: {
        height: '100%',
        backgroundColor: '#789370',
    },
    expandButton: {
        alignItems: 'center',
        marginTop: 15,
        padding: 5,
        zIndex: 2,
    },
    expandedContent: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 15,
        gap: 12,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyUserLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    historyUserRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
        gap: 6,
    },
    smallAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    historyNameCol: {
        justifyContent: 'center',
    },
    historyName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    historyHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    historyScoreBox: {
        alignItems: 'center',
        width: 100,
    },
    historyDate: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    historyScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    historyScore: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    historyDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    timestamp: {
        position: 'absolute',
        bottom: 15,
        right: 20,
        fontSize: 10,
        color: Colors.primary,
        opacity: 0.7,
    }
});
