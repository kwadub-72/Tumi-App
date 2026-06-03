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
import { useIsChief } from '../hooks/useTribeRoles';
import { useRouter } from 'expo-router';
import TribeInfoModal from './TribeInfoModal';
import { DashboardCarousel } from './dashboards/DashboardCarousel';
import { H2HUserMatchupDashboard } from './dashboards/H2HUserMatchupDashboard';
import { AccountabilityDashboard } from './dashboards/AccountabilityDashboard';
import { PremierTribeBattleDashboard } from './dashboards/PremierTribeBattleDashboard';
import { TradTribeBattleDashboard } from './dashboards/TradTribeBattleDashboard';
import { Tribe } from '@/src/shared/models/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.84; 

interface TribeScoreboardModalProps {
    visible: boolean;
    onClose: () => void;
    tribeId?: string;
    tribeName?: string;
    tribe?: Tribe | null;
}

// Helper to determine top 3 rank medal coloring
const getRankColor = (rank: number) => {
    if (rank === 1) return '#DAA520'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'rgba(237, 232, 213, 0.6)'; // Soft Dust
};

export default function TribeScoreboardModal({ visible, onClose, tribeId, tribeName = "Tribe Scoreboard", tribe }: TribeScoreboardModalProps) {
    const { session } = useAuthStore();
    const { navigateToProfile } = useProfileNavigation();
    const { isChief } = useIsChief(tribeId || '');
    const router = useRouter();
    // Connect points management state hook
    const { loading, data, header, competition, mutatePoints, simulateDailyReset, simulateTripleTie } = useTribeScoreboard(tribeId);
    
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

    // Style checks to detect competitive tribes using the ultimate source of truth: the tribe object
    const compStatus = tribe?.comp_status || tribe?.tribe_type;
    const isHeadToHead = compStatus === 'premier' || compStatus === 'faceoff';
    const isFaceoff = compStatus === 'faceoff';

    const renderDashboardContent = () => {
        switch (compStatus) {
            case 'accountability':
                return <AccountabilityDashboard tribeId={tribeId} tribe={tribe} />;
            case 'premier':
                return <PremierTribeBattleDashboard tribeId={tribeId} />;
            case 'faceoff':
                return <TradTribeBattleDashboard tribeId={tribeId} />;
            default:
                // Strict fallback with no fallthroughs, defaulting to Accountability
                return <AccountabilityDashboard tribeId={tribeId} tribe={tribe} />;
        }
    };

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
                                    <Text style={[styles.headerLabel, styles.h2hHeaderLabel]}>
                                        {header?.line1 || (isFaceoff ? 'Head-to-Head • Faceoff' : 'Head-to-Head • Premier')}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Text style={[styles.sheetTitle, styles.h2hSheetTitle]} numberOfLines={1}>
                                            {tribeName.toUpperCase()}
                                        </Text>
                                        {isChief && (
                                            <TouchableOpacity onPress={() => { onClose(); router.push({ pathname: '/chiefs-chamber', params: { tribeId: tribeId } }); }}>
                                                <MaterialCommunityIcons name="crown" size={24} color="#DAA520" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.headerLabel}>Accountability</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Text style={styles.sheetTitle} numberOfLines={1}>
                                            {tribeName}
                                        </Text>
                                        {isChief && (
                                            <TouchableOpacity onPress={() => { onClose(); router.push({ pathname: '/chiefs-chamber', params: { tribeId: tribeId } }); }}>
                                                <MaterialCommunityIcons name="crown" size={24} color="#DAA520" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>

                        <View style={styles.headerSpacer} />
                    </View>

                    <ScrollView 
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {renderDashboardContent()}
                    </ScrollView>
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
        flex: 2,
    },
    colIdentityCompetitive: {
        flex: 2.5,
    },
    colLogged: {
        flex: 1,
    },
    colLoggedCompetitive: {
        flex: 0.8,
    },
    colStreak: {
        flex: 1,
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
    recordText: {
        color: '#FFFFFF', 
        fontSize: 14,
        fontWeight: '900',
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
