import { Ionicons } from '@expo/vector-icons';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Comment {
    id: string;
    userName: string;
    handle: string;
    text: string;
    timestamp: Date;
    likes: number;
    avatar: any;
    verified?: boolean;
    hasHammer?: boolean;
    isLiked?: boolean;
}

interface CommentSheetProps {
    visible: boolean;
    onClose: () => void;
    onCommentPosted?: () => void;
    onCommentDeleted?: (hasUserCommentsLeft: boolean) => void;
}

const INITIAL_DATE = new Date('2025-12-25T00:00:00');

export default function CommentSheet({ visible, onClose, onCommentPosted, onCommentDeleted }: CommentSheetProps) {
    const translateY = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    const [comments, setComments] = useState<Comment[]>([
        {
            id: '1',
            userName: 'Kwaku',
            handle: '@kwadub',
            text: "This is the best thing I've ever seen!!! I'm super curious about how you made this?? I've always wanted to eat this many calories in one meal. Oh my days!",
            timestamp: INITIAL_DATE,
            likes: 100,
            avatar: require('../assets/images/kwadub.jpg'),
            verified: true,
            hasHammer: true,
            isLiked: false,
        },
        {
            id: '2',
            userName: 'Kwaku',
            handle: '@kwadub',
            text: "This is the best thing I've ever seen!!! I'm super curious about how you made this?? I've always wanted to eat this many calories in one meal. Oh my days!",
            timestamp: INITIAL_DATE,
            likes: 100,
            avatar: require('../assets/images/hd2x.jpg'),
            verified: true,
            hasHammer: true,
            isLiked: false,
        },
        {
            id: '3',
            userName: 'Kwaku',
            handle: '@kwadub',
            text: "This is the best thing I've ever seen!!! I'm super curious about how you made this?? I've always wanted to eat this many calories in one meal. Oh my days!",
            timestamp: INITIAL_DATE,
            likes: 100,
            avatar: require('../assets/images/kwadub.jpg'),
            verified: true,
            hasHammer: true,
            isLiked: false,
        }
    ]);

    const [inputText, setInputText] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (visible) {
            translateY.value = 0;
        }
    }, [visible]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

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

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

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
        setComments(current => {
            const filtered = current.filter(c => c.id !== commentId);
            const userCommentsLeft = filtered.some(c => c.userName === 'You');
            if (onCommentDeleted) onCommentDeleted(userCommentsLeft);
            return filtered;
        });
    };

    const handleSubmit = () => {
        if (inputText.trim().length === 0) return;

        const newComment: Comment = {
            id: Date.now().toString(),
            userName: 'You',
            handle: '@user',
            text: inputText,
            timestamp: new Date(),
            likes: 0,
            avatar: require('../assets/images/kwadub.jpg'),
            isLiked: false,
        };

        setComments([newComment, ...comments]);
        setInputText('');
        if (onCommentPosted) onCommentPosted();
    };

    const SwipeableItem = ({ children, onRemove, isMine }: { children: React.ReactNode, onRemove: () => void, isMine: boolean }) => {
        if (!isMine) return <View>{children}</View>;

        const translateX = useSharedValue(0);
        const iconScale = useSharedValue(0.5);

        const panGesture = Gesture.Pan()
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
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.swipeOuter, rStyle]}>
                        {children}
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    };
    const renderComment = ({ item }: { item: Comment }) => (
        <SwipeableItem isMine={item.userName === 'You'} onRemove={() => deleteComment(item.id)}>
            <View style={styles.commentRow}>
                <Image source={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar} style={styles.commentAvatar} />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.handle}>{item.handle}</Text>
                        {item.verified && <Ionicons name="leaf" size={12} color={Colors.success} style={styles.badge} />}
                        {item.hasHammer && <Ionicons name="hammer" size={12} color={Colors.primary} style={styles.badge} />}
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                </View>
                <View style={styles.commentStats}>
                    <TouchableOpacity style={styles.likeBtn} onPress={() => toggleLike(item.id)}>
                        <Ionicons
                            name={item.isLiked ? "heart" : "heart-outline"}
                            size={20}
                            color={item.isLiked ? Colors.primary : "white"}
                        />
                        <Text style={styles.likeCount}>{item.likes}</Text>
                    </TouchableOpacity>
                    <Text style={styles.timestamp}>{formatTimeAgo(item.timestamp)}</Text>
                </View>
            </View>
        </SwipeableItem>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
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
                            <Image source={require('../assets/images/kwadub.jpg')} style={styles.userAvatar} />
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Comment..."
                                    placeholderTextColor="#666"
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetContainer: {
        height: SCREEN_HEIGHT * 0.75,
        width: '100%',
    },
    sheetContent: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: Colors.secondaryDark,
        paddingHorizontal: 16,
    },
    gestureArea: {
        width: '100%',
        paddingTop: 12,
        paddingBottom: 20,
        alignItems: 'center',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginBottom: 8,
    },
    titleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 100,
    },
    commentRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#1a1a1a',
        backgroundColor: '#0a0a0a',
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
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
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
        marginRight: 4,
    },
    badge: {
        marginLeft: 2,
    },
    commentText: {
        color: '#ccc',
        fontSize: 14,
        lineHeight: 18,
    },
    commentStats: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    likeBtn: {
        alignItems: 'center',
        marginBottom: 4,
    },
    likeCount: {
        color: '#666',
        fontSize: 12,
    },
    timestamp: {
        color: '#666',
        fontSize: 10,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingBottom: 30,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 40,
        borderWidth: 1,
        borderColor: '#333',
    },
    input: {
        flex: 1,
        color: 'white',
        fontSize: 14,
    },
    sendButton: {
        marginLeft: 5,
    },
    swipeContainer: {
        position: 'relative',
        backgroundColor: '#0a0a0a',
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
        backgroundColor: '#0a0a0a',
    }
});
