import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useMacroMapPromptStore } from '@/src/features/macromaps/store/useMacroMapPromptStore';
import { useAuthStore } from '@/store/AuthStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function LiveMapBroadcastStudioScreen() {
    const router = useRouter();
    const { is_live, checkActiveStream, toggleLiveBroadcast, activeBroadcast } = useMacroMapPromptStore();
    const [loading, setLoading] = React.useState(false);
    const [mapName, setMapName] = React.useState('');
    const [selectedGoal, setSelectedGoal] = React.useState<'Cut' | 'Bulk' | 'Maintenance' | null>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    useEffect(() => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (userId) {
            checkActiveStream(userId);
        }
    }, []);

    const isReady = mapName.trim().length > 0 && selectedGoal !== null;

    const handleToggle = async () => {
        setLoading(true);
        try {
            await toggleLiveBroadcast(mapName, selectedGoal || 'Maintenance');
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

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    contentContainerStyle={styles.contentContainer} 
                    showsVerticalScrollIndicator={false}
                >
                    {/* Status Indicator */}
                    <View style={styles.statusContainer}>
                        {is_live ? (
                            <View style={[styles.liveBadge, styles.liveBadgeActive]}>
                                <View style={styles.glowingDot} />
                                <Text style={styles.liveText}>🔴 LIVE STREAM</Text>
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
                        
                        {is_live && (
                            <Text style={styles.activeBroadcastName}>
                                {mapName || activeBroadcast?.name || 'Live Map'}
                            </Text>
                        )}
                        
                        <Text style={styles.cardTitle}>
                            {is_live ? "Map Stream Live" : "Stream Offline"}
                        </Text>
                        
                        <Text style={styles.cardSubtitle}>
                            {is_live 
                                ? "Your macro updates will be sent to subscribers as you make them"
                                : "Launch your live stream to send subscribers real-time macro updates"
                            }
                        </Text>

                        {/* Input Fields (only when standby/offline) */}
                        {!is_live && (
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>LIVE MAP NAME</Text>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        isFocused && { borderColor: Colors.theme.harvestGold }
                                    ]}
                                    value={mapName}
                                    onChangeText={setMapName}
                                    placeholder="Enter map name.."
                                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                />

                                <Text style={styles.inputLabel}>CHOOSE GOAL</Text>
                                <View style={styles.chipsRow}>
                                    {(['Cut', 'Bulk', 'Maintenance'] as const).map((goal) => {
                                        const isSelected = selectedGoal === goal;
                                        return (
                                            <TouchableOpacity
                                                key={goal}
                                                style={[
                                                    styles.chip,
                                                    isSelected && styles.chipActive
                                                ]}
                                                onPress={() => setSelectedGoal(goal)}
                                            >
                                                <Text style={[
                                                    styles.chipText,
                                                    isSelected && styles.chipTextActive
                                                ]}>
                                                    {goal === 'Maintenance' ? 'Maint.' : goal}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

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
                        disabled={loading || (!is_live && !isReady)} 
                        style={[
                            styles.toggleButtonContainer,
                            (!is_live && !isReady) && { opacity: 0.5 }
                        ]}
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
                                        {is_live ? "End Live Stream" : "Stream macro updates"}
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 40,
        paddingTop: 20,
    },
    statusContainer: {
        marginBottom: 20,
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
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 8,
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 14,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    inputSection: {
        width: '100%',
        marginVertical: 15,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        letterSpacing: 1,
        marginBottom: 8,
    },
    textInput: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: Colors.theme.softWhite,
        marginBottom: 20,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    chip: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipActive: {
        backgroundColor: 'rgba(218, 165, 32, 0.1)',
        borderColor: Colors.theme.harvestGold,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.theme.dust,
    },
    chipTextActive: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
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
        width: '100%',
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
    activeBroadcastName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 8,
        textAlign: 'center',
    }
});
