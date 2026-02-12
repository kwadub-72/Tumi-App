import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { generateFakeTribes, generateFakeUsers } from '@/src/shared/utils/FakeDataGenerator';
import { Tribe, User } from '@/src/shared/models/types';
import MemberCard from '../components/MemberCard';

// Helper to darken color (copied from ProfileScreen, ideally shared)
function darkenColor(hex: string) {
    if (hex.toUpperCase() === '#DEA5A4' || hex.toUpperCase() === '#E6A8A8') return '#5D4037';
    if (hex.toUpperCase() === '#9FB89F') return '#2F3A27';
    if (hex.toUpperCase() === '#007AFF') return '#004080';
    if (hex.toUpperCase() === '#3E0000') return '#1A0000';
    return '#333333';
}

export default function TribeMembersScreen({ tribeId }: { tribeId: string }) {
    const router = useRouter();
    const [tribe, setTribe] = useState<Tribe | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cardColor, setCardColor] = useState('#333');

    useEffect(() => {
        const allTribes = generateFakeTribes();
        const t = allTribes.find(tr => tr.id === tribeId);
        if (t) {
            setTribe(t);
            setCardColor(darkenColor(t.themeColor));
            // Generate fake members
            const m = generateFakeUsers(t.memberCount || 20);
            setMembers(m);
            setFilteredMembers(m);
        }
    }, [tribeId]);

    useEffect(() => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            setFilteredMembers(members.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.handle.toLowerCase().includes(q)
            ));
        } else {
            setFilteredMembers(members);
        }
    }, [searchQuery, members]);

    const handleToggleFollow = (userId: string) => {
        setMembers(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u));
    };

    if (!tribe) return <View style={{ flex: 1, backgroundColor: 'black' }} />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: tribe.themeColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                    <Image source={{ uri: tribe.avatar }} style={styles.headerAvatar} />
                    <Text style={styles.headerTitle}>{tribe.name}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="search" size={20} color="white" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search members..."
                        placeholderTextColor="rgba(255,255,255,0.7)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
            </View>

            <FlatList
                data={filteredMembers}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <MemberCard
                        item={item}
                        cardColor={cardColor}
                        themeColor={tribe.themeColor}
                        onToggleFollow={handleToggleFollow}
                    />
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 15,
        paddingBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginHorizontal: 10,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        borderRadius: 25,
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 40,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 10,
    },
});
