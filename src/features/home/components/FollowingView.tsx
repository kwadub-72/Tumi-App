import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, View } from 'react-native';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useEffect, useState } from 'react';
import CommentSheet from '@/components/CommentSheet';
import HammerModal from '@/components/HammerModal';
import VerifiedModal from '@/components/VerifiedModal';
import { PostStore } from '@/store/PostStore';
import { useUserStore } from '@/store/UserStore';
import { generateFakePosts } from '@/src/shared/utils/FakeDataGenerator';

export default function FollowingView() {
    const userInfo = useUserStore();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [activeStatus, setActiveStatus] = useState<'natural' | 'enhanced' | 'natural-pending' | 'none'>('none');
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });

    useEffect(() => {
        const load = async () => {
            const stored = await PostStore.loadPosts();

            // Generate 40 fake posts
            const fakePosts = generateFakePosts(40);

            // Filter self posts from PostStore
            const kwadubPosts = stored.filter(p => p.user.handle === userInfo.handle);

            // Override self posts with latest userInfo
            const syncedKwadubPosts = kwadubPosts.map(p => ({
                ...p,
                user: {
                    ...p.user,
                    name: userInfo.name,
                    avatar: userInfo.avatar,
                    status: userInfo.status
                }
            }));

            // Merge: self posts first, then fakes (filtering out any fakes that are now in stored - e.g. because they were liked)
            const storedIds = new Set(stored.map(p => p.id));
            const filteredFakes = fakePosts.filter(p => !storedIds.has(p.id));

            setPosts([...syncedKwadubPosts, ...filteredFakes]);
        };
        load();

        // Subscribe to PostStore changes
        return PostStore.subscribe(() => load());
    }, [userInfo.handle, userInfo.name, userInfo.avatar, userInfo.status]);

    const toggleLike = async (postId: string, postData?: FeedPost) => {
        await PostStore.toggleLike(postId, postData);
        // Page will reload via subscription
    };

    const handleCommentPress = (post: FeedPost) => {
        setActivePost(post);
        setCommentSheetVisible(true);
    };

    return (
        <View style={styles.container}>
            <VerifiedModal visible={isVerifiedModalVisible} onClose={() => setVerifiedModalVisible(false)} status={activeStatus} />
            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={hammerData.name}
                activityIcon={hammerData.icon}
            />
            <CommentSheet
                visible={isCommentSheetVisible}
                onClose={() => {
                    setCommentSheetVisible(false);
                    setActivePost(null);
                }}
                comments={activePost?.comments || []}
                onCommentPosted={() => { }}
                onCommentDeleted={() => { }}
            />

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FeedItem
                        post={item}
                        onPressVerified={() => {
                            setActiveStatus(item.user.status || 'none');
                            setVerifiedModalVisible(true);
                        }}
                        onPressHammer={() => {
                            setHammerData({
                                name: item.user.handle === userInfo.handle ? userInfo.activity : (item.user as any).activity || 'Bodybuilder (Bulk)',
                                icon: item.user.handle === userInfo.handle ? userInfo.activityIcon : item.user.activityIcon || 'hammer'
                            });
                            setHammerModalVisible(true);
                        }}
                        onPressComment={() => handleCommentPress(item)}
                        onPressLike={() => toggleLike(item.id, item)}
                    />
                )}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    list: {
        paddingHorizontal: 8,
        paddingVertical: 16,
        paddingBottom: 100,
    },
});
