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
    leftTribe: {
        name: 'Team Flex',
        avatar: 'https://i.pravatar.cc/100?img=33',
        score: 100,
        loggedPct: 80,
    },
    rightTribe: {
        name: 'Harvard alums',
        avatar: 'https://i.pravatar.cc/100?img=60',
        score: 100,
        loggedPct: 60,
    },
    activeMatchups: [
        { id: 1, leftUser: { name: 'Kwaku', handle: '@kwadub', avatar: 'https://i.pravatar.cc/100?img=33', leaf: true, activity: 'hammer' }, leftScore: 10, rightUser: { name: 'Matthew', handle: '@BigBoiMatt', avatar: 'https://i.pravatar.cc/100?img=11', leaf: true, activity: 'hammer' }, rightScore: 10 },
        { id: 2, leftUser: { name: 'Kwaku', handle: '@kwadub', avatar: 'https://i.pravatar.cc/100?img=33', leaf: true, activity: 'hammer' }, leftScore: 10, rightUser: { name: 'Michael', handle: '@MikeyMike123', avatar: 'https://i.pravatar.cc/100?img=60', leaf: true, activity: 'hammer' }, rightScore: 10 },
        { id: 3, leftUser: { name: 'Kwaku', handle: '@kwadub', avatar: 'https://i.pravatar.cc/100?img=33', leaf: true, activity: 'hammer' }, leftScore: 10, rightUser: { name: 'Michael', handle: '@MikeyMike123', avatar: 'https://i.pravatar.cc/100?img=60', leaf: true, activity: 'hammer' }, rightScore: 10 },
        { id: 4, leftUser: { name: 'Kwaku', handle: '@kwadub', avatar: 'https://i.pravatar.cc/100?img=33', leaf: true, activity: 'hammer' }, leftScore: 10, rightUser: { name: 'Michael', handle: '@MikeyMike123', avatar: 'https://i.pravatar.cc/100?img=60', leaf: true, activity: 'hammer' }, rightScore: 10 },
    ]
};

export const TradTribeBattleDashboard = () => {
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
                    <MaterialCommunityIcons name="leaf" size={14} color="#4ADE80" style={styles.icon} />
                </TouchableOpacity>
            )}
            {user.activity && (
                <TouchableOpacity onPress={() => setModalInfo({
                    visible: true, title: 'Tribe Activity', description: 'This is the verified activity for the user.', iconName: user.activity
                })}>
                    <MaterialCommunityIcons name={user.activity as any} size={14} color={Colors.primary} style={styles.icon} />
                </TouchableOpacity>
            )}
        </>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.dashboardType}>Traditional • Tribe Battle • Habits</Text>

            <View style={styles.header}>
                <Text style={styles.leagueName}>Team flex</Text>
                <Image source={{ uri: 'https://i.pravatar.cc/100?img=26' }} style={styles.leagueImage} />
            </View>
            <Text style={styles.weekText}>Week {week}</Text>

            <View style={styles.matchupContainer}>
                {/* Left Tribe */}
                <View style={styles.tribeCol}>
                    <Image source={{ uri: mockMatchupData.leftTribe.avatar }} style={styles.bigAvatar} />
                    <Text style={styles.tribeName}>{mockMatchupData.leftTribe.name}</Text>

                    <View style={styles.loggedBarContainer}>
                        <View style={styles.loggedCircle}>
                            <MaterialCommunityIcons name="check" size={14} color="white" />
                        </View>
                        <View style={styles.loggedBarBg}>
                            <View style={[styles.loggedBarFill, { width: `${mockMatchupData.leftTribe.loggedPct}%` }]} />
                        </View>
                    </View>
                </View>

                {/* Score */}
                <View style={styles.scoreCol}>
                    <Text style={styles.bigScore}>{mockMatchupData.leftTribe.score}-{mockMatchupData.rightTribe.score}</Text>
                </View>

                {/* Right Tribe */}
                <View style={styles.tribeCol}>
                    <Image source={{ uri: mockMatchupData.rightTribe.avatar }} style={styles.bigAvatarRight} />
                    <Text style={styles.tribeName}>{mockMatchupData.rightTribe.name}</Text>

                    <View style={styles.loggedBarContainer}>
                        <View style={styles.loggedCircle}>
                            <MaterialCommunityIcons name="check" size={14} color="white" />
                        </View>
                        <View style={styles.loggedBarBg}>
                            <View style={[styles.loggedBarFill, { width: `${mockMatchupData.rightTribe.loggedPct}%` }]} />
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.expandButton} onPress={toggleExpand}>
                <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContent}>
                    {mockMatchupData.activeMatchups.map((matchup) => (
                        <View key={matchup.id} style={styles.matchupRow}>
                            <View style={styles.matchupUserLeft}>
                                <Image source={{ uri: matchup.leftUser.avatar }} style={styles.smallAvatar} />
                                <View style={styles.historyNameCol}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName}>{matchup.leftUser.name}</Text>
                                        {renderIcons(matchup.leftUser)}
                                    </View>
                                    <Text style={styles.historyHandle}>{matchup.leftUser.handle}</Text>
                                </View>
                            </View>

                            <View style={styles.historyScoreBox}>
                                <View style={styles.historyScoreRow}>
                                    <Text style={[styles.historyScore, { color: 'white', opacity: 0.8 }]}>{matchup.leftScore}</Text>
                                    <View style={styles.historyDividerHoriz} />
                                    <Text style={[styles.historyScore, { color: 'white', opacity: 0.8 }]}>{matchup.rightScore}</Text>
                                </View>
                            </View>

                            <View style={styles.matchupUserRight}>
                                <View style={[styles.historyNameCol, { alignItems: 'flex-start' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName}>{matchup.rightUser.name}</Text>
                                        {renderIcons(matchup.rightUser)}
                                    </View>
                                    <Text style={styles.historyHandle}>{matchup.rightUser.handle}</Text>
                                </View>
                                <Image source={{ uri: matchup.rightUser.avatar }} style={styles.smallAvatar} />
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
    tribeCol: {
        flex: 1,
        alignItems: 'center',
    },
    scoreCol: {
        width: 120,
        alignItems: 'center',
        paddingTop: 20,
    },
    bigScore: {
        fontSize: 40,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
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
    tribeName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 15,
    },
    loggedBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 5,
        gap: 5,
    },
    loggedCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loggedBarBg: {
        flex: 1,
        height: 24,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    loggedBarFill: {
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
    matchupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    matchupUserLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    matchupUserRight: {
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
        fontSize: 14,
    },
    historyHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    icon: {
        marginLeft: 2,
    },
    historyScoreBox: {
        alignItems: 'center',
        width: 60,
    },
    historyScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyScore: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    historyDividerHoriz: {
        width: 12,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
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
