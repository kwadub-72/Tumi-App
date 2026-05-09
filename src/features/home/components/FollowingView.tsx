import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { useMealbookStore } from '@/src/store/useMealbookStore';
import { USDAFoodItem } from '@/src/shared/services/USDAFoodService';
import PostOptionsModal from '@/src/features/feed/components/PostOptionsModal';
import * as Haptics from 'expo-haptics';

interface FollowingViewProps {
    selectedDate: Date;
}

export default function FollowingView({ selectedDate }: FollowingViewProps) {
    const { session, profile } = useAuthStore();
    const { addBookmark } = useMealbookStore();

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
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const loadFeed = useCallback(async () => {
        if (!session?.user?.id) return;
        const data = await SupabasePostService.getFeed({
            userId: session.user.id,
            feedType: 'following',
            date: selectedDate,
        });
        setPosts(data);
    }, [session?.user?.id, selectedDate]);

    useFocusEffect(
        useCallback(() => {
            let isInitial = false;
            setPosts((prev) => {
                if (prev.length === 0) isInitial = true;
                return prev;
            });
            if (isInitial) setLoading(true);

            loadFeed().finally(() => setLoading(false));
        }, [loadFeed])
    );

    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel(`following-feed-${Math.random().toString(36).slice(2)}`)
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
        const wasLiked = post.isLiked;
        // Optimistic update
        setPosts(prev => prev.map(p => p.id === postId
            ? { ...p, isLiked: !wasLiked, stats: { ...p.stats, likes: wasLiked ? p.stats.likes - 1 : p.stats.likes + 1 } }
            : p
        ));
        await SupabasePostService.toggleLike(postId, session.user.id, !!wasLiked);
    };

    const toggleSave = async (postId: string) => {
        if (!session?.user?.id) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const wasSaved = post.isSaved;
        // Optimistic update
        setPosts(prev => prev.map(p => p.id === postId
            ? { ...p, isSaved: !wasSaved, stats: { ...p.stats, saves: wasSaved ? p.stats.saves - 1 : p.stats.saves + 1 } }
            : p
        ));
        await SupabasePostService.toggleBookmark(postId, session.user.id, !!wasSaved);

        // Also save meal ingredients to local mealbook when bookmarking
        if (!wasSaved && post.meal?.ingredients?.length) {
            post.meal.ingredients.forEach(ing => {
                const food: USDAFoodItem = {
                    fdcId: Math.abs(ing.name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)),
                    name: ing.name,
                    brand: post.meal!.title,
                    servingSizeG: 100,
                    servingSizeText: ing.amount || '100g',
                    caloriesPer100g: Math.round((ing.macros?.p || 0) * 4 + (ing.macros?.c || 0) * 4 + (ing.macros?.f || 0) * 9),
                    macrosPer100g: { p: ing.macros?.p || 0, c: ing.macros?.c || 0, f: ing.macros?.f || 0 },
                    netCarbsPer100g: ing.macros?.c || 0, // basic fallback
                    servingUnits: [],
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
            setPosts(prev => prev.map(p => p.id === activePost.id
                ? { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } }
                : p
            ));
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
            setToastType('success');
            setToastMessage('Post deleted successfully');
            setShowDeleteToast(true);
            setTimeout(() => setShowDeleteToast(false), 2000);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Failed to delete post:', error);
            // Re-fetch or handle error if needed
        }
    };

    const handleToggleSelect = (postId: string, itemId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        if (!isSelectMode || activePost?.id !== postId) {
            setIsSelectMode(true);
            setActivePost(post);
            setSelectedItems([itemId]);
            Haptics.selectionAsync();
        } else {
            setSelectedItems(prev => {
                const next = prev.includes(itemId)
                    ? prev.filter(i => i !== itemId)
                    : [...prev, itemId];
                Haptics.selectionAsync();
                return next;
            });
        }
    };

    const handleCopySuccess = () => {
        setIsSelectMode(false);
        setSelectedItems([]);
        setActivePost(null);
    };

    const handleCopyError = (msg: string) => {
        setToastType('error');
        setToastMessage(msg);
        setShowDeleteToast(true);
        setTimeout(() => setShowDeleteToast(false), 2500);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (posts.length === 0) {
        return (
            <View style={styles.centered}>
                <Ionicons name="people-outline" size={56} color={Colors.primary + '66'} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySubtitle}>
                    Follow people to see their posts from the last 7 days
                </Text>
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
            />

            {showDeleteToast && (
                <View style={styles.toastContainer}>
                    <View style={[styles.toast, toastType === 'error' && { backgroundColor: '#825858' }]}>
                        <Ionicons 
                            name={toastType === 'success' ? "checkmark-circle" : "close-circle"} 
                            size={20} 
                            color="#F5F5DC" 
                        />
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </View>
                </View>
            )}

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
                                name: (item.user as any).activity || 'Bodybuilder (Bulk)',
                                icon: (item.user as any).activityIcon || 'hammer',
                            });
                            setHammerModalVisible(true);
                        }}
                        onPressComment={() => handleCommentPress(item)}
                        onPressLike={() => toggleLike(item.id)}
                        onPressSave={() => toggleSave(item.id)}
                        onPressOptions={() => {
                            setActivePost(item);
                            setOptionsModalVisible(true);
                        }}
                        onDismissSelectMode={() => {
                            setIsSelectMode(false);
                            setSelectedItems([]);
                        }}
                        onCopySuccess={handleCopySuccess}
                        onCopyError={handleCopyError}
                        isSelectMode={isSelectMode && activePost?.id === item.id}
                        selectedItems={selectedItems}
                        onToggleSelect={(itemId) => handleToggleSelect(item.id, itemId)}
                        sharedTransitionTag={`post-${item.id}`}
                    />
                )}

                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: Colors.background },
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
