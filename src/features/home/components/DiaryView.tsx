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
import { useMealbookStore } from '@/src/store/useMealbookStore';
import { USDAFoodItem } from '@/src/shared/services/USDAFoodService';

interface DiaryViewProps {
    selectedDate: Date;
}

export default function DiaryView({ selectedDate }: DiaryViewProps) {
    const { session, profile } = useAuthStore();
    const { addBookmark } = useMealbookStore();

    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [activeStatus, setActiveStatus] = useState<'natural' | 'enhanced' | 'natural-pending' | 'none'>('none');
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });
    const [commentsForPost, setCommentsForPost] = useState<FeedPost['comments']>([]);

    const loadFeed = useCallback(async () => {
        if (!session?.user?.id) return;
        const data = await SupabasePostService.getFeed({
            userId: session.user.id,
            feedType: 'diary',
            date: selectedDate,
            limit: 50
        });
        setPosts(data);
    }, [session?.user?.id, selectedDate]);

    useEffect(() => {
        setLoading(true);
        loadFeed().finally(() => setLoading(false));
    }, [loadFeed]);

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
                    netCarbsPer100g: ing.macros.c,
                    servingUnits: [{ label: '100 g', amount: 100, unit: 'g', gramsPerUnit: 1 }]
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

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.title}>My Diary</Text>
            <Text style={styles.subtitle}>{posts.length} entries for this date</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

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
                onClose={() => { setCommentSheetVisible(false); setActivePost(null); }}
                comments={commentsForPost || []}
                onCommentPosted={handleCommentPosted}
                onCommentDeleted={handleCommentDeleted}
            />

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <FeedItem
                        post={item}
                        onPressVerified={() => { setActiveStatus(item.user.status || 'none'); setVerifiedModalVisible(true); }}
                        onPressHammer={() => {
                            setHammerData({ name: (item.user as any).activity || 'Bodybuilder (Bulk)', icon: (item.user as any).activityIcon || 'hammer' });
                            setHammerModalVisible(true);
                        }}
                        onPressComment={() => handleCommentPress(item)}
                        onPressLike={() => toggleLike(item.id)}
                        onPressSave={() => toggleSave(item.id)}
                    />
                )}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="journal" size={60} color={Colors.primary + '33'} />
                        <Text style={styles.emptyTitle}>No entries yet.</Text>
                        <Text style={styles.emptySubtitle}>Log a workout or meal on this date to see it here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: Colors.background },
    header: { padding: 20, backgroundColor: Colors.background },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.textDark },
    subtitle: { color: Colors.textDim, marginTop: 4, fontSize: 14 },
    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: Colors.textDark, fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubtitle: { color: Colors.textDark + '88', fontSize: 13, marginTop: 6, textAlign: 'center' },
    list: { paddingHorizontal: 8, paddingVertical: 16, paddingBottom: 100 },
});
