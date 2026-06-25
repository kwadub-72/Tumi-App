import React, { useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import * as Haptics from 'expo-haptics';
import { NaturalApplication } from '../src/shared/models/database.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NaturalDecisionOverlayProps {
    visible: boolean;
    onClose: () => void;
    application: NaturalApplication | null;
}

export default function NaturalDecisionOverlay({
    visible,
    onClose,
    application,
}: NaturalDecisionOverlayProps) {
    const [shouldRender, setShouldRender] = React.useState(visible);
    const backdropOpacity = useSharedValue(0);
    const scale = useSharedValue(0.7);
    const cardOpacity = useSharedValue(0);

    const themeColor = '#DAA520'; // Harvest Gold

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

    const handleDismiss = () => {
        Haptics.selectionAsync();
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

    if (!active || !application) {
        return null;
    }

    const isApproved = application.status === 'approved';
    const iconColor = isApproved ? themeColor : '#E66767';

    const title = isApproved ? 'Application Approved' : 'Application Update';
    const body = isApproved
        ? 'You have been approved for Natural status. For integrity purposes, this status will need to be reapplied for after six months.'
        : 'Your application for Natural status has been reviewed and unfortunately cannot be approved at this time.';

    return (
        <View style={styles.modalRoot}>
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropAnimStyle]}>
                    <TouchableOpacity 
                        style={styles.dismissPressable} 
                        activeOpacity={1} 
                        onPress={handleDismiss} 
                    />
                </Animated.View>

                {/* Animated Championship-style Card */}
                <Animated.View style={[styles.card, cardAnimStyle, { borderColor: themeColor, shadowColor: themeColor }]}>
                    <View style={[
                        styles.iconContainer, 
                        !isApproved && { 
                            borderColor: 'rgba(230, 103, 103, 0.25)', 
                            backgroundColor: 'rgba(230, 103, 103, 0.08)' 
                        }
                    ]}>
                        <View style={[styles.glowingIcon, { shadowColor: iconColor }]}>
                            <Ionicons 
                                name={isApproved ? "leaf" : "close-circle-outline"} 
                                size={54} 
                                color={iconColor} 
                            />
                        </View>
                    </View>

                    <Text style={styles.celebrationLabel}>
                        {isApproved ? 'VERIFICATION COMPLETED' : 'VERIFICATION DECISION'}
                    </Text>

                    <Text style={styles.title} numberOfLines={1}>{title.toUpperCase()}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.bodyText}>{body}</Text>

                    <TouchableOpacity 
                        style={[styles.claimButton, { borderColor: themeColor, shadowColor: themeColor }]}
                        activeOpacity={0.8}
                        onPress={handleDismiss}
                    >
                        <Text style={styles.claimButtonText}>Continue to Chribe</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99999,
        elevation: 9999,
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
    iconContainer: {
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
    glowingIcon: {
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    celebrationLabel: {
        color: '#787878',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    title: {
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
    bodyText: {
        color: '#EDE8D5',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        opacity: 0.85,
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
