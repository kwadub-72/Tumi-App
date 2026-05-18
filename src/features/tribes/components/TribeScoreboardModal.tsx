import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Image,
    ActivityIndicator,
    Animated,
    Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Reanimated, { LinearTransition } from 'react-native-reanimated';
import { Colors } from '@/src/shared/theme/Colors';
import { useAuthStore } from '@/store/AuthStore';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { useTribeScoreboard, ScoreboardMember } from '../hooks/useTribeScoreboard';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';
import TribeInfoModal from './TribeInfoModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.84; 

interface TribeScoreboardModalProps {
    visible: boolean;
    onClose: () => void;
    tribeId?: string;
    tribeName?: string;
}

// Helper to determine top 3 rank medal coloring
const getRankColor = (rank: number) => {
    if (rank === 1) return '#DAA520'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'rgba(237, 232, 213, 0.6)'; // Soft Dust
};

// Self-contained component for points scaling pop and inline delta indicators
const PointsColumnCell = React.memo(({ points }: { points: number }) => {
    const [currentPoints, setCurrentPoints] = useState(points);
    const [delta, setDelta] = useState<number | null>(null);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (points !== currentPoints) {
            const diff = points - currentPoints;
            setDelta(diff);
            setCurrentPoints(points);

            // Scale text pop animation (1.0 -> 1.3 -> 1.0)
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.3,
                    duration: 120,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.0,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start();

            // Floating upward delta animation
            translateYAnim.setValue(0);
            opacityAnim.setValue(1);

            Animated.parallel([
                Animated.timing(translateYAnim, {
                    toValue: -28,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 900,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setDelta(null);
            });
        }
    }, [points]);

    const isPositive = delta && delta > 0;
    const deltaText = isPositive ? `+${delta}` : `${delta}`;
    const deltaColor = isPositive ? '#AEDD63' : '#8B2613'; // Soft Green vs Deep Crimson

    return (
        <View style={[styles.memberCell, styles.colPointsCompetitive, styles.pointsCellContainer]}>
            <Animated.Text style={[styles.pointsText, { transform: [{ scale: scaleAnim }] }]}>
                {currentPoints}
            </Animated.Text>
            {delta !== null && (
                <Animated.Text
                    style={[
                        styles.floatingDeltaText,
                        {
                            color: deltaColor,
                            transform: [{ translateY: translateYAnim }],
                            opacity: opacityAnim,
                        }
                    ]}
                >
                    {deltaText}
                </Animated.Text>
            )}
        </View>
    );
});

export default function TribeScoreboardModal({ visible, onClose, tribeId, tribeName = "Tribe Scoreboard" }: TribeScoreboardModalProps) {
    const { session } = useAuthStore();
    const { navigateToProfile } = useProfileNavigation();
    
    // Connect points management state hook
    const { loading, data, mutatePoints, simulateDailyReset } = useTribeScoreboard(tribeId);
    
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoModalConfig, setInfoModalConfig] = useState<any>({});

    const openInfoModal = (config: any) => {
        setInfoModalConfig(config);
        setInfoModalVisible(true);
    };

    const [shouldRender, setShouldRender] = useState(visible);

    // Bottom Sheet slide animation
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    
    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }).start();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (shouldRender) {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible, slideAnim, shouldRender]);

    if (!shouldRender) return null;

    const handleRowPress = (member: ScoreboardMember) => {
        Haptics.selectionAsync();
        onClose();
        navigateToProfile({ id: member.id, handle: member.handle });
    };

    const renderProgressBar = (progress: ScoreboardMember['progress']) => {
        return (
            <View style={styles.progressContainer}>
                <Text style={styles.progressLabelText}>{progress.label}</Text>
                <View style={styles.progressBarTrack}>
                    <View 
                        style={[
                            styles.progressBarFill, 
                            { width: `${Math.min(100, progress.percentage * 100)}%` }
                        ]} 
                    />
                </View>
            </View>
        );
    };

    // Style checks to detect competitive tribes (Team Flex is always H2H)
    const isHeadToHead = tribeName === 'Team Flex' || tribeId === 'b0000000-0000-0000-0000-000000000003';

    const backdropOpacity = slideAnim.interpolate({
        inputRange: [0, SHEET_HEIGHT],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    return (
        <>
        <Modal
            visible={shouldRender}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
                {/* Dismissal interactive touch layer */}
                <TouchableOpacity 
                    style={styles.backdropDismiss} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />

                {/* Bottom Sheet container */}
                <Animated.View 
                    style={[
                        styles.bottomSheetContainer,
                        isHeadToHead && styles.h2hFramedContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Top dismissal carrot header */}
                    <View style={styles.sheetHeader}>
                        <TouchableOpacity 
                            style={styles.downCarrotButton} 
                            onPress={onClose} 
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Ionicons name="chevron-down" size={26} color={Colors.theme.dust} />
                        </TouchableOpacity>
                        
                        <View style={styles.titleWrapper}>
                            {isHeadToHead ? (
                                <>
                                    <Text style={[styles.headerLabel, styles.h2hHeaderLabel]}>PREMIER · HEAD-TO-HEAD · HABITS</Text>
                                    <Text style={[styles.sheetTitle, styles.h2hSheetTitle]} numberOfLines={1}>
                                        {tribeName.toUpperCase()}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.headerLabel}>Accountability</Text>
                                    <Text style={styles.sheetTitle} numberOfLines={1}>
                                        {tribeName}
                                    </Text>
                                </>
                            )}
                        </View>

                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Columns header labels */}
                    {isHeadToHead ? (
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.columnHeader, styles.colIdentityCompetitive]}>MEMBER</Text>
                            <Text style={[styles.columnHeader, styles.colLoggedCompetitive, { textAlign: 'center' }]}>LOGGED</Text>
                            <Text style={[styles.columnHeader, styles.colTrendCompetitive, { textAlign: 'center' }]}>TREND</Text>
                            <Text style={[styles.columnHeader, styles.colPointsCompetitive, { textAlign: 'right', paddingRight: 8 }]}>POINTS</Text>
                        </View>
                    ) : (
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.columnHeader, styles.colIdentity]}>MEMBER</Text>
                            <Text style={[styles.columnHeader, styles.colLogged, { textAlign: 'center' }]}>LOGGED</Text>
                            <Text style={[styles.columnHeader, styles.colStreak]}>STREAK</Text>
                            <Text style={[styles.columnHeader, styles.colProgress, { paddingLeft: 8 }]}>PROGRESS</Text>
                        </View>
                    )}

                    {/* Main Leaderboard list */}
                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                            <Text style={styles.loadingText}>Syncing Scoreboard...</Text>
                        </View>
                    ) : (
                        <>
                            <ScrollView 
                                style={styles.scrollView}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {data.map((member) => {
                                    const isCurrentUser = session?.user?.id === member.id;
                                    
                                    return (
                                        <Reanimated.View 
                                            key={member.id} 
                                            layout={LinearTransition.duration(400)}
                                            style={isCurrentUser && styles.currentUserRowWrapper}
                                        >
                                            <TouchableOpacity
                                                style={[
                                                    styles.memberRow,
                                                    isCurrentUser && styles.currentUserHighlightRow
                                                ]}
                                                activeOpacity={0.85}
                                                onPress={() => handleRowPress(member)}
                                            >
                                                {/* Column 1: Identity (Rank + Avatar + Details) */}
                                                <View style={[styles.memberCell, isHeadToHead ? styles.colIdentityCompetitive : styles.colIdentity, styles.identityContainer]}>
                                                    
                                                    {/* Competitive Rank Badge */}
                                                    {isHeadToHead && (
                                                        <View style={styles.rankContainer}>
                                                            <Text style={[styles.rankNumberText, { color: getRankColor(member.rank) }]}>
                                                                {member.rank}
                                                            </Text>
                                                        </View>
                                                    )}

                                                    <Image 
                                                        source={member.avatar ? { uri: member.avatar } : require('@/assets/images/react-logo.png')} 
                                                        style={styles.avatar} 
                                                    />
                                                    <View style={styles.nameContainer}>
                                                        <Text style={styles.displayName} numberOfLines={1}>
                                                            {member.name}
                                                        </Text>
                                                        <Text style={styles.userHandle} numberOfLines={1}>
                                                            {member.handle}
                                                        </Text>
                                                        {/* Compact status descriptors */}
                                                        <View style={styles.metaIndicatorRow}>
                                                            {member.status && member.status !== 'none' && (
                                                                <TouchableOpacity
                                                                    activeOpacity={0.7}
                                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                                    style={styles.metaIndicatorPill}
                                                                    onPress={() => {
                                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                        const isNatural = member.status !== 'enhanced';
                                                                        const statusStr = isNatural ? 'Natural' : 'Enhanced';
                                                                        openInfoModal({
                                                                            title: statusStr,
                                                                            description: isNatural
                                                                                ? `${member.name} is verified as 100% Natural.`
                                                                                : `${member.name} is verified as Enhanced.`,
                                                                            iconName: isNatural ? 'leaf' : 'lightning-bolt',
                                                                            iconColor: isNatural ? Colors.natural : Colors.theme.harvestGold,
                                                                        });
                                                                    }}
                                                                >
                                                                    <MaterialCommunityIcons
                                                                        name={member.status === 'enhanced' ? 'lightning-bolt' : 'leaf'}
                                                                        size={14}
                                                                        color={member.status === 'enhanced' ? Colors.theme.harvestGold : Colors.natural}
                                                                    />
                                                                </TouchableOpacity>
                                                            )}
                                                            {member.activity && (
                                                                (() => {
                                                                    const actLower = member.activity.toLowerCase();
                                                                    const isBulk = actLower.includes('bulk') || actLower.includes('increase');
                                                                    const isCut = actLower.includes('cut') || actLower.includes('decrease');
                                                                    const modifier = isBulk ? '+' : (isCut ? '-' : '');
                                                                    const activeIconName = resolveActivityIcon(member.activity, member.activityIcon);

                                                                    return (
                                                                        <TouchableOpacity
                                                                            activeOpacity={0.7}
                                                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                                            style={[styles.metaIndicatorPill, styles.activityPill]}
                                                                            onPress={() => {
                                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                                openInfoModal({
                                                                                    title: member.activity || 'Activity',
                                                                                    description: `${member.name}'s active training & nutrition focus is ${member.activity || 'Bodybuilding'}.`,
                                                                                    iconName: activeIconName,
                                                                                    modifier: modifier || undefined,
                                                                                });
                                                                            }}
                                                                        >
                                                                            <MaterialCommunityIcons
                                                                                name={activeIconName as any}
                                                                                size={14}
                                                                                color={Colors.theme.dust}
                                                                            />
                                                                            {modifier ? (
                                                                                <Text style={styles.mathModifierText}>{modifier}</Text>
                                                                            ) : null}
                                                                        </TouchableOpacity>
                                                                    );
                                                                })()
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Column 2: Daily Logging Status */}
                                                <View style={[styles.memberCell, isHeadToHead ? styles.colLoggedCompetitive : styles.colLogged, styles.centerCell]}>
                                                    {member.logged ? (
                                                        <Ionicons 
                                                            name="checkmark-circle" 
                                                            size={24} 
                                                            color={Colors.theme.harvestGold} 
                                                        />
                                                    ) : (
                                                        <View style={styles.unloggedCircle} />
                                                    )}
                                                </View>

                                                {/* Column 3: Streak / Trend */}
                                                {isHeadToHead ? (
                                                    <View style={[styles.memberCell, styles.colTrendCompetitive, styles.centerCell]}>
                                                        {member.rankChange > 0 ? (
                                                            <View style={styles.trendRow}>
                                                                <Text style={styles.trendUpArrow}>▲</Text>
                                                                <Text style={styles.trendUpText}>{member.rankChange}</Text>
                                                            </View>
                                                        ) : member.rankChange < 0 ? (
                                                            <View style={styles.trendRow}>
                                                                <Text style={styles.trendDownArrow}>▼</Text>
                                                                <Text style={styles.trendDownText}>{Math.abs(member.rankChange)}</Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={styles.trendStagnant}>—</Text>
                                                        )}
                                                    </View>
                                                ) : (
                                                    <View style={[styles.memberCell, styles.colStreak]}>
                                                        <Text style={styles.streakText}>
                                                            {member.streak}
                                                            <Text style={styles.daysLabel}> days</Text>
                                                        </Text>
                                                    </View>
                                                )}

                                                {/* Column 4: Progress / Points */}
                                                {isHeadToHead ? (
                                                    <PointsColumnCell points={member.points} />
                                                ) : (
                                                    <View style={[styles.memberCell, styles.colProgress]}>
                                                        {renderProgressBar(member.progress)}
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </Reanimated.View>
                                    );
                                })}
                            </ScrollView>

                            {/* QA Engineering Synthetic Testing Rig */}
                            {isHeadToHead && (
                                <View style={styles.qaRigContainer}>
                                    <Text style={styles.qaRigLabel}>QA ANIMATION TESTING RIG</Text>
                                    <View style={styles.qaActionRow}>
                                        <TouchableOpacity
                                            style={styles.qaPlusButton}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                if (data.length === 0) return;
                                                // Randomly select a member
                                                const randomMember = data[Math.floor(Math.random() * data.length)];
                                                // Mutate points by a random offset
                                                const pointOptions = [-50, -25, 25, 50, 100];
                                                const randomDelta = pointOptions[Math.floor(Math.random() * pointOptions.length)];
                                                mutatePoints(randomMember.id, randomDelta);
                                            }}
                                        >
                                            <Ionicons name="add" size={18} color="#DAA520" />
                                            <Text style={styles.qaPlusText}>Mutate Score</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.qaResetButton}
                                            activeOpacity={0.7}
                                            onPress={async () => {
                                                await simulateDailyReset();
                                                alert("Daily cache reset successfully! Close and re-open this modal to witness the daily ranking crossover transitions play out live.");
                                            }}
                                        >
                                            <Ionicons name="refresh-outline" size={16} color="#EDE8D5" />
                                            <Text style={styles.qaResetText}>Reset Day Cache</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>

        <TribeInfoModal
            visible={infoModalVisible}
            onClose={() => setInfoModalVisible(false)}
            type="icon-title"
            {...infoModalConfig}
        />
        </>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    backdropDismiss: {
        flex: 1,
        width: '100%',
    },
    bottomSheetContainer: {
        backgroundColor: '#262525', // Deep charcoal premium background
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: SHEET_HEIGHT,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 15,
        borderWidth: 2,
        borderColor: '#DAA520', // Glowing Harvest Gold framing borders
        borderBottomWidth: 0,
    },
    h2hFramedContainer: {
        borderWidth: 2,
        borderColor: '#DAA520', // Glowing Harvest Gold framing borders
        borderBottomWidth: 0,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    downCarrotButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    headerLabel: {
        color: Colors.theme.harvestGold,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    h2hHeaderLabel: {
        color: '#DAA520', 
        fontSize: 10.5,
        letterSpacing: 1.8,
    },
    sheetTitle: {
        color: '#EDE8D5', // Premium Dust colored title matching premier head-to-head scoreboards
        fontSize: 26,
        fontWeight: '900',
        marginTop: 4,
    },
    h2hSheetTitle: {
        color: '#EDE8D5', // Centered Dust colored override (instead of Burnt Sienna)
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    headerSpacer: {
        width: 44,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.12)',
        marginBottom: 8,
        paddingHorizontal: 8, // Crucial matching horizontal alignment padding!
    },
    columnHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#8B4513', // Burnt Sienna accent
        letterSpacing: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
    },
    currentUserRowWrapper: {
        borderRadius: 16,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8, // Compact vertical padding
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.08)',
        minHeight: 52, // Space-efficient layout height
        borderRadius: 16,
        paddingHorizontal: 8,
        marginVertical: 1, // Denser layout margin
    },
    currentUserHighlightRow: {
        backgroundColor: 'rgba(218, 165, 32, 0.12)', // Subtle Harvest Gold tint
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.35)',
    },
    memberCell: {
        justifyContent: 'center',
    },
    centerCell: {
        alignItems: 'center',
    },
    colIdentity: {
        flex: 2.3,
    },
    colIdentityCompetitive: {
        flex: 2.5,
    },
    colLogged: {
        flex: 1.2,
    },
    colLoggedCompetitive: {
        flex: 0.8,
    },
    colStreak: {
        flex: 1.3,
    },
    colTrendCompetitive: {
        flex: 1.0,
    },
    colProgress: {
        flex: 1.7,
        paddingLeft: 8,
    },
    colPointsCompetitive: {
        flex: 1.2,
        alignItems: 'flex-end',
    },
    identityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    rankContainer: {
        width: 22,
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNumberText: {
        fontSize: 14,
        fontWeight: '900',
    },
    avatar: {
        width: 32, // Compact avatar sizing
        height: 32, // Compact avatar sizing
        borderRadius: 16, // Perfect rounded boundaries
        borderWidth: 1.5,
        borderColor: '#DAA520', 
        marginRight: 10,
    },
    nameContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    displayName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 1,
    },
    userHandle: {
        color: '#EDE8D5',
        fontSize: 11,
        opacity: 0.65,
    },
    unloggedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#EDE8D5', 
        backgroundColor: 'transparent',
    },
    streakText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    daysLabel: {
        color: '#787878',
        fontSize: 11,
        fontWeight: '500',
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    trendUpArrow: {
        fontSize: 11,
        color: '#AEDD63', 
    },
    trendUpText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#AEDD63',
    },
    trendDownArrow: {
        fontSize: 11,
        color: '#8B2613', 
    },
    trendDownText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#8B2613',
    },
    trendStagnant: {
        fontSize: 12,
        fontWeight: '800',
        color: '#EDE8D5',
        opacity: 0.5,
    },
    pointsCellContainer: {
        position: 'relative',
        minWidth: 50,
        justifyContent: 'center',
    },
    pointsText: {
        color: '#FFFFFF', 
        fontSize: 15,
        fontWeight: '900',
        marginRight: 8,
    },
    floatingDeltaText: {
        position: 'absolute',
        top: -6,
        right: 8,
        fontSize: 13,
        fontWeight: '900',
        zIndex: 10,
    },
    progressContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    progressLabelText: {
        color: '#EDE8D5',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'right',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#1A1A1A',
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#DAA520',
        borderRadius: 3,
    },
    metaIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    metaIndicatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityPill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mathModifierText: {
        color: '#EDE8D5',
        fontSize: 11,
        fontWeight: '900',
        marginLeft: 1.5,
        marginTop: -3,
    },
    qaRigContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1.5,
        borderTopColor: 'rgba(237, 232, 213, 0.1)',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },
    qaRigLabel: {
        color: '#DAA520',
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
        textAlign: 'center',
        opacity: 0.7,
    },
    qaActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    qaPlusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#DAA520',
        borderRadius: 100,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    qaPlusText: {
        color: '#DAA520',
        fontSize: 12,
        fontWeight: 'bold',
    },
    qaResetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.25)',
        borderRadius: 100,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: 'rgba(237, 232, 213, 0.03)',
    },
    qaResetText: {
        color: '#EDE8D5',
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.8,
    },
});
