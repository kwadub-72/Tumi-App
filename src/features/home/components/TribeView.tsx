import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { generateFakePosts } from '@/src/shared/utils/FakeDataGenerator';
import { FeedPost } from '@/src/shared/models/types';
import FeedItem from '@/src/features/feed/components/FeedItem';

export default function TribeView() {
    const { selectedTribe } = useUserTribeStore();
    const [posts, setPosts] = useState<FeedPost[]>([]);

    useEffect(() => {
        if (selectedTribe) {
            // Generate some random posts for this tribe context
            setPosts(generateFakePosts(10));
        }
    }, [selectedTribe]);

    if (!selectedTribe) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Tribe Activity</Text>
                <Text style={styles.subtitle}>Select a tribe to see updates</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: selectedTribe.themeColor }]}>
            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={{ marginBottom: 15 }}>
                        <FeedItem post={item} isDetailView={false} />
                    </View>
                )}
                contentContainerStyle={{ padding: 20 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textDark,
        marginBottom: 10,
    },
    subtitle: {
        color: Colors.textDim,
        fontSize: 16,
    }
});
