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
import { supabase } from '@/src/shared/services/supabase';
import { useMacrobookStore } from '@/src/store/useMacrobookStore';
import { useMealbookStore } from '@/src/store/useMealbookStore';
import * as Haptics from 'expo-haptics';

interface DiaryViewProps {
    selectedDate: Date;
}

export default function DiaryView({ selectedDate }: DiaryViewProps) {
    const { session, profile } = useAuthStore();
    const { addBookmark } = useMealbookStore();
    const macrobookStore = useMacrobookStore();

    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [showDeleteToast, setShowDeleteToast] = useState(false);
    const [activeStatus, setActiveStatus] = useState<'natural' | 'enhanced' | 'natural-pending' | 'none'>('none');
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });
    const [commentsForPost, setCommentsForPost] = useState<FeedPost['comments']>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [toastMessage, setToastMessage] = useState('Post deleted successfully');

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

    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel(`diary-feed-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts',
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const updatedPost = payload.new;
                    setPosts(prev => prev.map(p => p.id === updatedPost.id 
                        ? { 
                            ...p, 
                            stats: { 
                                ...p.stats, 
                                likes: updatedPost.like_count, 
                                comments: updatedPost.comment_count 
                            } 
                          } 
                        : p
                    ));
                } else if (payload.eventType === 'DELETE') {
                    const deletedId = payload.old.id;
                    setPosts(prev => prev.filter(p => p.id !== deletedId));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

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
        setCommentsForPost([]); // Clear previous to avoid flash
        setCommentSheetVisible(true); // Show immediately
        setCommentsLoading(true);

        const comments = await SupabasePostService.getComments(post.id, session?.user?.id);
        setCommentsForPost(comments);
        setCommentsLoading(false);
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

    const handleDeletePost = async () => {
        if (!activePost) return;
        const postId = activePost.id;
        
        // Optimistic UI removal
        setPosts(prev => prev.filter(p => p.id !== postId));
        setOptionsModalVisible(false);
        setActivePost(null);

        try {
            await SupabasePostService.deletePost(postId);
            
            // Show toast
            setToastMessage('Post deleted successfully');
            setShowDeleteToast(true);
            setTimeout(() => setShowDeleteToast(false), 2000);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Failed to delete post:', error);
            // Re-fetch or handle error if needed
        }
    };

    const handleAddToMacroBook = () => {
        if (!activePost) return;
        
        if (activePost.macroUpdate) {
            const mu = activePost.macroUpdate;
            macrobookStore.addEntry({
                label: `Update from ${activePost.user.handle}`,
                calories: mu.newTargets.calories,
                p: mu.newTargets.p,
                c: mu.newTargets.c,
                f: mu.newTargets.f,
            });
        } else if (activePost.snapshot) {
            const snap = activePost.snapshot;
            macrobookStore.addEntry({
                label: `Snapshot from ${activePost.user.handle}`,
                calories: snap.targets.calories,
                p: snap.targets.p,
                c: snap.targets.c,
                f: snap.targets.f,
            });
        }

        setOptionsModalVisible(false);
        setActivePost(null);
        
        setToastMessage('Added to macro book');
        setShowDeleteToast(true);
        setTimeout(() => setShowDeleteToast(false), 2000);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleToggleSelect = (itemId: string, itemType: string) => {
        setSelectedItems(prev => 
            prev.includes(itemId) 
                ? prev.filter(id => id !== itemId) 
                : [...prev, itemId]
        );
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
                loading={commentsLoading}
                onCommentPosted={handleCommentPosted}
                onCommentDeleted={handleCommentDeleted}
            />

            <PostOptionsModal
                visible={isOptionsModalVisible}
                onClose={() => { setOptionsModalVisible(false); setActivePost(null); }}
                isOwner={activePost?.user.id === session?.user.id}
                onDelete={handleDeletePost}
                onReport={() => setOptionsModalVisible(false)}
                onSelectItems={() => {
                    setIsSelectMode(true);
                    setOptionsModalVisible(false);
                }}
                onAddToMacroBook={handleAddToMacroBook}
            />

            {showDeleteToast && (
                <View style={styles.toastContainer}>
                    <View style={styles.toast}>
                        <Ionicons name="checkmark-circle" size={20} color="#F5F5DC" />
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </View>
                </View>
            )}

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
                        onPressOptions={() => {
                            setActivePost(item);
                            setOptionsModalVisible(true);
                        }}
                        isSelectMode={isSelectMode && activePost?.id === item.id}
                        selectedItems={selectedItems}
                        onToggleSelect={handleToggleSelect}
                        onDismissSelectMode={() => {
                            setIsSelectMode(false);
                            setSelectedItems([]);
                            setActivePost(null);
                        }}
                        sharedTransitionTag={`post-${item.id}`}
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
    toastContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F6352',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 100,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    toastText: {
        color: '#F5F5DC',
        fontSize: 16,
        fontWeight: '600',
    },
});
