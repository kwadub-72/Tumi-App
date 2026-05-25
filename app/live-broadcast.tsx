import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useMacroMapPromptStore } from '@/src/features/macromaps/store/useMacroMapPromptStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function LiveMapBroadcastStudioScreen() {
    const router = useRouter();
    const { is_live, checkActiveBroadcast, toggleLiveBroadcast } = useMacroMapPromptStore();
    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        checkActiveBroadcast();
    }, []);

    const handleToggle = async () => {
        setLoading(true);
        try {
            await toggleLiveBroadcast();
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Launch a live map</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                {/* Status Indicator */}
                <View style={styles.statusContainer}>
                    {is_live ? (
                        <View style={[styles.liveBadge, styles.liveBadgeActive]}>
                            <View style={styles.glowingDot} />
                            <Text style={styles.liveText}>🔴 LIVE BROADCAST</Text>
                        </View>
                    ) : (
                        <View style={[styles.liveBadge, styles.liveBadgeInactive]}>
                            <Text style={styles.liveTextOffline}>⚪ STANDBY MODE</Text>
                        </View>
                    )}
                </View>

                {/* Dashboard Card */}
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons 
                            name={is_live ? "satellite-uplink" : "satellite-variant"} 
                            size={64} 
                            color={is_live ? Colors.theme.naturalGreen : Colors.theme.dust} 
                        />
                    </View>
                    
                    <Text style={styles.cardTitle}>
                        {is_live ? "Broadcasting Active Map" : "Broadcast Offline"}
                    </Text>
                    
                    <Text style={styles.cardSubtitle}>
                        {is_live 
                            ? "Your macro updates will be sent to subscribers as you make them"
                            : "Launch your live broadcast to send subscribers real-time macro updates"
                        }
                    </Text>

                    {/* Subscriber Context Card */}
                    <View style={styles.infoBox}>
                        <MaterialCommunityIcons name="information" size={20} color={Colors.theme.harvestGold} />
                        <Text style={styles.infoText}>
                            Active subscribers will receive automatic scaling prompts to align their macros with your journey in real-time
                        </Text>
                    </View>
                </View>

                {/* Massive Premium Toggle Button */}
                <TouchableOpacity 
                    activeOpacity={0.85} 
                    onPress={handleToggle} 
                    disabled={loading}
                    style={styles.toggleButtonContainer}
                >
                    <LinearGradient
                        colors={is_live ? ['#8B4513', '#6E320A'] : ['#DAA520', '#B8860B']}
                        style={styles.toggleButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={is_live ? "#FFFFFF" : Colors.theme.matteBlack} />
                        ) : (
                            <>
                                <MaterialCommunityIcons 
                                    name={is_live ? "stop-circle" : "play-circle"} 
                                    size={28} 
                                    color={is_live ? "#FFFFFF" : Colors.theme.matteBlack} 
                                />
                                <Text style={[
                                    styles.toggleButtonText, 
                                    { color: is_live ? "#FFFFFF" : Colors.theme.matteBlack }
                                ]}>
                                    {is_live ? "End Live Broadcast" : "Start Live Broadcast"}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 40,
    },
    statusContainer: {
        marginBottom: 30,
        alignItems: 'center',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    liveBadgeActive: {
        backgroundColor: 'rgba(27, 182, 7, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(27, 182, 7, 0.3)',
    },
    liveBadgeInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    glowingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.theme.naturalGreen,
    },
    liveText: {
        color: Colors.theme.naturalGreen,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    liveTextOffline: {
        color: Colors.theme.dust,
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    card: {
        width: '100%',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 12,
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 14,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
        padding: 16,
        borderRadius: 16,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.15)',
        gap: 12,
    },
    infoText: {
        flex: 1,
        color: Colors.theme.dust,
        fontSize: 13,
        lineHeight: 18,
    },
    toggleButtonContainer: {
        width: '100%',
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    toggleButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    toggleButtonText: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
