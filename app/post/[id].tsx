import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { FeedPost, Comment } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { PostStore } from '@/store/PostStore';
import { generateFakePosts } from '@/src/shared/utils/FakeDataGenerator';
import { useUserStore } from '@/store/UserStore';
import HammerModal from '@/components/HammerModal';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const userInfo = useUserStore();
    const [post, setPost] = useState<FeedPost | null>(null);

    useEffect(() => {
        const loadPost = async () => {
            const posts = await PostStore.loadPosts();
            let found = posts.find((p: FeedPost) => p.id === id);

            if (!found && typeof id === 'string' && id.startsWith('fake_')) {
                // If it's a fake post, we need to find it in the generated set
                const fakePosts = generateFakePosts(50);
                found = fakePosts.find(p => p.id === id);
            }

            if (found) {
                // Sync self posts
                if (found.user.handle === userInfo.handle) {
                    found = {
                        ...found,
                        user: {
                            ...found.user,
                            name: userInfo.name,
                            avatar: userInfo.avatar,
                            status: userInfo.status
                        }
                    };
                }
                setPost(found);
            }
        };
        loadPost();
    }, [id, userInfo.handle, userInfo.name, userInfo.avatar, userInfo.status]);

    const toggleLike = async () => {
        if (!post) return;
        await PostStore.toggleLike(post.id);
        setPost(prev => {
            if (!prev) return null;
            const isLiked = !prev.isLiked;
            return {
                ...prev,
                isLiked,
                stats: {
                    ...prev.stats,
                    likes: isLiked ? prev.stats.likes + 1 : Math.max(0, prev.stats.likes - 1)
                }
            };
        });
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentItem}>
            <Image
                source={typeof item.user.avatar === 'string' ? { uri: item.user.avatar } : item.user.avatar}
                style={styles.commentAvatar}
            />
            <View style={styles.commentContent}>
                <Text style={styles.commentText}>{item.text}</Text>
                <Text style={styles.commentTime}>Just now</Text>
            </View>
            <View style={styles.commentActions}>
                <TouchableOpacity>
                    <Ionicons name={item.isLiked ? "heart" : "heart-outline"} size={20} color={item.isLiked ? Colors.error : Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.commentLikes}>30</Text>
            </View>
        </View>
    );

    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });

    if (!post) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Post not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post</Text>
                <View style={{ width: 44 }} />
            </View>

            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={hammerData.name}
                activityIcon={hammerData.icon}
            />
            <FlatList
                data={post.comments || []}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                ListHeaderComponent={(
                    <View style={styles.postContainer}>
                        <FeedItem
                            post={post}
                            onPressLike={toggleLike}
                            onPressHammer={() => {
                                setHammerData({
                                    name: post.user.handle === userInfo.handle ? userInfo.activity : (post.user as any).activity || 'Bodybuilder (Bulk)',
                                    icon: post.user.handle === userInfo.handle ? userInfo.activityIcon : post.user.activityIcon || 'hammer'
                                });
                                setHammerModalVisible(true);
                            }}
                        />
                        <View style={styles.divider} />
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    postContainer: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(79, 99, 82, 0.2)',
        marginVertical: 15,
    },
    listContent: {
        paddingBottom: 40,
    },
    commentItem: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(79, 99, 82, 0.1)',
        alignItems: 'flex-start',
    },
    commentAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentText: {
        fontSize: 14,
        color: Colors.primary,
        lineHeight: 18,
    },
    commentTime: {
        fontSize: 11,
        color: 'rgba(79, 99, 82, 0.6)',
        marginTop: 4,
    },
    commentActions: {
        alignItems: 'center',
        marginLeft: 10,
    },
    commentLikes: {
        fontSize: 11,
        color: 'rgba(79, 99, 82, 0.6)',
        marginTop: 2,
    }
});
