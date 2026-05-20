import React, { useEffect } from 'react';
import { 
    Modal, 
    StyleSheet, 
    Text, 
    View, 
    TouchableOpacity, 
    Dimensions, 
    Image 
} from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming, 
    withRepeat,
    withDelay,
    cancelAnimation,
    Easing,
    runOnJS 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/shared/theme/Colors';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiParticleProps {
    index: number;
    themeColor: string;
}

function ConfettiParticle({ index, themeColor }: ConfettiParticleProps) {
    const startX = Math.random() * SCREEN_WIDTH;
    const size = Math.random() * 8 + 6;
    const colors = [themeColor, '#C59B27', '#EDE8D5', '#9C7A1E', '#8B4513'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const translateY = useSharedValue(-50);
    const rotation = useSharedValue(Math.random() * 360);
    const driftX = useSharedValue(startX);

    useEffect(() => {
        translateY.value = withDelay(
            Math.random() * 2000,
            withRepeat(
                withTiming(SCREEN_HEIGHT + 50, {
                    duration: Math.random() * 3000 + 2500,
                    easing: Easing.linear,
                }),
                -1,
                false
            )
        );

        driftX.value = withRepeat(
            withTiming(startX + (Math.random() * 60 - 30), {
                duration: Math.random() * 1500 + 1000,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );

        rotation.value = withRepeat(
            withTiming(rotation.value + 360, {
                duration: Math.random() * 2000 + 1000,
                easing: Easing.linear,
            }),
            -1,
            false
        );

        return () => {
            cancelAnimation(translateY);
            cancelAnimation(driftX);
            cancelAnimation(rotation);
        };
    }, []);

    const animStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: translateY.value },
                { translateX: driftX.value },
                { rotate: `${rotation.value}deg` }
            ]
        };
    });

    return (
        <Animated.View
            style={[
                styles.particle,
                animStyle,
                {
                    width: size,
                    height: size,
                    backgroundColor: color,
                    borderRadius: Math.random() > 0.5 ? size / 2 : 2,
                }
            ]}
        />
    );
}

interface CompetitionWinnerOverlayProps {
    visible: boolean;
    onClose: () => void;
    tribeId: string;
    tribeName: string;
    winner: {
        name: string;
        handle: string;
        avatar: string | null;
        points: number;
        wins?: number;
        losses?: number;
    } | null;
    themeColor?: string;
}

export default function CompetitionWinnerOverlay({
    visible,
    onClose,
    tribeId,
    tribeName,
    winner,
    themeColor = '#DAA520'
}: CompetitionWinnerOverlayProps) {
    const [shouldRender, setShouldRender] = React.useState(visible);
    const backdropOpacity = useSharedValue(0);
    const scale = useSharedValue(0.7);
    const cardOpacity = useSharedValue(0);

    const cacheKey = `TUMI_TRIBES_WINNER_OVERLAY_DISMISSED_${tribeId}`;

    // Enforce Harvest Gold (#DAA520) unconditionally for all winner overlays
    const effectiveThemeColor = '#DAA520';

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            backdropOpacity.value = withTiming(1, { duration: 400 });
            scale.value = withSpring(1, { damping: 15, stiffness: 90 });
            cardOpacity.value = withTiming(1, { duration: 400 });
        } else {
            backdropOpacity.value = withTiming(0, { duration: 300 });
            scale.value = withTiming(0.8, { duration: 300 });
            cardOpacity.value = withTiming(0, { duration: 300 }, () => {
                runOnJS(setShouldRender)(false);
            });
        }
    }, [visible]);

    const handleDismiss = async () => {
        Haptics.selectionAsync();
        try {
            await AsyncStorage.setItem(cacheKey, 'true');
        } catch (e) {
            console.error('Failed to set overlay dismissal:', e);
        }
        onClose();
    };

    const backdropAnimStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value
    }));

    const cardAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: cardOpacity.value
    }));

    const active = visible || shouldRender;
    console.log("[WinnerOverlay] render parameters:", { visible, shouldRender, active, hasWinner: !!winner });

    if (!active || !winner) {
        console.log("[WinnerOverlay] Skipped render due to inactive state or missing winner:", { active, hasWinner: !!winner });
        return null;
    }

    const particles = Array.from({ length: 30 }, (_, i) => i);
    const isFaceoff = winner?.wins !== undefined && winner?.losses !== undefined;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 9999 }]}>
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropAnimStyle]}>
                    <TouchableOpacity 
                        style={styles.dismissPressable} 
                        activeOpacity={1} 
                        onPress={handleDismiss} 
                    />
                </Animated.View>

                {/* Falling Confetti Particles */}
                {particles.map((p) => (
                    <ConfettiParticle key={p} index={p} themeColor={effectiveThemeColor} />
                ))}

                {/* Animated Championship Card */}
                <Animated.View style={[styles.card, cardAnimStyle, { borderColor: effectiveThemeColor, shadowColor: effectiveThemeColor }]}>
                    <View style={styles.crownContainer}>
                        <View style={[styles.glowingCrown, { shadowColor: effectiveThemeColor }]}>
                            <Ionicons name="trophy" size={54} color={effectiveThemeColor} />
                        </View>
                    </View>

                    <Text 
                        style={[styles.preTitle, { color: effectiveThemeColor }]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                    >
                        {isFaceoff ? 'Head-to-Head · Faceoff · Habits' : 'Head-to-Head · Premier · Habits'}
                    </Text>
                    <Text style={styles.tribeName} numberOfLines={1}>{tribeName.toUpperCase()}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.celebrationLabel}>CROWNING THE VICTOR</Text>

                    <View style={styles.winnerProfileContainer}>
                        <Image 
                            source={winner.avatar ? { uri: winner.avatar } : require('@/assets/images/react-logo.png')} 
                            style={[styles.avatar, { borderColor: effectiveThemeColor }]} 
                        />
                        <View style={styles.winnerIdentity}>
                            <Text style={styles.displayName} numberOfLines={1}>{winner.name}</Text>
                            <Text style={styles.handle} numberOfLines={1}>{winner.handle}</Text>
                        </View>
                    </View>

                    <View style={styles.pointsBadge}>
                        <Text style={[styles.pointsLabel, { color: effectiveThemeColor }]}>
                            {isFaceoff ? 'FINAL RECORD' : 'TOTAL SCORE'}
                        </Text>
                        <Text style={styles.pointsValue}>
                            {isFaceoff ? `${winner.wins}-${winner.losses} Record` : `${winner.points} PTS`}
                        </Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.claimButton, { borderColor: effectiveThemeColor, shadowColor: effectiveThemeColor }]}
                        activeOpacity={0.8}
                        onPress={handleDismiss}
                    >
                        <Text style={styles.claimButtonText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    dismissPressable: {
        flex: 1,
    },
    particle: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
    },
    card: {
        width: SCREEN_WIDTH * 0.86,
        backgroundColor: '#121212',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#DAA520',
        padding: 24,
        alignItems: 'center',
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
        zIndex: 20,
    },
    crownContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(218, 165, 32, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(218, 165, 32, 0.25)',
    },
    glowingCrown: {
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    preTitle: {
        color: '#DAA520',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 4,
        textAlign: 'center',
    },
    tribeName: {
        color: '#EDE8D5',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    divider: {
        width: '60%',
        height: 1,
        backgroundColor: 'rgba(237, 232, 213, 0.1)',
        marginBottom: 16,
    },
    celebrationLabel: {
        color: '#787878',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    winnerProfileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(237, 232, 213, 0.03)',
        borderRadius: 16,
        padding: 12,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.05)',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#DAA520',
        marginRight: 12,
    },
    winnerIdentity: {
        flex: 1,
    },
    displayName: {
        color: '#EDE8D5',
        fontSize: 16,
        fontWeight: 'bold',
    },
    handle: {
        color: '#8B4513',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    pointsBadge: {
        backgroundColor: 'rgba(218, 165, 32, 0.12)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
        marginBottom: 20,
    },
    pointsLabel: {
        color: '#DAA520',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    pointsValue: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
    },
    claimButton: {
        backgroundColor: '#000000',
        borderWidth: 2,
        borderColor: '#DAA520',
        borderRadius: 100,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    claimButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
