
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AVPlaybackStatusSuccess, ResizeMode, Video } from 'expo-av';
import React, { useRef, useState } from 'react';
import { Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FeedPost } from '../../../shared/models/types';
import { Colors } from '../../../shared/theme/Colors';

export interface FeedItemProps {
    post: FeedPost;
    onPressVerified?: () => void;
    onPressHammer?: () => void;
    onPressComment?: () => void;
    onPressLike?: () => void;
    onPressShare?: () => void;
    onPressSave?: () => void;
}

export default function FeedItem({
    post,
    onPressVerified,
    onPressHammer,
    onPressComment,
    onPressLike,
    onPressShare,
    onPressSave,
}: FeedItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loopCount, setLoopCount] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<Video>(null);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const handlePlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) return;
        const s = status as AVPlaybackStatusSuccess;

        if (s.didJustFinish) {
            if (loopCount < 2) { // 0, 1, 2 = 3 loops
                setLoopCount(prev => prev + 1);
            } else {
                setIsPlaying(false);
                setLoopCount(0);
            }
        }
    };

    const handleManualPlay = () => {
        setLoopCount(0);
        setIsPlaying(true);
    };
    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={typeof post.user.avatar === 'string' ? { uri: post.user.avatar } : post.user.avatar} style={styles.avatar} />
                <View style={styles.headerText}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{post.user.name}</Text>
                        {post.user.verified && (
                            <TouchableOpacity
                                onPress={onPressVerified}
                                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                            >
                                <Ionicons
                                    name="leaf"
                                    size={14}
                                    color={Colors.success || '#22C55E'}
                                    style={styles.verifiedIcon}
                                />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onPressHammer}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Ionicons
                                name="hammer"
                                size={14}
                                color={Colors.primary}
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.handle}>{post.user.handle}</Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
            </View>

            {/* Meal Title */}
            <Text style={styles.mealTitle}>{post.meal.title}</Text>

            {/* Main Meal Stats */}
            <View style={styles.mainStatsRow}>
                <Text style={styles.mealType}>{post.meal.type || 'Meal'}</Text>
                <View style={[styles.statGroup, { width: 80 }]}>
                    <MaterialCommunityIcons name="fire" size={16} color={Colors.primary} />
                    <Text style={styles.mainStatText}>{post.meal.calories} cals</Text>
                </View>
                <View style={[styles.statGroup, { width: 60 }]}>
                    <MaterialCommunityIcons name="food-drumstick" size={16} color="white" />
                    <Text style={styles.mainStatText}>{post.meal.macros.p}g</Text>
                </View>
                <View style={[styles.statGroup, { width: 60 }]}>
                    <MaterialCommunityIcons name="barley" size={16} color="white" />
                    <Text style={styles.mainStatText}>{post.meal.macros.c}g</Text>
                </View>
                <View style={[styles.statGroup, { width: 60 }]}>
                    <Ionicons name="water" size={16} color="white" />
                    <Text style={styles.mainStatText}>{post.meal.macros.f}g</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Ingredients */}
            {post.mediaUrl && (
                <TouchableOpacity onPress={toggleExpand} style={styles.expandDots}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
                </TouchableOpacity>
            )}

            {(!post.mediaUrl || isExpanded) && (
                <View style={styles.ingredientsList}>
                    {post.meal.ingredients.map((ing, i) => (
                        <View key={i} style={styles.ingredientRow}>
                            <View style={styles.ingNameCol}>
                                <Text style={styles.ingName}>{ing.name}</Text>
                                {ing.amount && <Text style={styles.ingAmount}>{ing.amount}</Text>}
                            </View>

                            <View style={[styles.ingStatCol, { width: 80 }]}>
                                <MaterialCommunityIcons name="fire" size={14} color={Colors.primary} />
                                <Text style={styles.ingStatText}>{ing.cals} cals</Text>
                            </View>
                            <View style={[styles.ingStatCol, { width: 60 }]}>
                                <MaterialCommunityIcons name="food-drumstick" size={14} color="white" />
                                <Text style={styles.ingStatText}>{ing.macros.p}g</Text>
                            </View>
                            <View style={[styles.ingStatCol, { width: 60 }]}>
                                <MaterialCommunityIcons name="barley" size={14} color="white" />
                                <Text style={styles.ingStatText}>{ing.macros.c}g</Text>
                            </View>
                            <View style={[styles.ingStatCol, { width: 60 }]}>
                                <Ionicons name="water" size={14} color="white" />
                                <Text style={styles.ingStatText}>{ing.macros.f}g</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {post.mediaUrl && (
                <View style={styles.mediaContainer}>
                    {post.mediaType === 'video' ? (
                        <View style={styles.videoContainer}>
                            <Video
                                ref={videoRef}
                                source={{ uri: post.mediaUrl }}
                                style={styles.postMedia}
                                resizeMode={ResizeMode.COVER}
                                isLooping={loopCount < 2}
                                shouldPlay={isPlaying}
                                isMuted={isMuted}
                                useNativeControls={false}
                                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                                shouldRasterizeIOS
                                posterSource={{ uri: post.mediaUrl }}
                                posterStyle={{ resizeMode: 'cover' }}
                            />
                            <TouchableOpacity
                                style={styles.muteBtnSmall}
                                onPress={() => setIsMuted(!isMuted)}
                            >
                                <Ionicons
                                    name={isMuted ? "volume-mute" : "volume-high"}
                                    size={18}
                                    color="white"
                                />
                            </TouchableOpacity>
                            {!isPlaying && (
                                <TouchableOpacity
                                    style={styles.playOverlay}
                                    onPress={handleManualPlay}
                                >
                                    <Ionicons name="play" size={50} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} />
                    )}
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.actionGroupCenter}>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressLike}>
                        <Ionicons
                            name={post.isLiked ? 'heart' : 'heart-outline'}
                            size={22}
                            color={post.isLiked ? Colors.primary : 'white'}
                        />
                        <Text style={styles.actionText}>{post.stats.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressShare}>
                        <Ionicons
                            name={post.isShared ? 'book' : 'book-outline'}
                            size={22}
                            color={post.isShared ? Colors.primary : 'white'}
                        />
                        <Text style={styles.actionText}>{post.stats.shares}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressComment}>
                        <Ionicons
                            name={post.hasCommented ? 'chatbubble' : 'chatbubble-outline'}
                            size={22}
                            color={post.hasCommented ? Colors.primary : 'white'}
                        />
                        <Text style={styles.actionText}>{post.stats.comments}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressSave}>
                        <Ionicons
                            name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={22}
                            color={post.isSaved ? Colors.primary : 'white'}
                        />
                        <Text style={styles.actionText}>{post.stats.saves}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.timeAgo}>{post.timeAgo}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#111',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#333',
    },
    headerText: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    name: {
        fontWeight: 'bold',
        fontSize: 16,
        color: 'white',
    },
    handle: {
        color: '#888',
        fontSize: 14,
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    mealTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    mainStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
    },
    mealType: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    statGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    mainStatText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginBottom: 12,
    },
    ingredientsList: {
        marginBottom: 16,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    ingNameCol: {
        flex: 1,
    },
    ingName: {
        color: '#eee',
        fontSize: 14,
        fontStyle: 'italic',
    },
    ingAmount: {
        color: '#888',
        fontSize: 12,
    },
    ingStatCol: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    ingStatText: {
        color: '#ccc',
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        position: 'relative',
    },
    actionGroupCenter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionText: {
        color: '#888',
        fontSize: 10,
        marginTop: 2,
    },
    timeAgo: {
        color: '#555',
        fontSize: 10,
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
    expandDots: {
        alignItems: 'center',
        paddingVertical: 4,
        marginBottom: 8,
    },
    mediaContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#222',
    },
    postMedia: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: 'transparent',
    },
    videoContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#000',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    muteBtnSmall: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 6,
        borderRadius: 15,
    },
});
