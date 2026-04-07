import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import CommentSheet from '@/components/CommentSheet';
import HammerModal from '@/components/HammerModal';
import VerifiedModal from '@/components/VerifiedModal';
import { useAuthStore } from '@/store/AuthStore';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { useMealbookStore } from '@/src/store/useMealbookStore';
import { USDAFoodItem } from '@/src/shared/services/USDAFoodService';

interface TribeViewProps {
    selectedDate: Date;
}

export default function TribeView({ selectedDate }: TribeViewProps) {
    const { session, profile } = useAuthStore();
    const { addBookmark } = useMealbookStore();
    const { selectedTribe } = useUserTribeStore();

    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [activeStatus, setActiveStatus] = useState<'natural' | 'enhanced' | 'natural-pending' | 'none'>('none');
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });
    const [commentsForPost, setCommentsForPost] = useState<FeedPost['comments']>([]);

    const loadFeed = useCallback(async () => {
        if (!session?.user?.id || !selectedTribe) return;
        
        // Convert local selectedTribe id format to UUID if mock is used (b0000000...)
        // the seed script assigned specifically: 'Team Flex' is b0000000-0000-0000-0000-000000000003
        let targetId = selectedTribe.id;
        if (targetId.startsWith('t')) {
            // Temporary mapping for UI tests
            const mockMap: Record<string, string> = {
                't1': 'b0000000-0000-0000-0000-000000000001', // Harvard
                't2': 'b0000000-0000-0000-0000-000000000002', // Iron Brotherhood
                't3': 'b0000000-0000-0000-0000-000000000003', // Team Flex
                't4': 'b0000000-0000-0000-0000-000000000004'  // Cut Squad
            };
            targetId = mockMap[targetId] || targetId;
        }

        const data = await SupabasePostService.getFeed({
            userId: session.user.id,
            feedType: 'tribe',
            date: selectedDate,
            tribeId: targetId,
            limit: 50
        });
        setPosts(data);
    }, [session?.user?.id, selectedDate, selectedTribe]);

    useEffect(() => {
        if (selectedTribe) {
            setLoading(true);
            loadFeed().finally(() => setLoading(false));
        } else {
            setPosts([]);
        }
    }, [loadFeed, selectedTribe]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadFeed();
        setRefreshing(false);
    };

    const toggleLike = async (postId: string) => {
        if (!session?.user?.id) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const wasLiked = post.isLiked || false;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: !wasLiked, stats: { ...p.stats, likes: wasLiked ? p.stats.likes - 1 : p.stats.likes + 1 } } : p));
        await SupabasePostService.toggleLike(postId, session.user.id, wasLiked);
    };

    const toggleSave = async (postId: string) => {
        if (!session?.user?.id) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const wasSaved = post.isSaved || false;

        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isSaved: !wasSaved, stats: { ...p.stats, saves: wasSaved ? p.stats.saves - 1 : p.stats.saves + 1 } } : p));
        await SupabasePostService.toggleBookmark(postId, session.user.id, wasSaved);

        if (!wasSaved && post.meal?.ingredients?.length) {
            post.meal.ingredients.forEach(ing => {
                const food: USDAFoodItem = {
                    fdcId: Math.abs(ing.name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)),
                    name: ing.name,
                    brand: post.meal!.title,
                    servingSizeG: 100,
                    servingSizeText: ing.amount || '100g',
                    caloriesPer100g: ing.cals,
                    macrosPer100g: { p: ing.macros.p, c: ing.macros.c, f: ing.macros.f },
                };
                addBookmark(food);
            });
        }
    };

    const handleCommentPress = async (post: FeedPost) => {
        setActivePost(post);
        const comments = await SupabasePostService.getComments(post.id);
        setCommentsForPost(comments);
        setCommentSheetVisible(true);
    };

    const handleCommentPosted = async (text: string) => {
        if (!activePost || !session?.user?.id || !text.trim()) return;
        const comment = await SupabasePostService.addComment(activePost.id, session.user.id, text.trim());
        if (comment) {
            setCommentsForPost(prev => [...(prev ?? []), comment]);
            setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } } : p));
        }
    };

    const handleCommentDeleted = async (commentId: string) => {
        await SupabasePostService.deleteComment(commentId);
        setCommentsForPost(prev => (prev ?? []).filter(c => c.id !== commentId));
    };

    if (!selectedTribe) {
        return (
            <View style={[styles.centered, { backgroundColor: Colors.background }]}>
                <Ionicons name="people-outline" size={56} color={Colors.textDark + '44'} />
                <Text style={styles.emptyTitle}>Tribe Activity</Text>
                <Text style={styles.emptySubtitle}>Select a tribe to see updates from members.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: selectedTribe.themeColor }]}>
                <ActivityIndicator color={Colors.textDark} size="large" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: selectedTribe.themeColor }]}>
            <VerifiedModal visible={isVerifiedModalVisible} onClose={() => setVerifiedModalVisible(false)} status={activeStatus} />
            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={hammerData.name}
                activityIcon={hammerData.icon}
            />
            <CommentSheet
                visible={isCommentSheetVisible}
                onClose={() => { setCommentSheetVisible(false); setActivePost(null); }}
                comments={commentsForPost || []}
                onCommentPosted={handleCommentPosted}
                onCommentDeleted={handleCommentDeleted}
            />

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FeedItem
                        post={item}
                        onPressVerified={() => { setActiveStatus(item.user.status || 'none'); setVerifiedModalVisible(true); }}
                        onPressHammer={() => {
                            setHammerData({ name: (item.user as any).activity || 'Bodybuilder', icon: (item.user as any).activityIcon || 'hammer' });
                            setHammerModalVisible(true);
                        }}
                        onPressComment={() => handleCommentPress(item)}
                        onPressLike={() => toggleLike(item.id)}
                        onPressSave={() => toggleSave(item.id)}
                    />
                )}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.textDark} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={50} color={Colors.textDark + '66'} />
                        <Text style={styles.emptyTitle}>Quiet in here</Text>
                        <Text style={styles.emptySubtitle}>No posts from {selectedTribe.name} members recently.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', marginTop: '20%' },
    emptyTitle: { color: Colors.textDark, fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubtitle: { color: Colors.textDark + 'AA', fontSize: 13, marginTop: 6, textAlign: 'center' },
    list: { paddingHorizontal: 8, paddingVertical: 16, paddingBottom: 100 },
});
