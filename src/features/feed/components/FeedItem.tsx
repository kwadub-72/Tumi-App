import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AVPlaybackStatusSuccess, ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FeedPost, Snapshot } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import VerifiedModal from '@/components/VerifiedModal';

export interface FeedItemProps {
    post: FeedPost;
    onPressVerified?: () => void;
    onPressHammer?: () => void;
    onPressComment?: () => void;
    onPressLike?: () => void;
    onPressShare?: () => void;
    onPressSave?: () => void;
    onPressOptions?: () => void;
}

export default function FeedItem({
    post,
    onPressVerified,
    onPressHammer,
    onPressComment,
    onPressLike,
    onPressShare,
    onPressSave,
    onPressOptions,
}: FeedItemProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [loopCount, setLoopCount] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVerifiedVisible, setIsVerifiedVisible] = useState(false);
    const videoRef = useRef<Video>(null);

    const toggleExpand = (e?: any) => {
        if (e) e.stopPropagation();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const handlePlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) return;
        const s = status as AVPlaybackStatusSuccess;
        if (s.didJustFinish) {
            if (loopCount < 2) setLoopCount(prev => prev + 1);
            else { setIsPlaying(false); setLoopCount(0); }
        }
    };

    const handlePressBody = () => { if (post.id) router.push(`/post/${post.id}`); };

    const formatVal = (val: number) => {
        if (val < 0) return `(${Math.abs(val)})`;
        return `${val}`;
    };

    const renderMacroValue = (icon: any, val: number, unit: string, colorOverride?: string) => (
        <View style={styles.macroValueItem}>
            <MaterialCommunityIcons name={icon} size={16} color={colorOverride || "white"} />
            <Text style={[styles.macroValueText, colorOverride && { color: colorOverride }]}>
                {formatVal(val)}{unit}
            </Text>
        </View>
    );

    const renderSnapshot = (snapshot: Snapshot) => {
        const remains = {
            calories: snapshot.targets.calories - snapshot.consumed.calories,
            p: snapshot.targets.p - snapshot.consumed.p,
            c: snapshot.targets.c - snapshot.consumed.c,
            f: snapshot.targets.f - snapshot.consumed.f,
        };

        return (
            <View style={styles.snapshotContent}>
                {isExpanded && (
                    <>
                        <View style={styles.snapshotRow}>
                            <Text style={styles.snapshotLabel}>Target</Text>
                            {renderMacroValue('fire', snapshot.targets.calories, ' cals')}
                            {renderMacroValue('food-drumstick', snapshot.targets.p, 'g')}
                            {renderMacroValue('barley', snapshot.targets.c, 'g')}
                            {renderMacroValue('water', snapshot.targets.f, 'g')}
                        </View>
                        <View style={styles.snapshotRow}>
                            <Text style={styles.snapshotLabel}>Snapshot</Text>
                            {renderMacroValue('fire', snapshot.consumed.calories, ' cals')}
                            {renderMacroValue('food-drumstick', snapshot.consumed.p, 'g')}
                            {renderMacroValue('barley', snapshot.consumed.c, 'g')}
                            {renderMacroValue('water', snapshot.consumed.f, 'g')}
                        </View>
                        <View style={[styles.divider, { marginVertical: 8, opacity: 0.2 }]} />
                    </>
                )}
                <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotLabel}>Remaining</Text>
                    {renderMacroValue('fire', remains.calories, ' cals')}
                    {renderMacroValue('food-drumstick', remains.p, 'g')}
                    {renderMacroValue('barley', remains.c, 'g')}
                    {renderMacroValue('water', remains.f, 'g')}
                </View>
            </View>
        );
    };

    const renderMacroUpdate = (mu: any) => (
        <View style={styles.macroUpdateContent}>
            {isExpanded && (
                <View style={styles.macroOldRow}>
                    <Text style={styles.macroLabelLarge}>Old Target</Text>
                    <View style={styles.macroValues}>
                        {renderMacroValue('fire', mu.oldTargets.calories, ' cals')}
                        {renderMacroValue('food-drumstick', mu.oldTargets.p, 'g')}
                        {renderMacroValue('barley', mu.oldTargets.c, 'g')}
                        {renderMacroValue('water', mu.oldTargets.f, 'g')}
                    </View>
                </View>
            )}
            <View style={[styles.divider, { opacity: 0.2, marginVertical: 8 }]} />
            <View style={styles.macroNewRow}>
                <View style={styles.newTargetsLabelBox}>
                    <Text style={styles.macroLabel}>New</Text>
                    <Text style={styles.macroLabel}>targets</Text>
                </View>
                <View style={styles.macroValuesMain}>
                    {renderMacroValue('fire', mu.newTargets.calories, ' cals')}
                    {renderMacroValue('food-drumstick', mu.newTargets.p, 'g')}
                    {renderMacroValue('barley', mu.newTargets.c, 'g')}
                    {renderMacroValue('water', mu.newTargets.f, 'g')}
                </View>
            </View>
        </View>
    );

    const renderMeal = (meal: any) => (
        <View style={styles.mealMainStats}>
            <Text style={styles.mealType}>{meal.type}</Text>
            <View style={styles.mealMacros}>
                {renderMacroValue('fire', meal.calories, ' cals')}
                {renderMacroValue('food-drumstick', meal.macros.p, 'g')}
                {renderMacroValue('barley', meal.macros.c, 'g')}
                {renderMacroValue('water', meal.macros.f, 'g')}
            </View>
        </View>
    );

    const renderWorkout = (workout: any) => (
        <View style={styles.workoutContent}>
            <View style={styles.workoutHeaderRow}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="white" />
                <Text style={styles.workoutDuration}>{workout.duration} mins</Text>
            </View>
            {isExpanded && (
                <View style={styles.exercisesList}>
                    {workout.exercises.map((ex: any, idx: number) => (
                        <Text key={idx} style={styles.exerciseItem}>
                            • {ex.title} ({ex.sets?.length || 0} sets)
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );

    const content = () => {
        if (post.snapshot) return renderSnapshot(post.snapshot);
        if (post.macroUpdate) return renderMacroUpdate(post.macroUpdate);
        if (post.meal) return renderMeal(post.meal);
        if (post.workout) return renderWorkout(post.workout);
        return null;
    };

    return (
        <View style={styles.card}>
            <VerifiedModal visible={isVerifiedVisible} onClose={() => setIsVerifiedVisible(false)} status={post.user.status} />
            <View style={styles.header}>
                <Image source={typeof post.user.avatar === 'string' ? { uri: post.user.avatar } : post.user.avatar} style={styles.avatar} />
                <View style={styles.headerText}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{post.user.name}</Text>
                        {post.user.status && (post.user.status !== 'none') && (
                            <TouchableOpacity onPress={() => setIsVerifiedVisible(true)}>
                                <MaterialCommunityIcons
                                    name={post.user.status === 'enhanced' ? "lightning-bolt" : "leaf"}
                                    size={16}
                                    color={post.user.status === 'enhanced' ? "#FFD700" : Colors.success}
                                />
                            </TouchableOpacity>
                        )}
                        {post.user.activityIcon && (
                            <TouchableOpacity onPress={onPressHammer} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <MaterialCommunityIcons
                                    name={post.user.activityIcon as any}
                                    size={16}
                                    color={(post.user as any).activity === 'Glute Growth' ? '#FFB07C' : 'white'}
                                />
                                {(post.user as any).activity?.toLowerCase().includes('bulk') && (
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>+</Text>
                                )}
                                {(post.user as any).activity?.toLowerCase().includes('cut') && (
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>-</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.handle}>{post.user.handle}</Text>
                </View>
                <TouchableOpacity onPress={onPressOptions}><Ionicons name="ellipsis-horizontal" size={20} color="white" /></TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.9} onPress={handlePressBody}>
                <Text style={styles.titleText}>
                    {post.snapshot?.caption || post.macroUpdate?.caption || post.workout?.title || post.meal?.title}
                </Text>

                {content()}

                <TouchableOpacity onPress={toggleExpand} style={styles.expandTrigger}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                {post.mediaUrl && (
                    <View style={styles.mediaFrame}>
                        {post.mediaType === 'video' ? (
                            <Video ref={videoRef} source={{ uri: post.mediaUrl }} style={styles.media} resizeMode={ResizeMode.COVER} isLooping shouldPlay={isPlaying} isMuted={isMuted} onPlaybackStatusUpdate={handlePlaybackStatusUpdate} />
                        ) : (
                            <Image source={{ uri: post.mediaUrl }} style={styles.media} />
                        )}
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.footerActions}>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressLike}>
                        <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={28} color="white" />
                        <Text style={styles.actionCount}>{post.stats.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressShare}>
                        <Ionicons name="add-circle-outline" size={28} color="white" />
                        <Text style={styles.actionCount}>{post.stats.shares}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressComment}>
                        <Ionicons name="chatbubble-outline" size={26} color="white" />
                        <Text style={styles.actionCount}>{post.stats.comments}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressSave}>
                        <Ionicons name={post.isSaved ? "bookmark" : "bookmark-outline"} size={26} color="white" />
                        <Text style={styles.actionCount}>{post.stats.saves}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.timeLabel}>Just now</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#A4B69D',
        borderRadius: 45,
        padding: 20,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 10,
    },
    headerText: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    handle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    titleText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: 'white',
        opacity: 0.3,
    },
    snapshotContent: {
        gap: 8,
        marginBottom: 10,
        paddingLeft: 10,
    },
    snapshotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    snapshotLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        width: 75,
    },
    macroUpdateContent: {
        gap: 5,
        paddingLeft: 10,
    },
    macroOldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    macroNewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    newTargetsLabelBox: {
        width: 75,
    },
    macroLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroLabelLarge: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        width: 75,
    },
    macroValues: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    macroValuesMain: {
        flexDirection: 'row',
        gap: 12,
        flex: 1,
        justifyContent: 'flex-end',
    },
    macroValueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    macroValueText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    mealMainStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 10,
    },
    mealType: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        width: 75,
    },
    mealMacros: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    workoutContent: {
        paddingLeft: 10,
    },
    workoutHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    workoutDuration: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    exercisesList: {
        marginTop: 10,
        gap: 4,
    },
    exerciseItem: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    expandTrigger: {
        alignItems: 'center',
        marginVertical: 10,
    },
    mediaFrame: {
        borderRadius: 30,
        overflow: 'hidden',
        marginTop: 10,
        aspectRatio: 1,
    },
    media: {
        width: '100%',
        height: '100%',
    },
    footerActions: {
        marginTop: 15,
        position: 'relative',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionCount: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 2,
    },
    timeLabel: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
    }
});
