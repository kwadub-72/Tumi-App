import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { User } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';

interface NetworkUserCardProps {
    user: User;
    followState: 'following' | 'none' | 'requested';
    onToggleFollow: () => void;
    onPress: () => void;
}

export const NetworkUserCard: React.FC<NetworkUserCardProps> = ({
    user,
    followState,
    onToggleFollow,
    onPress
}) => {
    const renderFollowButton = () => {
        if (followState === 'following') {
            return (
                <TouchableOpacity style={[styles.followButton, styles.buttonFollowing]} onPress={onToggleFollow}>
                    <Ionicons name="person" size={18} color="white" />
                    <Ionicons name="checkmark" size={12} color="white" style={styles.badgeIcon} />
                </TouchableOpacity>
            );
        } else if (followState === 'requested') {
            return (
                <TouchableOpacity style={[styles.followButton, styles.buttonRequested]} onPress={onToggleFollow}>
                    <Ionicons name="person" size={18} color="white" />
                    <Ionicons name="lock-closed" size={12} color="white" style={styles.badgeIcon} />
                </TouchableOpacity>
            );
        } else {
            return (
                <TouchableOpacity style={[styles.followButton, styles.buttonUnfollowed]} onPress={onToggleFollow}>
                    <Ionicons name="person-add" size={18} color={Colors.theme.matteBlack} />
                </TouchableOpacity>
            );
        }
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <Image 
                source={user.avatar ? { uri: user.avatar } : require('@/assets/images/kwadub.jpg')} 
                style={styles.avatar} 
            />
            
            <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                    {user.status === 'natural' && <Ionicons name="leaf" size={16} color={Colors.theme.oliveDrab} style={styles.icon} />}
                    {user.status === 'enhanced' && <MaterialCommunityIcons name="lightning-bolt" size={16} color={Colors.theme.harvestGold} style={styles.icon} />}
                    <ActivityIcon 
                        activity={user.activity || ''} 
                        icon={(user.activityIcon as any) || 'hammer'} 
                        color="white" 
                        size={16} 
                    />
                </View>
                <Text style={styles.handle}>{user.handle.startsWith('@') ? user.handle : `@${user.handle}`}</Text>
            </View>

            {renderFollowButton()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.matteBlack, // Dark card background for Onyx theme
        borderRadius: 40,
        padding: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
        height: 60,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold, // Harvest Gold
        marginRight: 4,
    },
    icon: {
        marginHorizontal: 2,
    },
    handle: {
        fontSize: 12,
        color: Colors.theme.burntSienna, // Burnt Sienna
        marginTop: -2,
    },
    metrics: {
        fontSize: 14,
        color: 'white',
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    },
    followButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    buttonFollowing: {
        backgroundColor: Colors.theme.harvestGold, // Harvest Gold
    },
    buttonUnfollowed: {
        backgroundColor: 'white',
    },
    buttonRequested: {
        backgroundColor: '#666', // Gray
    },
    badgeIcon: {
        position: 'absolute',
        top: 6,
        right: 6,
    }
});
