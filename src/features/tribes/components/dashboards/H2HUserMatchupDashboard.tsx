import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Animated,
    Modal,
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../../shared/theme/Colors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_INNER_WIDTH = SCREEN_WIDTH - 80; // card has 20px padding left/right, activity has 20px margin left/right

interface MacroRaw {
    caloriesConsumed: number;
    caloriesTarget: number;
    proteinConsumed: number;
    proteinTarget: number;
    carbsConsumed: number;
    carbsTarget: number;
    fatsConsumed: number;
    fatsTarget: number;
}

interface Competitor {
    name: string;
    handle: string;
    avatar: string;
    status: 'natural' | 'enhanced' | null;
    activity: string;
    activityIcon: string;
    score: number;
    macros: {
        calories: number; // pct
        protein: number;
        carbs: number;
        fats: number;
    };
    macroRaw: MacroRaw;
}

interface HistoricalEntry {
    day: string;
    leftPoints: number;
    rightPoints: number;
    description: string;
}

interface MatchupPairing {
    id: string;
    leftUser: Competitor;
    rightUser: Competitor;
    dailyLedger: HistoricalEntry[];
}

const mockMatchups: MatchupPairing[] = [
    {
        id: 'matchup-1',
        leftUser: {
            name: 'Riley Cooper',
            handle: '@rcooper',
            avatar: 'https://i.pravatar.cc/100?img=12',
            status: 'natural',
            activity: 'Bodybuilding',
            activityIcon: 'weight',
            score: 49,
            macros: { calories: 90, protein: 95, carbs: 80, fats: 85 },
            macroRaw: { caloriesConsumed: 2520, caloriesTarget: 2800, proteinConsumed: 190, proteinTarget: 200, carbsConsumed: 320, carbsTarget: 400, fatsConsumed: 72, fatsTarget: 85 }
        },
        rightUser: {
            name: 'Peyton Reed',
            handle: '@preed',
            avatar: 'https://i.pravatar.cc/100?img=47',
            status: 'natural',
            activity: 'Powerlifting',
            activityIcon: 'trophy-outline',
            score: 35,
            macros: { calories: 75, protein: 80, carbs: 65, fats: 70 },
            macroRaw: { caloriesConsumed: 2100, caloriesTarget: 2800, proteinConsumed: 160, proteinTarget: 200, carbsConsumed: 260, carbsTarget: 400, fatsConsumed: 60, fatsTarget: 85 }
        },
        dailyLedger: [
            { day: 'Saturday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' },
            { day: 'Friday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' },
            { day: 'Thursday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' },
            { day: 'Wednesday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' },
            { day: 'Tuesday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' },
            { day: 'Monday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' },
            { day: 'Sunday', leftPoints: 7, rightPoints: 5, description: 'Macros compliance met' }
        ]
    },
    {
        id: 'matchup-2',
        leftUser: {
            name: 'Kwaku',
            handle: '@kwadub',
            avatar: 'https://i.pravatar.cc/100?img=33',
            status: 'natural',
            activity: 'Powerlifting',
            activityIcon: 'dumbbell',
            score: 35,
            macros: { calories: 80, protein: 85, carbs: 70, fats: 75 },
            macroRaw: { caloriesConsumed: 2240, caloriesTarget: 2800, proteinConsumed: 170, proteinTarget: 200, carbsConsumed: 280, carbsTarget: 400, fatsConsumed: 64, fatsTarget: 85 }
        },
        rightUser: {
            name: 'Michael',
            handle: '@MikeyMike123',
            avatar: 'https://i.pravatar.cc/100?img=60',
            status: 'natural',
            activity: 'Bodybuilding',
            activityIcon: 'weight',
            score: 42,
            macros: { calories: 95, protein: 90, carbs: 85, fats: 80 },
            macroRaw: { caloriesConsumed: 2660, caloriesTarget: 2800, proteinConsumed: 180, proteinTarget: 200, carbsConsumed: 340, carbsTarget: 400, fatsConsumed: 68, fatsTarget: 85 }
        },
        dailyLedger: [
            { day: 'Saturday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' },
            { day: 'Friday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' },
            { day: 'Thursday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' },
            { day: 'Wednesday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' },
            { day: 'Tuesday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' },
            { day: 'Monday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' },
            { day: 'Sunday', leftPoints: 5, rightPoints: 6, description: 'Macro goals reached' }
        ]
    },
    {
        id: 'matchup-3',
        leftUser: {
            name: 'Avery Miller',
            handle: '@amiller',
            avatar: 'https://i.pravatar.cc/100?img=38',
            status: 'enhanced',
            activity: 'Weightlifting',
            activityIcon: 'arm-flex',
            score: 28,
            macros: { calories: 60, protein: 70, carbs: 50, fats: 55 },
            macroRaw: { caloriesConsumed: 1680, caloriesTarget: 2800, proteinConsumed: 140, proteinTarget: 200, carbsConsumed: 200, carbsTarget: 400, fatsConsumed: 47, fatsTarget: 85 }
        },
        rightUser: {
            name: 'Sam White',
            handle: '@swhite',
            avatar: 'https://i.pravatar.cc/100?img=11',
            status: 'natural',
            activity: 'Crossfit',
            activityIcon: 'lightning-bolt',
            score: 28,
            macros: { calories: 60, protein: 65, carbs: 55, fats: 60 },
            macroRaw: { caloriesConsumed: 1680, caloriesTarget: 2800, proteinConsumed: 130, proteinTarget: 200, carbsConsumed: 220, carbsTarget: 400, fatsConsumed: 51, fatsTarget: 85 }
        },
        dailyLedger: [
            { day: 'Saturday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' },
            { day: 'Friday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' },
            { day: 'Thursday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' },
            { day: 'Wednesday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' },
            { day: 'Tuesday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' },
            { day: 'Monday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' },
            { day: 'Sunday', leftPoints: 4, rightPoints: 4, description: 'Macros targets checked' }
        ]
    },
    {
        id: 'matchup-4',
        leftUser: {
            name: 'Empty Left',
            handle: '@emptyleft',
            avatar: 'https://i.pravatar.cc/100?img=1',
            status: 'natural',
            activity: 'Bodybuilding',
            activityIcon: 'weight',
            score: 0,
            macros: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            macroRaw: { caloriesConsumed: 0, caloriesTarget: 2800, proteinConsumed: 0, proteinTarget: 200, carbsConsumed: 0, carbsTarget: 400, fatsConsumed: 0, fatsTarget: 85 }
        },
        rightUser: {
            name: 'Empty Right',
            handle: '@emptyright',
            avatar: 'https://i.pravatar.cc/100?img=2',
            status: 'natural',
            activity: 'Bodybuilding',
            activityIcon: 'weight',
            score: 0,
            macros: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            macroRaw: { caloriesConsumed: 0, caloriesTarget: 2800, proteinConsumed: 0, proteinTarget: 200, carbsConsumed: 0, carbsTarget: 400, fatsConsumed: 0, fatsTarget: 85 }
        },
        dailyLedger: []
    }
];

interface H2HUserMatchupDashboardProps {
    isEmbedded?: boolean;
    containerWidth?: number;
}

export const H2HUserMatchupDashboard: React.FC<H2HUserMatchupDashboardProps> = ({ isEmbedded = false, containerWidth }) => {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean; title: string; description: string; iconName: any } | null>(null);


    const innerCarouselWidth = containerWidth !== undefined ? containerWidth - 40 : CARD_INNER_WIDTH;

    const activeMatchup = mockMatchups[selectedIdx];

    // Count up & scale pop animation state
    const [leftScoreVal, setLeftScoreVal] = useState(0);
    const [rightScoreVal, setRightScoreVal] = useState(0);
    const scaleLeft = useRef(new Animated.Value(1)).current;
    const scaleRight = useRef(new Animated.Value(1)).current;
    const scaleHyphen = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let isMounted = true;
        const triggerAnimations = async () => {
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const key = `@TUMI_H2H_MATCHUP_LAST_ANIM_${activeMatchup.id}`;
                const lastAnimDate = await AsyncStorage.getItem(key);

                // Run animation (always run on manual dropdown select, or if it is the first open of the day)
                const shouldAnimate = !lastAnimDate || lastAnimDate !== todayStr;
                await AsyncStorage.setItem(key, todayStr);

                if (shouldAnimate) {
                    // Reset to 0 for count up
                    setLeftScoreVal(0);
                    setRightScoreVal(0);

                    // Score scale pop animations
                    scaleLeft.setValue(0);
                    scaleRight.setValue(0);
                    scaleHyphen.setValue(0);

                    Animated.stagger(150, [
                        Animated.spring(scaleLeft, { toValue: 1, friction: 5, useNativeDriver: true }),
                        Animated.spring(scaleHyphen, { toValue: 1, friction: 6, useNativeDriver: true }),
                        Animated.spring(scaleRight, { toValue: 1, friction: 5, useNativeDriver: true })
                    ]).start();

                    // Count up score logic
                    const leftTarget = activeMatchup.leftUser.score;
                    const rightTarget = activeMatchup.rightUser.score;
                    const duration = 1200;
                    const frameTime = 16; // ~60fps
                    const steps = Math.ceil(duration / frameTime);
                    let currentStep = 0;

                    const timer = setInterval(() => {
                        currentStep++;
                        if (currentStep >= steps) {
                            if (isMounted) {
                                setLeftScoreVal(leftTarget);
                                setRightScoreVal(rightTarget);
                            }
                            clearInterval(timer);
                        } else {
                            const progress = currentStep / steps;
                            const easeOutQuad = progress * (2 - progress); // basic easeOut
                            if (isMounted) {
                                setLeftScoreVal(Math.round(leftTarget * easeOutQuad));
                                setRightScoreVal(Math.round(rightTarget * easeOutQuad));
                            }
                        }
                    }, frameTime);

                    return () => clearInterval(timer);
                } else {
                    setLeftScoreVal(activeMatchup.leftUser.score);
                    setRightScoreVal(activeMatchup.rightUser.score);
                    scaleLeft.setValue(1);
                    scaleRight.setValue(1);
                    scaleHyphen.setValue(1);
                }
            } catch (err) {
                console.warn('AsyncStorage error in matchup animation', err);
                setLeftScoreVal(activeMatchup.leftUser.score);
                setRightScoreVal(activeMatchup.rightUser.score);
            }
        };

        triggerAnimations();

        return () => {
            isMounted = false;
        };
    }, [selectedIdx, activeMatchup]);

    const renderIcons = (user: Competitor) => (
        <>
            {user.status === 'natural' && (
                <TouchableOpacity
                    onPress={() => setModalInfo({
                        visible: true,
                        title: 'Natural Athlete',
                        description: `${user.name} is verified as a natural athlete.`,
                        iconName: 'leaf'
                    })}
                >
                    <MaterialCommunityIcons name="leaf" size={15} color={Colors.theme.naturalGreen} style={styles.statusIcon} />
                </TouchableOpacity>
            )}
            {user.status === 'enhanced' && (
                <TouchableOpacity
                    onPress={() => setModalInfo({
                        visible: true,
                        title: 'Enhanced Athlete',
                        description: `${user.name} is verified as an enhanced athlete.`,
                        iconName: 'lightning-bolt'
                    })}
                >
                    <MaterialCommunityIcons name="lightning-bolt" size={15} color={Colors.theme.harvestGold} style={styles.statusIcon} />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={() => setModalInfo({
                    visible: true,
                    title: user.activity,
                    description: '',
                    iconName: resolveActivityIcon(user.activity, user.activityIcon) as any
                })}
            >
                <MaterialCommunityIcons name={resolveActivityIcon(user.activity, user.activityIcon) as any} size={14} color={Colors.theme.dust} style={styles.statusIcon} />
            </TouchableOpacity>
        </>
    );

    return (
        <View style={[styles.cardContainer, isEmbedded && styles.embeddedCardContainer]}>
            {/* Standardized Header System */}
            {!isEmbedded && (
                <View style={styles.headerContext}>
                    <Text style={styles.headerLine1}>Head-to-Head · Faceoff · Habits</Text>
                    <Text style={styles.headerLine2}>THE CUT SQUAD</Text>
                    <Text style={styles.headerLine3}>Week 10 / 10</Text>
                </View>
            )}

            {/* Matchup Selector Dropdown */}
            <TouchableOpacity
                style={styles.dropdownBtn}
                activeOpacity={0.8}
                onPress={() => setPickerVisible(true)}
            >
                <Text style={styles.dropdownText} numberOfLines={1}>
                    {activeMatchup.leftUser.name} vs. {activeMatchup.rightUser.name}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.theme.harvestGold} />
            </TouchableOpacity>

            {/* Fixed Upper Scorecard Component */}
            <View style={styles.fixedUpperScorecard}>
                {/* Top Row: Avatars and Scores vertically center-aligned */}
                <View style={styles.avatarsRow}>
                    {/* Left Avatar */}
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: activeMatchup.leftUser.avatar }} style={styles.avatarImage} />
                    </View>

                    {/* Score Centered Comparison */}
                    <View style={styles.centerScoreCol}>
                        <View style={styles.scoreContainer}>
                            <Animated.Text style={[styles.largeScoreText, { transform: [{ scale: scaleLeft }] }]}>
                                {leftScoreVal}
                            </Animated.Text>
                            <Animated.Text style={[styles.largeScoreText, { transform: [{ scale: scaleHyphen }] }]}>
                                {' - '}
                            </Animated.Text>
                            <Animated.Text style={[styles.largeScoreText, { transform: [{ scale: scaleRight }] }]}>
                                {rightScoreVal}
                            </Animated.Text>
                        </View>
                    </View>

                    {/* Right Avatar */}
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: activeMatchup.rightUser.avatar }} style={styles.avatarImage} />
                    </View>
                </View>

                {/* Bottom Row: Names & Handles */}
                <View style={styles.metadataRow}>
                    {/* Left Competitor Metadata */}
                    <View style={styles.leftMetaCol}>
                        <View style={styles.nameRow}>
                            <Text style={styles.displayName} numberOfLines={1}>
                                {activeMatchup.leftUser.name}
                            </Text>
                            {renderIcons(activeMatchup.leftUser)}
                        </View>
                        <Text style={styles.handleText} numberOfLines={1}>
                            {activeMatchup.leftUser.handle}
                        </Text>
                    </View>

                    {/* Spacer to align metadata precisely underneath the avatars */}
                    <View style={{ flex: 1 }} />

                    {/* Right Competitor Metadata */}
                    <View style={styles.rightMetaCol}>
                        <View style={[styles.nameRow, { justifyContent: 'flex-end' }]}>
                            {renderIcons(activeMatchup.rightUser)}
                            <Text style={styles.displayName} numberOfLines={1}>
                                {activeMatchup.rightUser.name}
                            </Text>
                        </View>
                        <Text style={[styles.handleText, { textAlign: 'right' }]} numberOfLines={1}>
                            {activeMatchup.rightUser.handle}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Macro Progress Section */}
            <View style={[styles.macroSection, { width: innerCarouselWidth, alignSelf: 'center' }]}>
                <Text style={styles.todayProgressHeader}>Today's progress</Text>
                <View style={styles.slidersSplitGrid}>
                    {/* Left User's Sliders */}
                    <View style={styles.splitSliderColumn}>
                        {renderSliders(activeMatchup.leftUser.macros, activeMatchup.leftUser.macroRaw, false)}
                    </View>

                    {/* Middle Icons Axis */}
                    <View style={styles.sliderAxis}>
                        <View style={styles.axisItem}>
                            <MaterialCommunityIcons name="fire" size={28} color={Colors.theme.harvestGold} />
                        </View>
                        <View style={styles.axisItem}>
                            <MaterialCommunityIcons name="food-drumstick" size={28} color={Colors.theme.harvestGold} />
                        </View>
                        <View style={styles.axisItem}>
                            <MaterialCommunityIcons name="barley" size={28} color={Colors.theme.harvestGold} />
                        </View>
                        <View style={styles.axisItem}>
                            <Ionicons name="water" size={28} color={Colors.theme.harvestGold} />
                        </View>
                    </View>

                    {/* Right User's Sliders */}
                    <View style={[styles.splitSliderColumn, { alignItems: 'flex-end' }]}>
                        {renderSliders(activeMatchup.rightUser.macros, activeMatchup.rightUser.macroRaw, true)}
                    </View>
                </View>

                {/* Legend */}
                <View style={styles.sliderLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.theme.harvestGold }]} />
                        <Text style={styles.legendText}>Consumed</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(218,165,32,0.3)' }]} />
                        <Text style={styles.legendText}>Remaining</Text>
                    </View>
                </View>
            </View>

            {/* Custom Matchup Picker Modal */}
            <Modal
                visible={pickerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.pickerBackdrop}
                    activeOpacity={1}
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>SELECT MATCHUP</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {mockMatchups.map((pairing, index) => (
                                <TouchableOpacity
                                    key={pairing.id}
                                    style={[
                                        styles.pickerRow,
                                        selectedIdx === index && styles.pickerRowActive
                                    ]}
                                    onPress={() => {
                                        setSelectedIdx(index);
                                        setPickerVisible(false);
                                    }}
                                >
                                    <View style={styles.pickerCompetitorBlock}>
                                        <Image source={{ uri: pairing.leftUser.avatar }} style={styles.pickerAvatar} />
                                        <Text style={[styles.pickerName, selectedIdx === index && { color: Colors.theme.harvestGold }]} numberOfLines={1}>
                                            {pairing.leftUser.name}
                                        </Text>
                                    </View>
                                    <Text style={styles.pickerVsLabel}>VS</Text>
                                    <View style={[styles.pickerCompetitorBlock, { alignItems: 'flex-end' }]}>
                                        <Text style={[styles.pickerName, selectedIdx === index && { color: Colors.theme.harvestGold }]} numberOfLines={1}>
                                            {pairing.rightUser.name}
                                        </Text>
                                        <Image source={{ uri: pairing.rightUser.avatar }} style={styles.pickerAvatar} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Info Modal */}
            {modalInfo && (
                <TribeInfoModal
                    visible={modalInfo.visible}
                    onClose={() => setModalInfo(null)}
                    title={modalInfo.title}
                    description={modalInfo.description}
                    type="icon-title"
                    iconName={modalInfo.iconName}
                />
            )}
        </View>
    );
};

// Helper renderer for macro progression sliders with consumed/remaining labels
const renderSliders = (macros: Competitor['macros'], raw: MacroRaw, isRightSide = false) => {
    const rows: { key: keyof Competitor['macros']; consumed: number; target: number; unit: string }[] = [
        { key: 'calories',  consumed: raw.caloriesConsumed,  target: raw.caloriesTarget,  unit: 'kcal' },
        { key: 'protein',   consumed: raw.proteinConsumed,   target: raw.proteinTarget,   unit: 'g' },
        { key: 'carbs',     consumed: raw.carbsConsumed,     target: raw.carbsTarget,     unit: 'g' },
        { key: 'fats',      consumed: raw.fatsConsumed,      target: raw.fatsTarget,      unit: 'g' },
    ];
    return rows.map(({ key, consumed, target, unit }) => {
        const pct = macros[key];
        const remaining = Math.max(0, target - consumed);
        return (
            <View key={key} style={styles.sliderTrackWrapper}>
                {/* Consumed / Remaining label row */}
                <View style={[styles.sliderLabelRow, isRightSide && { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.sliderLabelConsumed}>{consumed}{unit}</Text>
                    <Text style={styles.sliderLabelRemaining}>{remaining}{unit} left</Text>
                </View>
                <View style={styles.sliderTrackBg}>
                    <View
                        style={[
                            styles.sliderTrackFill,
                            { width: `${pct}%`, backgroundColor: Colors.theme.harvestGold },
                            isRightSide && { alignSelf: 'flex-end' }
                        ]}
                    />
                </View>
            </View>
        );
    });
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#262525', // Premium Charcoal
        borderRadius: 35,
        padding: 20,
        paddingTop: 18,
        borderWidth: 2,
        borderColor: '#DAA520', // Glowing Harvest Gold framing borders
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
        marginBottom: 20,
    },
    embeddedCardContainer: {
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: 0,
        paddingTop: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
        marginBottom: 0,
    },
    headerContext: {
        alignItems: 'center',
        marginBottom: 10,
    },
    headerLine1: {
        color: '#DAA520', // Harvest Gold
        fontSize: 10.5,
        fontWeight: 'bold',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    headerLine2: {
        color: '#EDE8D5', // Dust
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginTop: 2,
    },
    headerLine3: {
        color: '#FFFFFF', // Soft White
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.9,
        marginTop: 2,
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
        gap: 6,
        maxWidth: '85%',
    },
    dropdownText: {
        color: '#EDE8D5',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    fixedUpperScorecard: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.12)',
        paddingBottom: 16,
        marginBottom: 16,
    },
    avatarsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    competitorCol: {
        flex: 1.2,
        alignItems: 'flex-start',
    },
    centerScoreCol: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metadataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 8,
    },
    leftMetaCol: {
        flex: 1.2,
        alignItems: 'flex-start',
    },
    rightMetaCol: {
        flex: 1.2,
        alignItems: 'flex-end',
    },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#DAA520',
        overflow: 'hidden',
        backgroundColor: '#1A1A1A',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    metadataBlock: {
        marginTop: 6,
        width: '100%',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    displayName: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    handleText: {
        color: '#787878',
        fontSize: 11,
        marginTop: 1,
    },
    statusIcon: {
        marginHorizontal: 1,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeScoreText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    macroSection: {
        marginTop: 4,
        paddingTop: 12,
    },
    todayProgressHeader: {
        color: Colors.theme.burntSienna,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: 16,
    },
    slidersSplitGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    splitSliderColumn: {
        width: '37%',
        gap: 22,
    },
    sliderAxis: {
        width: '22%',
        alignItems: 'center',
        gap: 22,
    },
    axisItem: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(218, 165, 32, 0.3)',
    },
    sliderTrackWrapper: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        gap: 4,
    },
    sliderLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sliderLabelConsumed: {
        color: Colors.theme.harvestGold,
        fontSize: 10,
        fontWeight: '700',
    },
    sliderLabelRemaining: {
        color: 'rgba(237,232,213,0.45)',
        fontSize: 10,
        fontWeight: '500',
    },
    sliderTrackBg: {
        width: '100%',
        height: 20,
        backgroundColor: '#1A1A1A',
        borderRadius: 10,
        overflow: 'hidden',
    },
    sliderTrackFill: {
        height: '100%',
        backgroundColor: '#DAA520',
        borderRadius: 10,
    },
    sliderLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        color: 'rgba(237,232,213,0.55)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    ledgerScrollContent: {
        paddingVertical: 4,
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    ledgerCardSide: {
        width: '40%',
    },
    ledgerDayColumn: {
        width: '16%',
        alignItems: 'center',
    },
    ledgerDayLabel: {
        color: '#DAA520',
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    ledgerMiniCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.08)',
    },
    ledgerLeftCard: {
        alignItems: 'flex-start',
    },
    ledgerRightCard: {
        alignItems: 'flex-end',
    },
    ledgerPointsText: {
        color: '#DAA520',
        fontSize: 12,
        fontWeight: '900',
    },
    ledgerDescText: {
        color: '#787878',
        fontSize: 9,
        marginTop: 1,
    },
    zeroStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        gap: 8,
    },
    zeroStateText: {
        color: '#DAA520',
        fontSize: 14,
        fontWeight: 'bold',
    },
    subPagerDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    subDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(237, 232, 213, 0.25)',
    },
    subDotActive: {
        backgroundColor: '#DAA520',
        width: 16,
    },
    pickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerCard: {
        width: '85%',
        maxHeight: '60%',
        backgroundColor: '#262525',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#DAA520',
        padding: 20,
    },
    pickerTitle: {
        color: '#DAA520',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.08)',
    },
    pickerRowActive: {
        backgroundColor: 'rgba(218, 165, 32, 0.1)',
        borderRadius: 12,
    },
    pickerCompetitorBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '42%',
    },
    pickerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#DAA520',
    },
    pickerName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        flex: 1,
    },
    pickerVsLabel: {
        color: '#787878',
        fontSize: 11,
        fontWeight: '900',
        width: '12%',
        textAlign: 'center',
    }
});
