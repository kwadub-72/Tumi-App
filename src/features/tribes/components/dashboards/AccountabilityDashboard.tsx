import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Colors } from '../../../../shared/theme/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';

// Dummy data generator
const generateDummyUsers = () => [
    { id: '1', name: 'Kwaku', handle: '@kwadub', avatar: 'https://i.pravatar.cc/100?img=33', logged: true, streak: 1023, progress: '+15/+30 lbs', activity: 'hammer', leaf: true },
    { id: '2', name: 'Michael', handle: '@Michael123456', avatar: 'https://i.pravatar.cc/100?img=60', logged: false, streak: 363, progress: '-15/-50 lbs', activity: 'hammer', leaf: true },
    { id: '3', name: 'Peteyboy', handle: '@CheterMesservy1', avatar: 'https://i.pravatar.cc/100?img=59', logged: false, streak: 363, progress: '74/75 days', activity: 'hammer', leaf: true },
    { id: '4', name: 'Peteyboy2', handle: '@CheterMesservy2', avatar: 'https://i.pravatar.cc/100?img=58', logged: false, streak: 363, progress: '74/75 days', activity: 'hammer', leaf: true },
    { id: '5', name: 'Peteyboy3', handle: '@CheterMesservy3', avatar: 'https://i.pravatar.cc/100?img=57', logged: false, streak: 363, progress: '74/75 days', activity: 'hammer', leaf: true },
    { id: '6', name: 'Peteyboy4', handle: '@CheterMesservy4', avatar: 'https://i.pravatar.cc/100?img=56', logged: false, streak: 363, progress: '74/75 days', activity: 'hammer', leaf: true },
];

export const AccountabilityDashboard = () => {
    const [expanded, setExpanded] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean, title: string, description: string, iconName: any } | null>(null);
    const users = generateDummyUsers();

    const visibleUsers = expanded ? users : users.slice(0, 5);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.dashboardType}>Accountability</Text>

            <View style={styles.header}>
                <Text style={styles.leagueName}>Harvard alum league</Text>
                <Image source={{ uri: 'https://i.pravatar.cc/100?img=26' }} style={styles.leagueImage} />
            </View>

            <View style={styles.tableHeader}>
                <View style={[styles.headerCol, { flex: 2 }]} />
                <View style={[styles.headerCol, { flex: 1, alignItems: 'center' }]}>
                    <Text style={styles.headerText}>Logged</Text>
                </View>
                <View style={[styles.headerCol, { flex: 1, alignItems: 'center' }]}>
                    <Text style={styles.headerText}>Streak</Text>
                </View>
                <View style={[styles.headerCol, { flex: 1.5, alignItems: 'center' }]}>
                    <Text style={styles.headerText}>Progress</Text>
                </View>
            </View>

            {visibleUsers.map((user, index) => (
                <View key={user.id} style={styles.userRow}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        <View style={styles.nameContainer}>
                            <View style={styles.nameRow}>
                                <Text style={styles.userName}>{user.name}</Text>
                                {user.leaf && (
                                    <TouchableOpacity onPress={() => setModalInfo({
                                        visible: true,
                                        title: 'Natural Athlete',
                                        description: 'This user is verified as a natural athlete by the tribe.',
                                        iconName: 'leaf'
                                    })}>
                                        <MaterialCommunityIcons name="leaf" size={14} color="#4ADE80" style={styles.icon} />
                                    </TouchableOpacity>
                                )}
                                {user.activity && (
                                    <TouchableOpacity onPress={() => setModalInfo({
                                        visible: true,
                                        title: 'Tribe Activity',
                                        description: 'This is the verified activity for the user.',
                                        iconName: user.activity
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
                        <Text style={styles.streakText}>{user.streak} days</Text>
                    </View>

                    <View style={[styles.col, { flex: 1.5 }]}>
                        <Text style={styles.progressText}>{user.progress}</Text>
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
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.4)',
        position: 'relative',
    },
    dashboardType: {
        textAlign: 'center',
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 15,
    },
    leagueName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: 'white',
    },
    leagueImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    headerCol: {
        justifyContent: 'center',
    },
    headerText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        gap: 5,
    },
    userInfo: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
    streakText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    progressText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
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
