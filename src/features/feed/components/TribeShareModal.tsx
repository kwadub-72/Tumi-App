import React, { useRef, useState } from 'react';
import { 
    Modal, 
    StyleSheet, 
    Text, 
    View, 
    TouchableOpacity, 
    Dimensions, 
    ScrollView, 
    Image, 
    Share, 
    Linking, 
    Platform,
    ActivityIndicator,
    NativeSyntheticEvent,
    NativeScrollEvent
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import { Colors } from '@/src/shared/theme/Colors';
import { FeedPost } from '@/src/shared/models/types';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - 40; // Full padding inside modal

interface TribeShareModalProps {
    visible: boolean;
    onClose: () => void;
    post: FeedPost | null;
}

type DensityMode = 'detailed' | 'headline';
type VisualStyle = 'floating' | 'canvas';

export default function TribeShareModal({ visible, onClose, post }: TribeShareModalProps) {
    const [densityMode, setDensityMode] = useState<DensityMode>('detailed');
    const [activePageIndex, setActivePageIndex] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const floatingRef = useRef<any>(null);
    const canvasRef = useRef<any>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    if (!post) return null;

    const isMacroOrSnapshot = !!(post.macroUpdate || post.snapshot);

    // Toggle Density Mode with premium haptic feedback
    const toggleDensity = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setDensityMode(prev => prev === 'detailed' ? 'headline' : 'detailed');
    };

    // Handle horizontal page scroll to update dots cleanly
    const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = e.nativeEvent.contentOffset.x;
        const index = Math.round(offset / PAGE_WIDTH);
        if (index !== activePageIndex) {
            setActivePageIndex(index);
            Haptics.selectionAsync();
        }
    };

    // Calculate standardized macros and calories dynamically from macro components
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;
    let title = post.caption || 'Nutritional Overlay';

    if (post.meal) {
        title = post.meal.title || title;
        post.meal.ingredients?.forEach(ing => {
            totalP += ing.macros?.p || 0;
            totalC += ing.macros?.c || 0;
            totalF += ing.macros?.f || 0;
        });
    } else if (post.workout) {
        title = post.workout.title || title;
    } else if (post.macroUpdate) {
        title = post.macroUpdate.caption || title;
        totalP = post.macroUpdate.newTargets?.p || 0;
        totalC = post.macroUpdate.newTargets?.c || 0;
        totalF = post.macroUpdate.newTargets?.f || 0;
    } else if (post.snapshot) {
        title = post.snapshot.caption || title;
        totalP = (post.snapshot.targets?.p || 0) - (post.snapshot.consumed?.p || 0);
        totalC = (post.snapshot.targets?.c || 0) - (post.snapshot.consumed?.c || 0);
        totalF = (post.snapshot.targets?.f || 0) - (post.snapshot.consumed?.f || 0);
    }

    let timeStr = '';
    if (post.workout && post.workout.duration) {
        const hrs = Math.floor(post.workout.duration / 60);
        const mins = post.workout.duration % 60;
        timeStr = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
    } else if (post.createdAt && !post.macroUpdate && !post.workout) {
        timeStr = new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
    }

    // Standardized macro calorie derivation formula
    const totalCals = Math.round((totalP * 4) + (totalC * 4) + (totalF * 9));

    const getValueColor = (val: number) => {
        if (!post.snapshot) return '#FFFFFF';
        if (val > 0) return '#657F3B';
        if (val < 0) return Colors.theme.burntSienna;
        return '#FFFFFF';
    };

    // Export overlay via ViewShot capture engine
    const captureAndShare = async (targetPlatform: 'instagram' | 'tiktok' | 'system') => {
        if (isGenerating) return;
        setIsGenerating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const activeRef = activePageIndex === 0 ? floatingRef : canvasRef;
            if (!activeRef.current?.capture) {
                throw new Error('Capture engine reference unavailable');
            }

            // High-resolution export config preserving raw PNG alpha channels
            const uri = await activeRef.current.capture();

            if (targetPlatform === 'instagram') {
                const igUrl = Platform.OS === 'ios' ? `instagram://library?AssetPath=${encodeURIComponent(uri)}` : 'instagram://camera';
                const canOpen = await Linking.canOpenURL(igUrl);
                if (canOpen) {
                    await Linking.openURL(igUrl);
                } else {
                    await Share.share({ url: uri, message: `Check out this Tribe Mark overlay from ${post.user.handle}!` });
                }
            } else if (targetPlatform === 'tiktok') {
                const ttUrl = 'tiktok://';
                const canOpen = await Linking.canOpenURL(ttUrl);
                if (canOpen) {
                    await Linking.openURL(ttUrl);
                } else {
                    await Share.share({ url: uri, message: `Tribe Mark from ${post.user.handle}` });
                }
            } else {
                // Default System Clipboard Buffer / Share Sheet integration
                await Share.share({
                    url: uri,
                    title: 'Tribe Mark Overlay',
                    message: Platform.OS === 'android' ? `Tribe Mark from ${post.user.handle}` : undefined
                });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('[TribeShareEngine] Generation failure:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Shared Drop Shadow styling rules required across Logo, Branding, Text, Icons
    const dropShadowStyle = {
        shadowColor: '#000000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 2,
        elevation: 3,
    };

    const textShadowStyle = {
        textShadowColor: 'rgba(0, 0, 0, 0.35)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    };

    // Render the structured nutritional content block reused across formats
    const renderOverlayContent = (isCanvas: boolean) => (
        <View style={[styles.overlayContainer, isCanvas && styles.canvasOverlayContent]}>
            {/* Header branding row */}
            <View style={styles.overlayHeaderRow}>
                <View style={[styles.logoWrap, dropShadowStyle]}>
                    <TabonoLogo size={24} color={Colors.theme.harvestGold} hasDropShadow={true} />
                </View>
                <Text style={[styles.brandText, textShadowStyle]}>TRIBE</Text>
                <View style={styles.handleBadge}>
                    <Text style={[styles.handleBadgeText, textShadowStyle]}>{post.user.handle}</Text>
                </View>
            </View>

            {/* Main title */}
            <Text style={[styles.overlayTitle, textShadowStyle]} numberOfLines={isMacroOrSnapshot ? undefined : 2}>
                {title}
                {timeStr ? (
                    <Text style={{ color: '#DAA520' }}> · {timeStr}</Text>
                ) : null}
            </Text>

            {/* Conditional elements for macro updates and snapshots */}
            {(post.macroUpdate || post.snapshot) && (
                <>
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#EDE8D5', opacity: 0.4, width: '100%', marginTop: 6, marginBottom: 8 }} />
                    <Text style={[{ color: '#DAA520', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }, textShadowStyle]}>
                        {post.macroUpdate ? 'New targets' : 'Balance'}
                    </Text>
                </>
            )}

            {/* Aggregated macro pills block */}
            {!post.workout && (
                <View style={styles.macroSummaryDeck}>
                    <View style={[styles.macroPill, styles.calPill, dropShadowStyle]}>
                        <Text style={[styles.macroPillLabel, styles.calLabel, textShadowStyle]}>CALORIES</Text>
                        <Text style={[styles.macroPillValue, styles.calValue, textShadowStyle, { color: getValueColor(totalCals) }]}>{totalCals}</Text>
                    </View>
                    <View style={[styles.macroPill, dropShadowStyle]}>
                        <Text style={[styles.macroPillLabel, textShadowStyle]}>PROTEIN</Text>
                        <Text style={[styles.macroPillValue, textShadowStyle, { color: getValueColor(totalP) }]}>
                            {Math.round(totalP)}
                            <Text style={{ color: totalP === 0 ? '#A9A9A9' : getValueColor(totalP) }}>g</Text>
                        </Text>
                    </View>
                    <View style={[styles.macroPill, dropShadowStyle]}>
                        <Text style={[styles.macroPillLabel, textShadowStyle]}>CARBS</Text>
                        <Text style={[styles.macroPillValue, textShadowStyle, { color: getValueColor(totalC) }]}>
                            {Math.round(totalC)}
                            <Text style={{ color: totalC === 0 ? '#A9A9A9' : getValueColor(totalC) }}>g</Text>
                        </Text>
                    </View>
                    <View style={[styles.macroPill, dropShadowStyle]}>
                        <Text style={[styles.macroPillLabel, textShadowStyle]}>FAT</Text>
                        <Text style={[styles.macroPillValue, textShadowStyle, { color: getValueColor(totalF) }]}>
                            {Math.round(totalF)}
                            <Text style={{ color: totalF === 0 ? '#A9A9A9' : getValueColor(totalF) }}>g</Text>
                        </Text>
                    </View>
                </View>
            )}

            {/* Detailed data density payload view */}
            {densityMode === 'detailed' && post.meal?.ingredients && (
                <View style={[styles.ingredientsDeck, dropShadowStyle]}>
                    <View style={styles.ingredientsDeckHeader}>
                        <Text style={[styles.deckTitleText, textShadowStyle]}>Meal Breakdown</Text>
                    </View>
                    {post.meal.ingredients.slice(0, 5).map((ing, idx) => (
                        <View key={idx} style={styles.ingredientRowItem}>
                            <Text style={[styles.ingredientNameText, textShadowStyle]} numberOfLines={1}>
                                {ing.name}
                            </Text>
                            <View style={styles.ingredientRightCol}>
                                <Text style={[styles.ingredientAmountText, textShadowStyle]}>
                                    {ing.amount || '1 serving'}
                                </Text>
                                <Text style={[styles.ingredientMacroMetaText, textShadowStyle]}>
                                    {Math.round(ing.macros?.p || 0)}P / {Math.round(ing.macros?.c || 0)}C / {Math.round(ing.macros?.f || 0)}F
                                </Text>
                            </View>
                        </View>
                    ))}
                    {post.meal.ingredients.length > 5 && (
                        <Text style={[styles.overflowMetaText, textShadowStyle]}>
                            + {post.meal.ingredients.length - 5} more items
                        </Text>
                    )}
                </View>
            )}

            {/* Detailed data density payload view for workouts */}
            {densityMode === 'detailed' && post.workout?.exercises && (
                <View style={[styles.ingredientsDeck, { marginTop: 2 }, dropShadowStyle]}>
                    <View style={styles.ingredientsDeckHeader}>
                        <Text style={[styles.deckTitleText, textShadowStyle]}>Workout Breakdown</Text>
                    </View>
                    {post.workout.exercises.slice(0, 5).map((ex, idx) => {
                        const setsCount = ex.sets?.length || 0;
                        const reps = ex.sets?.map(s => s.reps) || [];
                        const minReps = reps.length > 0 ? Math.min(...reps) : 0;
                        const maxReps = reps.length > 0 ? Math.max(...reps) : 0;
                        
                        let repsStr = '';
                        if (reps.length > 0) {
                            if (minReps === maxReps) {
                                repsStr = `${minReps} reps`;
                            } else {
                                repsStr = `${minReps}-${maxReps} reps`;
                            }
                        }
                        
                        const amountStr = repsStr ? `${setsCount} sets · ${repsStr}` : `${setsCount} sets`;

                        return (
                            <View key={idx} style={styles.ingredientRowItem}>
                                <Text style={[styles.ingredientNameText, textShadowStyle]} numberOfLines={2}>
                                    {ex.title}
                                </Text>
                                <View style={styles.ingredientRightCol}>
                                    <Text style={[styles.ingredientAmountText, textShadowStyle, { color: Colors.theme.harvestGold }]}>
                                        {amountStr}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                    {post.workout.exercises.length > 5 && (
                        <Text style={[styles.overflowMetaText, textShadowStyle]}>
                            + {post.workout.exercises.length - 5} more items
                        </Text>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalBackdrop}>
                {/* Dismissal interactive touch layer */}
                <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={onClose} />

                {/* Fixed-height custom bottom sheet structure */}
                <View style={styles.bottomSheetContainer}>
                    {/* Header Row containing Back Navigation and Rolodex Selector */}
                    <View style={styles.sheetHeader}>
                        <TouchableOpacity style={styles.backNavButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="chevron-down" size={24} color={Colors.theme.dust} />
                        </TouchableOpacity>

                        {/* Centered Rolodex Header Dropdown */}
                        <TouchableOpacity 
                            style={[styles.rolodexSelector, isMacroOrSnapshot && { justifyContent: 'center' }]} 
                            onPress={isMacroOrSnapshot ? undefined : toggleDensity} 
                            activeOpacity={isMacroOrSnapshot ? 1 : 0.7}
                            disabled={isMacroOrSnapshot}
                        >
                            <Text style={styles.rolodexTitle}>
                                {isMacroOrSnapshot ? 'Headline share' : (densityMode === 'detailed' ? 'Detailed share' : 'Headline share')}
                            </Text>
                            {!isMacroOrSnapshot && (
                                <Ionicons name="swap-vertical" size={16} color={Colors.theme.burntSienna} style={styles.rolodexCarrot} />
                            )}
                        </TouchableOpacity>

                        {/* Empty spacer balance column */}
                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Subtitle guidance row */}
                    {!isMacroOrSnapshot && (
                        <Text style={styles.sheetSubtitle}>
                            Tap the header to toggle share type
                        </Text>
                    )}

                    {/* Swipeable Horizontal Paging Canvas Container */}
                    <View style={styles.pagingContainerWrapper}>
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal={true}
                            pagingEnabled={true}
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleScrollEnd}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* Page 1: Floating Style (Alpha Transparent PNG export) */}
                            <View style={styles.pageFrame}>
                                <View style={{ paddingHorizontal: 8, marginBottom: 10 }}>
                                    <Text style={styles.previewStyleTag}>Tribe Mark - Floating</Text>
                                    <Text style={{ fontSize: 11, color: '#EDE8D5', marginTop: 2 }}>Transparent background–good for pasting on Instagram stories and TikToks</Text>
                                </View>
                                <View style={styles.viewShotOuterBounds}>
                                    <ViewShot 
                                        ref={floatingRef} 
                                        options={{ format: 'png', quality: 1 }} 
                                        style={styles.transparentShotContainer}
                                    >
                                        {renderOverlayContent(false)}
                                    </ViewShot>
                                </View>
                            </View>

                            {/* Page 2: Canvas Style (Embedded Post Media overlay) */}
                            <View style={styles.pageFrame}>
                                <View style={{ paddingHorizontal: 8, marginBottom: 10, alignSelf: 'flex-start' }}>
                                    <Text style={styles.previewStyleTag}>Tribe Mark - Canvas</Text>
                                    <Text style={{ fontSize: 11, color: '#EDE8D5', marginTop: 2 }}>Photo background—good for sharing directly to social media (e.g., Instagram, TikTok)</Text>
                                </View>
                                <View style={styles.viewShotOuterBounds}>
                                    <ViewShot 
                                        ref={canvasRef} 
                                        options={{ format: 'png', quality: 1 }} 
                                        style={styles.canvasShotContainer}
                                    >
                                        {/* Optional background image layer */}
                                        {post.mediaUrl ? (
                                            <Image source={{ uri: post.mediaUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.fallbackMediaCanvas} />
                                        )}
                                        {/* Dim overlay to preserve perfect text overlay legibility */}
                                        <View style={styles.canvasDimmerOverlay} />

                                        {renderOverlayContent(true)}
                                    </ViewShot>
                                </View>
                            </View>
                        </ScrollView>
                    </View>

                    {/* Custom Pagination Indicator Dots Row */}
                    <View style={styles.paginationRow}>
                        <View style={[styles.dot, activePageIndex === 0 ? styles.activeDot : styles.inactiveDot]} />
                        <View style={[styles.dot, activePageIndex === 1 ? styles.activeDot : styles.inactiveDot]} />
                    </View>

                    {/* Direct Social Intent Sharing Footers */}
                    <View style={styles.shareActionsContainer}>
                        {isGenerating ? (
                            <View style={styles.generatingStateBox}>
                                <ActivityIndicator size="small" color={Colors.theme.harvestGold} />
                                <Text style={styles.generatingText}>Rendering retina asset...</Text>
                            </View>
                        ) : (
                                <TouchableOpacity 
                                    style={[styles.socialBtnIg, { backgroundColor: Colors.theme.harvestGold, paddingVertical: 17 }]} 
                                    onPress={() => captureAndShare('system')}
                                >
                                    <Ionicons name="share-social" size={24} color="#FFFFFF" />
                                    <Text style={[styles.socialBtnText, { fontSize: 20 }]}>Share/Copy</Text>
                                </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
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
    // Required Base Sheet parameters
    bottomSheetContainer: {
        backgroundColor: '#262525', // Specific Brand background color requirement
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: 700, // Fixed non-resizable constraint
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 15,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    backNavButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerSpacer: {
        width: 40,
    },
    rolodexSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)', // Harvest gold accent border
    },
    rolodexTitle: {
        color: Colors.theme.harvestGold,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.2,
    },
    rolodexCarrot: {
        marginLeft: 6,
    },
    sheetSubtitle: {
        color: '#EDE8D5', // Specific Dust typography requirement
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.7,
        marginBottom: 16,
    },
    pagingContainerWrapper: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    scrollContent: {
        alignItems: 'center',
    },
    pageFrame: {
        width: PAGE_WIDTH,
        height: '100%',
        padding: 12,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    previewTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    previewStyleTag: {
        color: Colors.theme.harvestGold,
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewDescTag: {
        color: '#EDE8D5',
        fontSize: 11,
        opacity: 0.6,
    },
    viewShotOuterBounds: {
        flex: 1,
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    transparentShotContainer: {
        backgroundColor: 'transparent',
        padding: 16,
        justifyContent: 'center',
    },
    canvasShotContainer: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
        padding: 16,
        paddingTop: 8,
        justifyContent: 'flex-start',
    },
    fallbackMediaCanvas: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#382F2D',
    },
    canvasDimmerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    // Overlay Internal Elements Layout
    overlayContainer: {
        width: '100%',
        backgroundColor: 'rgba(26, 26, 26, 0.85)', // Matte black semi-trans block
        borderRadius: 20,
        padding: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(218, 165, 32, 0.4)', // Harvest gold inner outline
    },
    canvasOverlayContent: {
        backgroundColor: 'rgba(26, 26, 26, 0.92)',
        transform: [{ scale: 0.75 }],
    },
    overlayHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    logoWrap: {
        marginRight: 6,
    },
    brandText: {
        color: Colors.theme.harvestGold,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
        flex: 1,
    },
    handleBadge: {
        backgroundColor: Colors.theme.burntSienna,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    handleBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    overlayTitle: {
        color: '#EDE8D5',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
        lineHeight: 22,
        textAlign: 'center',
    },
    macroSummaryDeck: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    macroPill: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(237, 232, 213, 0.15)',
    },
    calPill: {
        backgroundColor: 'rgba(139, 69, 19, 0.45)', // Tinted burnt sienna background
        borderColor: Colors.theme.harvestGold,
    },
    macroPillLabel: {
        color: '#EDE8D5',
        fontSize: 9,
        fontWeight: '700',
        opacity: 0.8,
        marginBottom: 2,
    },
    calLabel: {
        color: Colors.theme.harvestGold,
        opacity: 1,
    },
    macroPillValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
    },
    calValue: {
        color: Colors.theme.harvestGold,
        fontSize: 15,
    },
    ingredientsDeck: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(237, 232, 213, 0.15)',
        paddingTop: 10,
        gap: 6,
    },
    ingredientsDeckHeader: {
        marginBottom: 2,
    },
    deckTitleText: {
        color: Colors.theme.harvestGold,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ingredientRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ingredientNameText: {
        color: '#EDE8D5',
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    ingredientRightCol: {
        alignItems: 'flex-end',
    },
    ingredientAmountText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '500',
    },
    ingredientMacroMetaText: {
        color: Colors.theme.harvestGold,
        fontSize: 9,
        fontWeight: 'bold',
        opacity: 0.9,
    },
    overflowMetaText: {
        color: Colors.theme.burntSienna,
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 4,
        fontStyle: 'italic',
    },
    // Required Dot state values
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginVertical: 12,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        width: 20,
        backgroundColor: '#8B4513', // Specific Burnt Sienna hex spec
    },
    inactiveDot: {
        width: 8,
        backgroundColor: '#DAA520', // Specific Harvest Gold hex spec
    },
    // Social Infrastructure Controls
    shareActionsContainer: {
        gap: 8,
    },
    generatingStateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
    },
    generatingText: {
        color: Colors.theme.harvestGold,
        fontSize: 14,
        fontWeight: 'bold',
    },
    socialBtnIg: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D82D7E', // Instagram gradient approximation primary tone
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
    },
    subActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    socialBtnTt: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        paddingVertical: 10,
        borderRadius: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    socialBtnSys: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 6,
    },
    socialBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    socialBtnTextSmall: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    socialBtnTextDark: {
        color: Colors.theme.matteBlack,
        fontSize: 13,
        fontWeight: 'bold',
    },
});
