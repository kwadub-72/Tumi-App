import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { User } from '@/src/shared/models/types';

interface MemberCardProps {
    item: User;
    cardColor?: string;
    themeColor?: string; // Color for the active follow button
    onToggleFollow: (id: string) => void;
}

export default function MemberCard({ item, cardColor = '#333', themeColor = '#2F3A27', onToggleFollow }: MemberCardProps) {
    return (
        <View style={[styles.memberCard, { backgroundColor: cardColor }]}>
            <Image source={{ uri: typeof item.avatar === 'string' ? item.avatar : 'https://i.pravatar.cc/150' }} style={styles.avatar} />

            <View style={styles.info}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {/* Icons - Mock logic based on user data if available*/}
                    <MaterialCommunityIcons name="leaf" size={14} color="#4ADE80" style={{ marginLeft: 4 }} />
                    <MaterialCommunityIcons name="hammer" size={14} color="white" style={{ marginLeft: 2 }} />
                </View>
                <Text style={styles.handle}>{item.handle}</Text>
                <Text style={styles.stats}>{item.height} • {item.weight} lbs • {item.bfs} BF</Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.followBtn,
                    item.isFollowing ? { backgroundColor: themeColor } : { backgroundColor: 'white' }
                ]}
                onPress={() => onToggleFollow(item.id)}
            >
                <MaterialCommunityIcons
                    name={item.isFollowing ? "account-check" : "account-plus"}
                    size={20}
                    color={item.isFollowing ? "white" : cardColor}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    memberCard: {
        flexDirection: 'row',
        padding: 10,
        borderRadius: 30,
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    info: {
        flex: 1,
        marginLeft: 10,
    },
    name: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    handle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    stats: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    followBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
