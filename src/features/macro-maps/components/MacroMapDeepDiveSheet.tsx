import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MacroMapFeedData, MacroMapCheckpoint } from '@/src/shared/models/types';
import { useMapStore } from '@/src/features/macromaps/store/useMapStore';

interface DeepDiveSheetProps {
    visible: boolean;
    onClose: () => void;
    mapData: MacroMapFeedData;
    isCreator: boolean;
    onToggleOutlierFlare?: (checkpointId: string, isFlare: boolean) => void;
    onSaveMap?: () => void;
    isSavedMap?: boolean;
}

export function MacroMapDeepDiveSheet({ visible, onClose, mapData, isCreator, onToggleOutlierFlare, onSaveMap, isSavedMap }: DeepDiveSheetProps) {
    const [flaredCheckpoints, setFlaredCheckpoints] = useState<Set<string>>(new Set());

    const { activeMapProgress, fetchMapProgress, jumpToCheckpoint, markCheckpointComplete } = useMapStore();

    useEffect(() => {
        if (visible && mapData.id) {
            fetchMapProgress(mapData.id);
        }
    }, [visible, mapData.id, fetchMapProgress]);

    const toggleFlare = (id: string) => {
        const newSet = new Set(flaredCheckpoints);
        const isNowFlared = !newSet.has(id);
        if (isNowFlared) newSet.add(id);
        else newSet.delete(id);
        setFlaredCheckpoints(newSet);
        if (onToggleOutlierFlare) onToggleOutlierFlare(id, isNowFlared);
    };

    const activeCheckpointId = activeMapProgress?.current_checkpoint_id || (mapData.checkpoints.length > 0 ? mapData.checkpoints[0].id : null);
    const completed = activeMapProgress?.completed_checkpoint_ids || [];

    const activeCheckpointIndex = mapData.checkpoints.findIndex(cp => cp.id === activeCheckpointId);
    const activeCheckpoint = activeCheckpointIndex !== -1 ? mapData.checkpoints[activeCheckpointIndex] : (mapData.checkpoints.length > 0 ? mapData.checkpoints[0] : null);

    const currentIndex = activeCheckpointIndex !== -1 ? activeCheckpointIndex : 0;
    const nextCheckpoint = currentIndex + 1 < mapData.checkpoints.length ? mapData.checkpoints[currentIndex + 1] : null;

    const handleSkip = () => {
        if (nextCheckpoint) {
            jumpToCheckpoint(mapData.id, nextCheckpoint.id);
        }
    };

    const handleComplete = () => {
        if (activeCheckpointId) {
            markCheckpointComplete(mapData.id, activeCheckpointId);
        }
    };

    const renderCheckpoint = (cp: MacroMapCheckpoint, index: number) => {
        const cpAny = cp as any;
        const isPositive = cp.delta?.weight !== undefined && cp.delta.weight > 0;
        const deltaColor = isPositive ? Colors.theme.oliveDrab : Colors.theme.burntSienna;

        return (
            <View key={cp.id || `cp-${index}`} style={styles.checkpointContainer}>
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
                            {cp.delta?.weight !== undefined && (
                                <Text style={[styles.deltaText, { color: deltaColor }]}>
                                    {isPositive ? '+' : ''}{cp.delta.weight}
                                </Text>
                            )}
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Calories</Text>
                            <Text style={styles.metricValue}>{cp.targets?.calories ?? 'N/A'}</Text>
                            {cp.delta?.calories !== undefined && (
                                <Text style={[styles.deltaText, { color: cp.delta.calories > 0 ? Colors.theme.oliveDrab : Colors.theme.burntSienna }]}>
                                    {cp.delta.calories > 0 ? '+' : ''}{cp.delta.calories}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={[styles.metricsRow, { marginTop: 8 }]}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Protein</Text>
                            <Text style={styles.metricValue}>{cp.targets?.p ? `${cp.targets.p}g` : (cpAny.protein_ratio ? `${cpAny.protein_ratio}%` : '--')}</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Carbs</Text>
                            <Text style={styles.metricValue}>{cp.targets?.c ? `${cp.targets.c}g` : (cpAny.carbs_ratio ? `${cpAny.carbs_ratio}%` : '--')}</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Fats</Text>
                            <Text style={styles.metricValue}>{cp.targets?.f ? `${cp.targets.f}g` : (cpAny.fats_ratio ? `${cpAny.fats_ratio}%` : '--')}</Text>
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

    const renderActiveCheckpoint = () => {
        if (!activeCheckpoint) return null;
        return renderCheckpoint(activeCheckpoint, activeCheckpointIndex);
    };

    const renderTimelineHeader = () => {
        if (!mapData.checkpoints || mapData.checkpoints.length === 0) return null;

        return (
            <View style={styles.stepperOuterContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.stepperScrollContent}
                >
                    {mapData.checkpoints.map((cp, idx) => {
                        const isCompleted = completed.includes(cp.id);
                        const isActive = cp.id === activeCheckpointId;
                        const isFuture = !isCompleted && !isActive;

                        return (
                            <React.Fragment key={cp.id || `step-${idx}`}>
                                <View style={styles.stepCircleWrapper}>
                                    <TouchableOpacity 
                                        onPress={() => jumpToCheckpoint(mapData.id, cp.id)}
                                        style={[
                                            styles.stepCircle,
                                            isActive && styles.stepCircleActive,
                                            isCompleted && styles.stepCircleCompleted,
                                            isFuture && styles.stepCircleFuture,
                                        ]}
                                    >
                                        {isCompleted ? (
                                            <View style={styles.checkmarkBackdrop}>
                                                <Ionicons name="checkmark" size={12} color={Colors.theme.matteBlack} />
                                            </View>
                                        ) : (
                                            <Text style={[
                                                styles.stepText,
                                                isActive && styles.stepTextActive,
                                                isFuture && styles.stepTextFuture,
                                            ]}>
                                                {idx + 1}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                    <Text style={[
                                        styles.stepDateLabel,
                                        isActive && styles.stepDateLabelActive,
                                        isCompleted && styles.stepDateLabelCompleted,
                                    ]}>
                                        {new Date(cp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                                {idx < mapData.checkpoints.length - 1 && (
                                    <View style={[
                                        styles.connectorLine,
                                        isCompleted ? styles.connectorCompleted : styles.connectorFuture
                                    ]} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderFooter = () => {
        const isLast = currentIndex === mapData.checkpoints.length - 1;

        return (
            <View style={{ backgroundColor: Colors.theme.matteBlack, paddingBottom: 25, paddingTop: 10 }}>
                <View style={styles.footerContainer}>
                    <TouchableOpacity
                        style={[
                            styles.footerButton, 
                            styles.skipButton, 
                            isLast && styles.skipButtonDisabled
                        ]}
                        onPress={handleSkip}
                        disabled={isLast}
                    >
                        <Text style={[
                            styles.skipButtonText, 
                            isLast && styles.skipButtonTextDisabled
                        ]}>
                            Skip / Jump
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.footerButton, styles.completeButton]}
                        onPress={handleComplete}
                    >
                        <Text style={styles.completeButtonText}>
                            {isLast ? 'Complete & Finish' : 'Complete & Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.saveMapBtn} onPress={onSaveMap}>
                    <Text style={styles.saveMapBtnText}>{isSavedMap ? 'Remove from Map book' : 'Save to Map book'}</Text>
                </TouchableOpacity>
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
                
                {renderTimelineHeader()}

                <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderActiveCheckpoint()}
                </ScrollView>

                {renderFooter()}
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
        flexDirection: 'column',
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    checkpointContainer: {
        flexDirection: 'row',
        marginBottom: 16,
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
    stepperOuterContainer: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.theme.charcoal,
        paddingVertical: 12,
    },
    stepperScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    stepCircleWrapper: {
        alignItems: 'center',
        position: 'relative',
        width: 60,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    stepCircleCompleted: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1.5,
        borderColor: 'rgba(218, 165, 32, 0.3)',
    },
    stepCircleFuture: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    checkmarkBackdrop: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.theme.harvestGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepTextActive: {
        color: Colors.theme.matteBlack,
    },
    stepTextFuture: {
        color: Colors.theme.dust,
        opacity: 0.5,
    },
    stepDateLabel: {
        position: 'absolute',
        top: 36,
        fontSize: 10,
        color: Colors.theme.dust,
        opacity: 0.6,
        textAlign: 'center',
        width: 70,
    },
    stepDateLabelActive: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        opacity: 1,
    },
    stepDateLabelCompleted: {
        color: Colors.theme.softWhite,
        opacity: 0.8,
    },
    connectorLine: {
        height: 2,
        width: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    connectorCompleted: {
        backgroundColor: Colors.theme.harvestGold,
    },
    connectorFuture: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.theme.charcoal,
        backgroundColor: Colors.theme.matteBlack,
        gap: 12,
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipButton: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
    },
    saveMapBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    saveMapBtnText: { color: Colors.theme.dust, fontSize: 16, fontWeight: '600' },
    skipButtonDisabled: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    skipButtonText: {
        color: Colors.theme.harvestGold,
        fontSize: 15,
        fontWeight: '600',
    },
    skipButtonTextDisabled: {
        color: Colors.theme.dust,
        opacity: 0.3,
    },
    completeButton: {
        backgroundColor: Colors.theme.harvestGold,
    },
    completeButtonText: {
        color: Colors.theme.matteBlack,
        fontSize: 15,
        fontWeight: 'bold',
    },
});
