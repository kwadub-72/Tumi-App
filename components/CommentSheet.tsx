import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { Colors } from '../src/shared/theme/Colors';
import { formatTimeAgo } from '../utils/time';
import { Comment } from '../src/shared/models/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentSheetProps {
    visible: boolean;
    onClose: () => void;
    comments?: Comment[];
    onCommentPosted?: (text: string) => void;
    onCommentDeleted?: (id: string) => void;
}

export default function CommentSheet({
    visible,
    onClose,
    comments: initialComments = [],
    onCommentPosted,
    onCommentDeleted
}: CommentSheetProps) {
    const translateY = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        setComments(initialComments);
    }, [initialComments]);

    useEffect(() => {
        if (visible) {
            translateY.value = 0;
        }
    }, [visible]);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY + context.value.y;
            }
        })
        .onEnd((event) => {
            if (translateY.value > 150 || event.velocityY > 500) {
                translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
                    runOnJS(onClose)();
                });
            } else {
                translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const toggleLike = (commentId: string) => {
        setComments(current => current.map(comment => {
            if (comment.id === commentId) {
                const isLiked = !comment.isLiked;
                return {
                    ...comment,
                    isLiked,
                    likes: isLiked ? comment.likes + 1 : comment.likes - 1
                };
            }
            return comment;
        }));
    };

    const deleteComment = (commentId: string) => {
        setComments(current => current.filter(c => c.id !== commentId));
        if (onCommentDeleted) onCommentDeleted(commentId);
    };

    const handleSubmit = () => {
        if (inputText.trim().length === 0) return;

        const fakeNewComment: Comment = {
            id: Date.now().toString(),
            user: {
                id: 'me',
                name: 'You',
                handle: '@me',
                avatar: require('../assets/images/kwadub.jpg'), // Default avatar
                status: 'natural',
                verified: true
            },
            text: inputText,
            timestamp: Date.now(),
            likes: 0,
            isLiked: false,
        };

        setComments([fakeNewComment, ...comments]);
        if (onCommentPosted) onCommentPosted(inputText);
        setInputText('');
    };

    const SwipeableItem = ({ children, onRemove, isMine }: { children: React.ReactNode, onRemove: () => void, isMine: boolean }) => {
        if (!isMine) return <View>{children}</View>;

        const translateX = useSharedValue(0);
        const iconScale = useSharedValue(0.5);

        const itemPan = Gesture.Pan()
            .activeOffsetX([-10, 10])
            .onUpdate((event) => {
                translateX.value = Math.min(0, event.translationX);
                iconScale.value = Math.min(1.2, Math.abs(event.translationX) / 80 + 0.5);
            })
            .onEnd((event) => {
                if (translateX.value < -80 || event.velocityX < -500) {
                    translateX.value = withSpring(-80);
                } else {
                    translateX.value = withSpring(0);
                }
            });

        const rStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: translateX.value }],
        }));

        const rIconStyle = useAnimatedStyle(() => ({
            opacity: translateX.value < -20 ? 1 : 0,
            transform: [{ scale: iconScale.value }],
        }));

        return (
            <View style={styles.swipeContainer}>
                <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => {
                        translateX.value = withTiming(-Dimensions.get('window').width, {}, () => {
                            runOnJS(onRemove)();
                        });
                    }}
                >
                    <Animated.View style={rIconStyle}>
                        <Ionicons name="trash" size={24} color={Colors.error} />
                    </Animated.View>
                </TouchableOpacity>
                <GestureDetector gesture={itemPan}>
                    <Animated.View style={[styles.swipeOuter, rStyle]}>
                        {children}
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <SwipeableItem isMine={item.user.handle === '@kwadub' || item.user.id === 'me'} onRemove={() => deleteComment(item.id)}>
            <View style={styles.commentRow}>
                <Image
                    source={typeof item.user.avatar === 'string' ? { uri: item.user.avatar } : item.user.avatar}
                    style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.handle}>{item.user.handle}</Text>
                        {item.user.status && (item.user.status === 'natural' || item.user.status === 'enhanced') && (
                            item.user.status === 'enhanced' ? (
                                <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FFD700" style={styles.badge} />
                            ) : (
                                <Ionicons name="leaf" size={12} color={Colors.success} style={styles.badge} />
                            )
                        )}
                        {/* Hammer icon if applicable */}
                        {item.user.handle === '@kwadub' && <Ionicons name="hammer" size={12} color={Colors.primary} style={styles.badge} />}
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                </View>
                <View style={styles.commentStats}>
                    <TouchableOpacity style={styles.likeBtn} onPress={() => toggleLike(item.id)}>
                        <Ionicons
                            name={item.isLiked ? "heart" : "heart-outline"}
                            size={20}
                            color={item.isLiked ? Colors.primary : Colors.primary + '66'}
                        />
                        <Text style={styles.likeCount}>{item.likes}</Text>
                    </TouchableOpacity>
                    <Text style={styles.timestamp}>{formatTimeAgo(new Date(item.timestamp))}</Text>
                </View>
            </View>
        </SwipeableItem>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <Pressable style={styles.overlay} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.sheetContainer}
                >
                    <Animated.View style={[styles.sheetContent, animatedStyle]}>
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.gestureArea}>
                                <View style={styles.dragIndicator} />
                                <View style={styles.titleContainer}>
                                    <Text style={styles.title}>Comments</Text>
                                </View>
                            </View>
                        </GestureDetector>
                        <FlatList
                            data={comments}
                            renderItem={renderComment}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                        <View style={styles.inputBar}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Comment..."
                                    placeholderTextColor={Colors.primary + '88'}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    maxLength={150}
                                    onSubmitEditing={handleSubmit}
                                />
                                {inputText.trim().length > 0 && (
                                    <TouchableOpacity onPress={handleSubmit} style={styles.sendButton}>
                                        <Ionicons name="arrow-forward" size={24} color={Colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetContainer: {
        height: SCREEN_HEIGHT * 0.75,
        width: '100%',
    },
    sheetContent: {
        flex: 1,
        backgroundColor: Colors.background, // Beige theme
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 16,
    },
    gestureArea: {
        width: '100%',
        paddingTop: 12,
        paddingBottom: 10,
        alignItems: 'center',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: Colors.primary + '44',
        borderRadius: 2,
        marginBottom: 8,
    },
    titleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    title: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 120, // Extra space for input bar
    },
    commentRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        backgroundColor: Colors.background,
    },
    commentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    handle: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 4,
    },
    badge: {
        marginLeft: 2,
    },
    commentText: {
        color: Colors.primary,
        fontSize: 15,
        lineHeight: 20,
        opacity: 0.9,
    },
    commentStats: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    likeBtn: {
        alignItems: 'center',
        marginBottom: 4,
    },
    likeCount: {
        color: Colors.primary,
        fontSize: 12,
        opacity: 0.6,
    },
    timestamp: {
        color: Colors.primary,
        fontSize: 10,
        opacity: 0.4,
    },
    inputBar: {
        paddingVertical: 15,
        paddingBottom: Platform.OS === 'ios' ? 35 : 20,
        paddingHorizontal: 5,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 50,
    },
    input: {
        flex: 1,
        color: Colors.primary,
        fontSize: 16,
    },
    sendButton: {
        marginLeft: 8,
    },
    swipeContainer: {
        position: 'relative',
        backgroundColor: Colors.background,
    },
    deleteAction: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 80,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    swipeOuter: {
        backgroundColor: Colors.background,
    }
});
