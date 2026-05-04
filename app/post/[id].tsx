import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, Modal, Pressable, KeyboardAvoidingView, TextInput, Platform, ActivityIndicator, Keyboard, TouchableWithoutFeedback, LayoutAnimation } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { FeedPost, Comment } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { PostStore } from '@/store/PostStore';
import { generateFakePosts } from '@/src/shared/utils/FakeDataGenerator';
import { useUserStore } from '@/store/UserStore';
import HammerModal from '@/components/HammerModal';
import PostOptionsModal from '@/src/features/feed/components/PostOptionsModal';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/AuthStore';

type NavTab = 'Following' | 'Diary' | 'Tribe';

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const userInfo = useUserStore();
    const session = useAuthStore((state) => state.session);
    const insets = useSafeAreaInsets();
    
    const [post, setPost] = useState<FeedPost | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination
    const [commentOffset, setCommentOffset] = useState(0);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const COMMENT_LIMIT = 20;

    const [currentTab, setCurrentTab] = useState<NavTab>('Following');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [showDeleteToast, setShowDeleteToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('Post deleted successfully');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    
    const [commentText, setCommentText] = useState('');
    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);

    const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleTabPress = (tab: NavTab) => {
        router.replace({ pathname: '/(tabs)', params: { tab } });
    };

    const handleToggleSelect = (itemId: string, type: string) => {
        if (type === 'macro') {
            setSelectedItems(prev => prev.includes(itemId) ? [] : [itemId]);
            return;
        }
        setSelectedItems(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);
    };

    const loadPostData = async () => {
        if (!session?.user?.id || typeof id !== 'string') return;
        setLoading(true);
        const { post: loadedPost, comments: loadedComments } = await SupabasePostService.getPostDetails(
            id, 
            session.user.id, 
            0, 
            COMMENT_LIMIT
        );
        
        if (loadedPost) {
            setPost(loadedPost);
            setComments(loadedComments);
            setCommentOffset(loadedComments.length);
            setHasMoreComments(loadedComments.length === COMMENT_LIMIT);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPostData();
    }, [id, session?.user?.id]);

    const loadMoreComments = async () => {
        if (!hasMoreComments || loadingMore || !session?.user?.id || typeof id !== 'string') return;
        setLoadingMore(true);
        
        const { comments: newComments } = await SupabasePostService.getPostDetails(
            id,
            session.user.id,
            commentOffset,
            COMMENT_LIMIT
        );
        
        if (newComments.length > 0) {
            setComments(prev => [...prev, ...newComments]);
            setCommentOffset(prev => prev + newComments.length);
            if (newComments.length < COMMENT_LIMIT) {
                setHasMoreComments(false);
            }
        } else {
            setHasMoreComments(false);
        }
        setLoadingMore(false);
    };

    const toggleLike = async () => {
        if (!post || !session?.user?.id) return;
        const wasLiked = post.isLiked;
        
        setPost(prev => {
            if (!prev) return null;
            return {
                ...prev,
                isLiked: !wasLiked,
                stats: {
                    ...prev.stats,
                    likes: !wasLiked ? prev.stats.likes + 1 : Math.max(0, prev.stats.likes - 1)
                }
            };
        });
        
        await SupabasePostService.toggleLike(post.id, session.user.id, !!wasLiked);
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || !post || !session?.user?.id) return;
        
        const newComment = await SupabasePostService.addComment(post.id, session.user.id, commentText.trim());
        if (newComment) {
            setComments(prev => [newComment, ...prev]);
            setPost(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    stats: { ...prev.stats, comments: prev.stats.comments + 1 }
                };
            });
            setCommentText('');
            Keyboard.dismiss();
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
    };

    const toggleCommentLike = async (commentId: string, currentlyLiked: boolean) => {
        if (!session?.user?.id) return;
        
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    isLiked: !currentlyLiked,
                    likes: !currentlyLiked ? c.likes + 1 : Math.max(0, c.likes - 1)
                };
            }
            return c;
        }));
        
        await SupabasePostService.toggleCommentLike(commentId, session.user.id, currentlyLiked);
    };

    const handlePressCommentIcon = () => {
        inputRef.current?.focus();
        flatListRef.current?.scrollToEnd({ animated: true });
    };

    const handleDeletePost = async () => {
        if (!post) return;
        setOptionsModalVisible(false);
        try {
            await SupabasePostService.deletePost(post.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowDeleteToast(true);
            setToastMessage('Post deleted successfully');
            setToastType('success');
            setTimeout(() => {
                setShowDeleteToast(false);
                router.back();
            }, 1000);
        } catch (error) {
            console.error('Failed to delete post:', error);
        }
    };

    const renderComment = ({ item, index }: { item: Comment, index: number }) => (
        <View key={item.id} style={styles.commentRowWrapper}>
            <View style={styles.commentItem}>
                <Image
                    source={typeof item.user.avatar === 'string' ? { uri: item.user.avatar } : item.user.avatar}
                    style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeaderLine}>
                        <Text style={styles.commentHandle}>{item.user.handle}</Text>
                        {item.user.status && (item.user.status === 'natural' || item.user.status === 'enhanced') && (
                            item.user.status === 'enhanced' ? (
                                <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FFD700" style={{ marginLeft: 2 }} />
                            ) : (
                                <Ionicons name="leaf" size={12} color={Colors.success} style={{ marginLeft: 2 }} />
                            )
                        )}
                        {item.user.handle === '@kwadub' && <Ionicons name="hammer" size={12} color={Colors.primary} style={{ marginLeft: 2 }} />}
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                </View>

                <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => toggleCommentLike(item.id, item.isLiked || false)}>
                        <Ionicons 
                            name={item.isLiked ? "heart" : "heart-outline"} 
                            size={20} 
                            color={item.isLiked ? Colors.primary : Colors.primary + '66'} 
                        />
                    </TouchableOpacity>
                    <Text style={styles.commentLikes}>{item.likes}</Text>
                    <Text style={styles.commentTime}>{formatTimeAgo(item.timestamp)}</Text>
                </View>
            </View>
        </View>
    );

    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Post not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const handleAddToMealLog = async () => {
        if (!post?.meal || !session?.user?.id) return;
        
        if (isSelectMode && selectedItems.length === 0) {
            setOptionsModalVisible(false);
            setToastMessage('Select items to add, or exit selection mode and press "Add to meal book" to add all');
            setToastType('error');
            setShowDeleteToast(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => setShowDeleteToast(false), 3500);
            return;
        }

        setOptionsModalVisible(false);
        setIsSelectMode(false);
        
        try {
            const itemsToSave = selectedItems.length > 0 
                ? post.meal.ingredients.filter((ing: any) => selectedItems.includes(ing.name))
                : post.meal.ingredients;

            for (const item of itemsToSave) {
                await SupabasePostService.addToMealLog(session.user.id, {
                    item_name: item.name,
                    calories: item.cals || 0,
                    protein: item.macros?.p || 0,
                    carbs: item.macros?.c || 0,
                    fats: item.macros?.f || 0,
                    portion_size: item.amount || '',
                    original_post_id: post.id
                });
            }
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastType('success');
            setShowDeleteToast(true);
            setToastMessage(`${itemsToSave.length} item${itemsToSave.length > 1 ? 's' : ''} added to Meal book`);
            setTimeout(() => {
                setShowDeleteToast(false);
            }, 2000);
            
            setSelectedItems([]);
        } catch (error) {
            console.error('Failed to add to meal log:', error);
        }
    };

    const handleAddToLiftBook = async () => {
        if (!post?.workout || !session?.user?.id) return;
        
        if (isSelectMode && selectedItems.length === 0) {
            setOptionsModalVisible(false);
            setToastMessage('Please select at least one exercise to add to your Lift book.');
            setToastType('error');
            setShowDeleteToast(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => setShowDeleteToast(false), 3500);
            return;
        }

        setOptionsModalVisible(false);
        setIsSelectMode(false);
        
        try {
            const exerciseIds = selectedItems.length > 0 ? selectedItems : undefined;
            await SupabasePostService.copyToLiftBook(session.user.id, post.id, exerciseIds);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastType('success');
            setShowDeleteToast(true);
            const count = exerciseIds ? exerciseIds.length : post.workout.exercises.length;
            setToastMessage(`${count} exercise${count > 1 ? 's' : ''} added to Lift book`);
            setTimeout(() => {
                setShowDeleteToast(false);
            }, 2000);
            
            setSelectedItems([]);
        } catch (error) {
            console.error('Failed to add to lift book:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <TouchableWithoutFeedback onPress={() => {
                    if (isSelectMode) {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsSelectMode(false);
                        setSelectedItems([]);
                    }
                }}>
                    <View style={StyleSheet.absoluteFill} pointerEvents={isSelectMode ? 'auto' : 'none'} />
                </TouchableWithoutFeedback>

                <View style={styles.headerRow} pointerEvents="box-none">
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <PostOptionsModal
                    visible={isOptionsModalVisible}
                    onClose={() => setOptionsModalVisible(false)}
                    isOwner={post?.user.id === session?.user.id}
                    onDelete={handleDeletePost}
                    onReport={() => setOptionsModalVisible(false)}
                    onAddToMealBook={post.meal ? handleAddToMealLog : undefined}
                    onAddToLiftBook={post.workout ? handleAddToLiftBook : undefined}
                    onSelectItems={() => {
                        setOptionsModalVisible(false);
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsSelectMode(true);
                        setSelectedItems([]);
                        setTimeout(() => {
                            flatListRef.current?.scrollToOffset({ offset: 120, animated: true });
                        }, 300);
                    }}
                />

                {showDeleteToast && (
                    <View style={styles.toastContainer} pointerEvents="none">
                        <View style={[styles.toast, toastType === 'error' && styles.toastError]}>
                            <Ionicons 
                                name={toastType === 'error' ? "close-circle" : "checkmark-circle"} 
                                size={20} 
                                color={toastType === 'error' ? "white" : "#F5F5DC"} 
                            />
                            <Text style={[styles.toastText, toastType === 'error' && { color: 'white' }]}>
                                {toastMessage}
                            </Text>
                        </View>
                    </View>
                )}

                <HammerModal
                    visible={isHammerModalVisible}
                    onClose={() => setHammerModalVisible(false)}
                    activityName={hammerData.name}
                    activityIcon={hammerData.icon}
                />

                <FlatList
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderComment}
                    ListHeaderComponent={(
                        <View style={styles.postContainer}>
                            {/* @ts-ignore */}
                            <Animated.View sharedTransitionTag={`post-${post.id}`}>
                                <FeedItem
                                    post={post}
                                    isSelectMode={isSelectMode}
                                    selectedItems={selectedItems}
                                    onToggleSelect={handleToggleSelect}
                                    onPressOptions={() => {
                                        setOptionsModalVisible(true);
                                    }}
                                    onPressLike={toggleLike}
                                    onPressComment={handlePressCommentIcon}
                                    onPressHammer={() => {
                                        setHammerData({
                                            name: post.user.handle === userInfo.handle ? userInfo.activity : (post.user as any).activity || 'Bodybuilder (Bulk)',
                                            icon: post.user.handle === userInfo.handle ? userInfo.activityIcon : post.user.activityIcon || 'hammer'
                                        });
                                        setHammerModalVisible(true);
                                    }}
                                    onDismissSelectMode={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setIsSelectMode(false);
                                        setSelectedItems([]);
                                    }}
                                />
                            </Animated.View>
                            {comments.length > 0 && (
                                <View style={styles.commentsWrapperHeader}>
                                    <Text style={styles.commentsHeaderText}>Comments</Text>
                                </View>
                            )}
                        </View>
                    )}
                    onEndReached={loadMoreComments}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={() => loadingMore ? <ActivityIndicator size="small" color="white" style={{ marginVertical: 10 }} /> : null}
                />
                
                <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    <TextInput
                        ref={inputRef}
                        style={styles.inputField}
                        placeholder="Comment..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={commentText}
                        onChangeText={setCommentText}
                        onSubmitEditing={handleAddComment}
                        returnKeyType="send"
                    />
                </View>
            </KeyboardAvoidingView>
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 10,
        marginBottom: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        marginTop: 5,
    },
    topNavWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.topNavBackground,
        borderRadius: 25,
        padding: 5,
        alignSelf: 'stretch',
        marginHorizontal: 10,
        justifyContent: 'space-between',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabButtonActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6E7A66',
    },
    tabTextActive: {
        color: 'white',
    },
    dateButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 15,
        marginTop: 10,
    },
    dateButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    postContainer: {
        paddingHorizontal: 8,
        paddingTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(79, 99, 82, 0.2)',
        marginVertical: 15,
    },
    listContent: {
        paddingBottom: 20,
    },
    commentRowWrapper: {
        backgroundColor: Colors.background,
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'flex-start',
    },
    commentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1.5,
        borderColor: '#4F6352',
    },
    commentContent: {
        flex: 1,
    },
    commentHeaderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentName: {
        fontWeight: 'bold',
        fontSize: 14,
        color: Colors.primary,
        marginRight: 4,
    },
    commentHandleRow: {
        marginBottom: 4,
    },
    commentHandle: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 4,
    },
    commentText: {
        fontSize: 15,
        color: Colors.primary,
        lineHeight: 20,
        opacity: 0.9,
    },
    commentActions: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    commentLikes: {
        fontSize: 12,
        color: Colors.primary,
        opacity: 0.6,
        marginTop: 2,
    },
    commentTime: {
        fontSize: 10,
        color: Colors.primary,
        opacity: 0.4,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    commentsWrapperHeader: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    commentsHeaderText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputWrapper: {
        backgroundColor: Colors.background,
        paddingVertical: 15,
        paddingBottom: Platform.OS === 'ios' ? 35 : 20,
        paddingHorizontal: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    inputField: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 50,
        color: Colors.primary,
        fontSize: 16,
    },
    toastContainer: {
        position: 'absolute',
        top: 100, // Show below header
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
        paddingHorizontal: 20,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F6352',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        width: '100%',
    },
    toastError: {
        backgroundColor: '#EF4444',
    },
    toastText: {
        color: '#F5F5DC',
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 1,
        lineHeight: 20,
    },
});
