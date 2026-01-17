import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { PostStore } from '@/store/PostStore';
import { FeedPost } from '@/src/shared/models/types';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { useUserStore } from '@/store/UserStore';
import CommentSheet from '@/components/CommentSheet';
import HammerModal from '@/components/HammerModal';
import VerifiedModal from '@/components/VerifiedModal';

export default function DiaryView() {
    const userInfo = useUserStore();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [activeStatus, setActiveStatus] = useState<'natural' | 'enhanced' | 'natural-pending' | 'none'>('none');

    const loadDiary = async () => {
        setRefreshing(true);
        const allPosts = await PostStore.loadPosts();

        const myPosts = allPosts
            .filter((p: FeedPost) => p.user.handle === userInfo.handle || p.user.id === 'u1' || p.user.id === 'currentUser')
            .map(p => {
                if (p.user.handle === userInfo.handle || p.user.id === 'u1' || p.user.id === 'currentUser') {
                    return {
                        ...p,
                        user: {
                            ...p.user,
                            name: userInfo.name,
                            avatar: userInfo.avatar,
                            status: userInfo.status
                        }
                    };
                }
                return p;
            });

        setPosts(myPosts);
        setRefreshing(false);
    };

    useEffect(() => {
        loadDiary();
        const unsubscribe = PostStore.subscribe(() => {
            loadDiary();
        });
        return unsubscribe;
    }, [userInfo.handle, userInfo.name, userInfo.avatar, userInfo.status]);

    const handleCommentPress = (post: FeedPost) => {
        setActivePost(post);
        setCommentSheetVisible(true);
    };

    const toggleLike = async (postId: string) => {
        await PostStore.toggleLike(postId);
        // loadDiary will be called by the subscription
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.title}>My Diary</Text>
            <Text style={styles.subtitle}>{posts.length} entries</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <VerifiedModal visible={isVerifiedModalVisible} onClose={() => setVerifiedModalVisible(false)} status={activeStatus} />
            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={userInfo.activity}
                activityIcon={userInfo.activityIcon}
            />
            <CommentSheet
                visible={isCommentSheetVisible}
                onClose={() => {
                    setCommentSheetVisible(false);
                    setActivePost(null);
                }}
                comments={activePost?.comments || []}
            />

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FeedItem
                        post={item}
                        onPressComment={() => handleCommentPress(item)}
                        onPressLike={() => toggleLike(item.id)}
                        onPressVerified={() => {
                            setActiveStatus(item.user.status || 'none');
                            setVerifiedModalVisible(true);
                        }}
                        onPressHammer={() => setHammerModalVisible(true)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadDiary} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="journal" size={60} color={Colors.primary + '33'} />
                        <Text style={styles.emptyText}>No entries yet.</Text>
                        <Text style={styles.emptySubText}>Log a workout or meal to see it here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    listContent: {
        paddingBottom: 20,
    },
    header: {
        padding: 20,
        backgroundColor: Colors.background,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textDark,
    },
    subtitle: {
        color: Colors.textDim,
        marginTop: 4,
        fontSize: 14,
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textDark,
        marginTop: 20,
    },
    emptySubText: {
        color: Colors.textDim,
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    }
});
