import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MacroMapFeedData, MacroMapCheckpoint } from '@/src/shared/models/types';
import { LinearGradient } from 'expo-linear-gradient';

interface DeepDiveSheetProps {
    visible: boolean;
    onClose: () => void;
    mapData: MacroMapFeedData;
    isCreator: boolean;
    onToggleOutlierFlare?: (checkpointId: string, isFlare: boolean) => void;
}

export function MacroMapDeepDiveSheet({ visible, onClose, mapData, isCreator, onToggleOutlierFlare }: DeepDiveSheetProps) {
    const [flaredCheckpoints, setFlaredCheckpoints] = useState<Set<string>>(new Set());

    const toggleFlare = (id: string) => {
        const newSet = new Set(flaredCheckpoints);
        const isNowFlared = !newSet.has(id);
        if (isNowFlared) newSet.add(id);
        else newSet.delete(id);
        setFlaredCheckpoints(newSet);
        if (onToggleOutlierFlare) onToggleOutlierFlare(id, isNowFlared);
    };

    const renderCheckpoint = (cp: MacroMapCheckpoint, index: number) => {
        const isPositive = cp.delta && cp.delta.weight > 0;
        const deltaColor = isPositive ? Colors.theme.oliveDrab : Colors.theme.burntSienna;

        return (
            <View key={cp.id} style={styles.checkpointContainer}>
                <View style={styles.timelineColumn}>
                    <View style={styles.timelineDot} />
                    {index < mapData.checkpoints.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.checkpointCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.dateText}>{new Date(cp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                        <View style={styles.intentBadge}>
                            <MaterialCommunityIcons 
                                name={cp.intent === 'weight-down' ? 'trending-down' : cp.intent === 'weight-up' ? 'trending-up' : 'minus'} 
                                size={14} 
                                color={Colors.theme.matteBlack} 
                            />
                            <Text style={styles.intentText}>
                                {cp.intent === 'weight-down' ? 'Cut' : cp.intent === 'weight-up' ? 'Bulk' : 'Maintain'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Weight</Text>
                            <Text style={styles.metricValue}>{cp.weight} lbs</Text>
                            {cp.delta && (
                                <Text style={[styles.deltaText, { color: deltaColor }]}>
                                    {isPositive ? '+' : ''}{cp.delta.weight}
                                </Text>
                            )}
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Calories</Text>
                            <Text style={styles.metricValue}>{cp.targets.calories}</Text>
                            {cp.delta && (
                                <Text style={[styles.deltaText, { color: cp.delta.calories > 0 ? Colors.theme.oliveDrab : Colors.theme.burntSienna }]}>
                                    {cp.delta.calories > 0 ? '+' : ''}{cp.delta.calories}
                                </Text>
                            )}
                        </View>
                    </View>

                    {isCreator && (
                        <TouchableOpacity style={styles.flareToggle} onPress={() => toggleFlare(cp.id)}>
                            <Ionicons 
                                name={flaredCheckpoints.has(cp.id) ? 'checkbox' : 'square-outline'} 
                                size={20} 
                                color={Colors.theme.harvestGold} 
                            />
                            <Text style={styles.flareText}>Toggle as Outlier Flare</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
                <View style={styles.handleBar} />
                <View style={styles.header}>
                    <Text style={styles.title}>Map Checkpoints</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close-circle" size={28} color={Colors.theme.dust} />
                    </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {mapData.checkpoints.map((cp, index) => renderCheckpoint(cp, index))}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80%',
        backgroundColor: Colors.theme.matteBlack,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: Colors.theme.dust,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.theme.charcoal,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    checkpointContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineColumn: {
        width: 24,
        alignItems: 'center',
        marginRight: 12,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.theme.harvestGold,
        marginTop: 6,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: Colors.theme.charcoal,
        marginTop: 4,
    },
    checkpointCard: {
        flex: 1,
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    intentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.harvestGold,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    intentText: {
        color: Colors.theme.matteBlack,
        fontSize: 12,
        fontWeight: 'bold',
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 12,
    },
    metricItem: {
        flex: 1,
    },
    metricLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    metricValue: {
        color: Colors.theme.softWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    deltaText: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    flareToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    flareText: {
        color: Colors.theme.dust,
        fontSize: 14,
    },
});
