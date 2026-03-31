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

const generateDummyLeaderboard = () => [
    { id: '1', rank: 1, name: 'Kwaku', handle: '@kwadub', avatar: 'https://i.pravatar.cc/100?img=33', logged: true, trend: 10, trendDir: 'up', points: 1000, leaf: true, activity: 'hammer' },
    { id: '2', rank: 2, name: 'Michael', handle: '@Michael123456', avatar: 'https://i.pravatar.cc/100?img=60', logged: false, trend: 5, trendDir: 'up', points: 900, leaf: true, activity: 'hammer' },
    { id: '3', rank: 3, name: 'Peteyboy', handle: '@CheterMesservy1', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 2, trendDir: 'down', points: 600, leaf: true, activity: 'hammer' },
    { id: '4', rank: 4, name: 'Peteyboy', handle: '@CheterMesservy2', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 2, trendDir: 'down', points: 500, leaf: true, activity: 'hammer' },
    { id: '5', rank: 5, name: 'Peteyboy', handle: '@CheterMesservy3', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 300, leaf: true, activity: 'hammer' },
    { id: '6', rank: 6, name: 'Peteyboy', handle: '@CheterMesservy4', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 200, leaf: true, activity: 'hammer' },
    { id: '7', rank: 7, name: 'Peteyboy', handle: '@CheterMesservy5', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 190, leaf: true, activity: 'hammer' },
    { id: '8', rank: 8, name: 'Peteyboy', handle: '@CheterMesservy6', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 180, leaf: true, activity: 'hammer' },
    { id: '9', rank: 9, name: 'Peteyboy', handle: '@CheterMesservy7', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 150, leaf: true, activity: 'hammer' },
    { id: '10', rank: 10, name: 'Peteyboy', handle: '@CheterMesservy8', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 140, leaf: true, activity: 'hammer' },
    { id: '11', rank: 11, name: 'Peteyboy', handle: '@CheterMesservy9', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, trend: 0, trendDir: 'none', points: 120, leaf: true, activity: 'hammer' },
];

export const PremierH2HLeaderboardDashboard = () => {
    const [expanded, setExpanded] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean, title: string, description: string, iconName: any } | null>(null);
    const week = getCompetitionWeek();
    const users = generateDummyLeaderboard();

    const visibleUsers = expanded ? users : users.slice(0, 5);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.dashboardType}>Premier • Head-to-Head • Habits</Text>

            <View style={styles.header}>
                <Text style={styles.leagueName}>Team flex</Text>
                <Image source={{ uri: 'https://i.pravatar.cc/100?img=26' }} style={styles.leagueImage} />
            </View>
            <Text style={styles.weekText}>Week {week}</Text>

            <View style={styles.tableHeader}>
                <View style={[styles.headerCol, { flex: 2 }]} />
                <View style={[styles.headerCol, { flex: 1, alignItems: 'center' }]}>
                    <Text style={styles.headerText}>Logged</Text>
                </View>
                <View style={[styles.headerCol, { flex: 1, alignItems: 'center' }]}>
                    <Text style={styles.headerText}>Trend</Text>
                </View>
                <View style={[styles.headerCol, { flex: 1, alignItems: 'center' }]}>
                    <Text style={styles.headerText}>Points</Text>
                </View>
            </View>

            {visibleUsers.map((user) => (
                <View key={user.id} style={styles.userRow}>
                    <Text style={styles.rankNum}>#{user.rank}</Text>

                    <View style={styles.userInfo}>
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        <View style={styles.nameContainer}>
                            <View style={styles.nameRow}>
                                <Text style={styles.userName}>{user.name}</Text>
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
                            </View>
                            <Text style={styles.userHandle}>{user.handle}</Text>
                        </View>
                    </View>

                    <View style={styles.iconCol}>
                        {user.logged ? (
                            <View style={styles.loggedCircle}>
                                <MaterialCommunityIcons name="check" size={16} color="white" />
                            </View>
                        ) : (
                            <View style={styles.unloggedCircle} />
                        )}
                    </View>

                    <View style={styles.col}>
                        {user.trendDir === 'up' && (
                            <View style={styles.trendContainer}>
                                <MaterialCommunityIcons name="menu-up" size={24} color="#4ADE80" style={{ marginTop: 2 }} />
                                <Text style={[styles.trendText, { color: '#4ADE80' }]}>{user.trend}</Text>
                            </View>
                        )}
                        {user.trendDir === 'down' && (
                            <View style={styles.trendContainer}>
                                <MaterialCommunityIcons name="menu-down" size={24} color={Colors.error} style={{ marginTop: -2 }} />
                                <Text style={[styles.trendText, { color: Colors.error }]}>{user.trend}</Text>
                            </View>
                        )}
                        {user.trendDir === 'none' && (
                            <Text style={[styles.trendText, { color: 'white', opacity: 0.8 }]}>-</Text>
                        )}
                    </View>

                    <View style={styles.col}>
                        <Text style={styles.pointsText}>{user.points}</Text>
                    </View>
                </View>
            ))}

            <TouchableOpacity style={styles.expandButton} onPress={toggleExpand}>
                <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" />
            </TouchableOpacity>

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
        fontSize: 12,
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
    tableHeader: {
        flexDirection: 'row',
        marginBottom: 10,
        paddingLeft: 20,
    },
    headerCol: {
        justifyContent: 'center',
    },
    headerText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        gap: 5,
        position: 'relative',
    },
    rankNum: {
        position: 'absolute',
        top: 15,
        left: -5,
        fontSize: 12,
        fontWeight: 'bold',
        color: 'white',
    },
    userInfo: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 18,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    nameContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    userHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: -2,
    },
    icon: {
        marginLeft: 2,
    },
    iconCol: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    col: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loggedCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unloggedCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 3,
        borderColor: 'white',
        backgroundColor: 'transparent',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendText: {
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: -2,
    },
    pointsText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
        opacity: 0.8,
    },
    expandButton: {
        alignItems: 'center',
        marginTop: 15,
        padding: 5,
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
