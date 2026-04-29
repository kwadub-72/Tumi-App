import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { useSimilarProfiles } from '@/src/features/explore/hooks/useSimilarProfiles';
import { useNetworkStore } from '@/src/store/NetworkStore';
import { useAuthStore } from '@/store/AuthStore';
import { SimilarUser } from '@/src/features/explore/types';

const { width, height } = Dimensions.get('window');

// ─── Profile Slide Card ────────────────────────────────────────────────────────

interface ProfileSlideProps {
    user: SimilarUser;
    index: number;
    total: number;
    isFollowing: boolean;
    isRequested: boolean;
    onToggleFollow: () => void;
    onPressCard: () => void;
}

function ProfileSlide({
    user,
    index,
    total,
    isFollowing,
    isRequested,
    onToggleFollow,
    onPressCard,
}: ProfileSlideProps) {
    const insets = useSafeAreaInsets();
    const isBulk = user.activity?.toLowerCase().includes('bulk');
    const isCut = user.activity?.toLowerCase().includes('cut');
    const matchPct = Number.isInteger(user.similarityScore)
        ? user.similarityScore
        : parseFloat(user.similarityScore.toFixed(1));

    const getEffectiveActivityIcon = (activity?: string, providedIcon?: string) => {
        if (!activity) return providedIcon || 'hammer';
        const act = activity.toLowerCase();
        if (act.includes('bodybuild')) return 'hammer';
        if (act.includes('powerlift')) return 'weight-lifter';
        if (act.includes('athlete') || act.includes('run')) return 'run';
        if (act.includes('crossfit')) return 'kettlebell';
        if (providedIcon && !['help-circle', 'question', 'help'].includes(providedIcon)) {
            return providedIcon;
        }
        return 'hammer';
    };

    const getFormattedHeight = (h?: string) => {
        if (!h) return '--';
        return h.replace(/["]+/g, '').replace(/[']+/g, "'").replace(/'$/, '');
    };

    return (
        <View style={[styles.slide, { height: height }]}>
            {/* Rank pip row */}
            <View style={styles.pipRow}>
                {Array.from({ length: total }).map((_, i) => (
                    <View
                        key={i}
                        style={[styles.pip, i === index && styles.pipActive]}
                    />
                ))}
            </View>

            {/* Main card */}
            <TouchableOpacity
                style={styles.card}
                onPress={onPressCard}
                activeOpacity={0.95}
            >
                {/* Match badge */}
                <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>{matchPct}%</Text>
                    <Text style={styles.matchBadgeLabel}>match</Text>
                </View>

                {/* Rank badge */}
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                </View>

                {/* Avatar */}
                <Image
                    source={
                        typeof user.avatar === 'string'
                            ? { uri: user.avatar }
                            : user.avatar
                    }
                    style={styles.avatar}
                />

                {/* Name & handle */}
                <View style={styles.nameBlock}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {user.name}
                        </Text>
                        {user.status && user.status !== 'none' && (
                            <MaterialCommunityIcons
                                name={
                                    user.status === 'enhanced'
                                        ? 'lightning-bolt'
                                        : 'leaf'
                                }
                                size={20}
                                color={
                                    user.status === 'enhanced'
                                        ? '#FFD700'
                                        : '#4ADE80'
                                }
                                style={{ marginLeft: 6 }}
                            />
                        )}
                        {user.activity && (
                            <View style={styles.activityRow}>
                                <MaterialCommunityIcons
                                    name={
                                        getEffectiveActivityIcon(
                                            user.activity,
                                            user.activityIcon,
                                        ) as any
                                    }
                                    size={18}
                                    color="white"
                                />
                                {isBulk && (
                                    <Text style={styles.activitySymbol}>+</Text>
                                )}
                                {isCut && (
                                    <Text style={styles.activitySymbol}>-</Text>
                                )}
                            </View>
                        )}
                    </View>
                    <Text style={styles.handle}>
                        @{user.handle.replace('@', '')}
                    </Text>
                </View>

                {/* Stats pill row */}
                <View style={styles.statsRow}>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>
                            {getFormattedHeight(user.height)}
                        </Text>
                        <Text style={styles.statLabel}>Height</Text>
                    </View>
                    <View style={styles.statPillDivider} />
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>
                            {user.weight ? `${user.weight} lbs` : '--'}
                        </Text>
                        <Text style={styles.statLabel}>Weight</Text>
                    </View>
                    <View style={styles.statPillDivider} />
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>
                            {user.bfs
                                ? `${user.bfs.toString().replace('%', '')}%`
                                : '--'}
                        </Text>
                        <Text style={styles.statLabel}>Body Fat</Text>
                    </View>
                </View>

                {/* Activity */}
                {user.activity && (
                    <View style={styles.activityPill}>
                        <Text style={styles.activityPillText}>
                            {user.activity}
                        </Text>
                    </View>
                )}

                {/* Tribe */}
                {user.tribe && (
                    <Text style={styles.tribeName}>{user.tribe}</Text>
                )}

                {/* Engagement metrics */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                        <MaterialCommunityIcons
                            name="fire"
                            size={26}
                            color="rgba(255,255,255,0.5)"
                        />
                        <Text style={styles.metricValue}>
                            {user.stats?.meals ?? 0}
                        </Text>
                        <Text style={styles.metricLabel}>meals</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <MaterialCommunityIcons
                            name="dumbbell"
                            size={26}
                            color="rgba(255,255,255,0.5)"
                        />
                        <Text style={styles.metricValue}>
                            {user.stats?.workouts ?? 0}
                        </Text>
                        <Text style={styles.metricLabel}>workouts</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Ionicons
                            name="stats-chart"
                            size={26}
                            color="rgba(255,255,255,0.5)"
                        />
                        <Text style={styles.metricValue}>
                            {user.stats?.updates ?? 0}
                        </Text>
                        <Text style={styles.metricLabel}>updates</Text>
                    </View>
                </View>

                {/* Follow button */}
                <TouchableOpacity
                    style={[
                        styles.followBtn,
                        isFollowing && styles.followBtnActive,
                        isRequested && styles.followBtnRequested,
                    ]}
                    onPress={onToggleFollow}
                >
                    <MaterialCommunityIcons
                        name={
                            isFollowing
                                ? 'account-check'
                                : isRequested
                                  ? 'account-clock'
                                  : 'account-plus'
                        }
                        size={20}
                        color={isFollowing || isRequested ? '#F5F5DC' : '#4F6352'}
                    />
                    <Text
                        style={[
                            styles.followBtnText,
                            (isFollowing || isRequested) && { color: '#F5F5DC' },
                        ]}
                    >
                        {isFollowing
                            ? 'Following'
                            : isRequested
                              ? 'Requested'
                              : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Swipe hint (only on first card) */}
            {index === 0 && total > 1 && (
                <View style={styles.swipeHint}>
                    <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color="rgba(47,58,39,0.4)"
                    />
                    <Text style={styles.swipeHintText}>Swipe down</Text>
                </View>
            )}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SimilarProfilesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { targetId, targetName } = useLocalSearchParams<{
        targetId: string;
        targetName?: string;
    }>();

    const session = useAuthStore(state => state.session);
    const networkStore = useNetworkStore();

    const { profiles, isLoading, error, refresh } = useSimilarProfiles(targetId);
    const [currentIndex, setCurrentIndex] = useState(0);

    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index != null) {
                setCurrentIndex(viewableItems[0].index);
            }
        },
    ).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleToggleFollow = useCallback(
        async (user: SimilarUser) => {
            if (!session?.user?.id) return;
            await networkStore.toggleFollow(
                session.user.id,
                user.id,
                user.isPrivate || false,
            );
        },
        [session?.user?.id, networkStore],
    );

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: 'center', alignItems: 'center' },
                ]}
            >
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding similar profiles…</Text>
            </View>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: 'center', alignItems: 'center' },
                ]}
            >
                <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={56}
                    color={Colors.primary}
                />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
                    <Text style={styles.retryBtnText}>Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Empty ────────────────────────────────────────────────────────────────
    if (profiles.length === 0) {
        return (
            <View style={styles.container}>
                <View
                    style={[styles.topBar, { paddingTop: insets.top + 8 }]}
                >
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={26}
                            color={Colors.primary}
                        />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>Similar profiles</Text>
                    <View style={{ width: 42 }} />
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons
                        name="account-group-outline"
                        size={80}
                        color="rgba(47,58,39,0.2)"
                    />
                    <Text style={styles.emptyTitle}>No matches found</Text>
                    <Text style={styles.emptySubtitle}>
                        {targetName
                            ? `No profiles match ${targetName}'s metrics yet.`
                            : 'No similar profiles found.'}
                    </Text>
                </View>
            </View>
        );
    }

    // ── Main ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Fixed top bar */}
            <View
                style={[
                    styles.topBar,
                    { paddingTop: insets.top + 8, zIndex: 10 },
                ]}
            >
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={26}
                        color={Colors.primary}
                    />
                </TouchableOpacity>

                <View style={styles.titleBlock}>
                    <Text style={styles.screenTitle}>Similar profiles</Text>
                    {targetName ? (
                        <Text style={styles.screenSubtitle}>
                            Similar to {targetName}
                        </Text>
                    ) : null}
                </View>

                <View style={{ width: 42 }} />
            </View>

            {/* Vertical pager */}
            <FlatList
                data={profiles}
                keyExtractor={item => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                bounces={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={({ item, index }) => {
                    const isFollowing = networkStore.isFollowing(item.id);
                    const isRequested = networkStore.isRequested(item.id);
                    return (
                        <ProfileSlide
                            user={item}
                            index={index}
                            total={profiles.length}
                            isFollowing={isFollowing}
                            isRequested={isRequested}
                            onToggleFollow={() => handleToggleFollow(item)}
                            onPressCard={() =>
                                router.push({
                                    pathname: '/user/[handle]',
                                    params: { handle: item.handle },
                                } as any)
                            }
                        />
                    );
                }}
                style={styles.list}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_HEIGHT = height - 120;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    list: {
        flex: 1,
    },

    // ── Top bar
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: Colors.background,
        zIndex: 20,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleBlock: {
        flex: 1,
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.primary,
    },
    screenSubtitle: {
        fontSize: 12,
        color: 'rgba(47,58,39,0.5)',
        fontWeight: '500',
        marginTop: 1,
    },
    counterBadge: {
        width: 42,
        alignItems: 'flex-end',
    },
    counterText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },

    slide: {
        width,
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Pip indicators
    pipRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 16,
    },
    pip: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(47,58,39,0.2)',
    },
    pipActive: {
        backgroundColor: Colors.primary,
        width: 20,
    },

    // ── Card
    card: {
        width: '100%',
        backgroundColor: '#A8C0A8',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#8FA88F',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 5,
        minHeight: CARD_HEIGHT * 0.65,
        maxHeight: CARD_HEIGHT,
        overflow: 'hidden',
    },

    // ── Match badge
    matchBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(47,58,39,0.85)',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignItems: 'center',
    },
    matchBadgeText: {
        color: '#F5F5DC',
        fontSize: 20,
        fontWeight: '900',
        lineHeight: 22,
    },
    matchBadgeLabel: {
        color: 'rgba(245,245,220,0.6)',
        fontSize: 10,
        fontWeight: '600',
        lineHeight: 11,
    },

    // ── Rank badge
    rankBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
    },
    rankText: {
        color: 'white',
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },

    // ── Avatar
    avatar: {
        width: 124,
        height: 124,
        borderRadius: 62,
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.5)',
        marginTop: 8,
        marginBottom: 14,
    },

    // ── Name block
    nameBlock: {
        alignItems: 'center',
        marginBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 25,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginLeft: 6,
    },
    activitySymbol: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: -2,
    },
    handle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 17,
        fontWeight: '500',
        marginTop: 2,
    },

    // ── Stats row
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        width: '100%',
    },
    statPill: {
        flex: 1,
        alignItems: 'center',
    },
    statPillDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    statValue: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },

    // ── Activity pill
    activityPill: {
        backgroundColor: 'rgba(47,58,39,0.4)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 5,
        marginBottom: 10,
    },
    activityPillText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
    },

    // ── Tribe name
    tribeName: {
        color: '#421C1C',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
        marginBottom: 10,
    },

    // ── Metrics row
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 12,
        marginTop: 4,
        width: '100%',
        marginBottom: 16,
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 4,
    },
    metricLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 1,
    },

    // ── Follow button
    followBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'white',
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 28,
    },
    followBtnActive: {
        backgroundColor: '#2F3A27',
    },
    followBtnRequested: {
        backgroundColor: 'gray',
    },
    followBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#4F6352',
    },

    // ── Swipe hint
    swipeHint: {
        alignItems: 'center',
        marginTop: 12,
        opacity: 0.6,
    },
    swipeHintText: {
        fontSize: 12,
        color: 'rgba(47,58,39,0.6)',
        fontWeight: '500',
        marginTop: 2,
    },

    // ── Loading / Error / Empty
    loadingText: {
        marginTop: 14,
        fontSize: 15,
        color: Colors.primary,
        fontWeight: '500',
    },
    errorText: {
        marginTop: 12,
        fontSize: 15,
        color: Colors.primary,
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    retryBtn: {
        marginTop: 16,
        backgroundColor: Colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
    },
    retryBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.primary,
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(47,58,39,0.5)',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});
