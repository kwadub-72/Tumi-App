import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { formatTimeAgo } from '@/src/shared/services/SupabasePostService';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

interface CondensedMacroCardProps {
    isDeltaRow: boolean;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    savedAt: string;
    dateLabel: string;
    copyCount: number;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    authorStatus?: 'natural' | 'enhanced' | 'none' | string;
    authorActivityIcon?: string;
    authorActivity?: string;
    onPressProfile: () => void;
    onPressTribeCopy: () => void;
    onPressStandardCopy: () => void;
}

export function CondensedMacroCard({
    isDeltaRow,
    calories,
    protein,
    carbs,
    fats,
    savedAt,
    dateLabel,
    copyCount,
    authorName,
    authorHandle,
    authorAvatar,
    authorStatus,
    authorActivityIcon,
    authorActivity,
    onPressProfile,
    onPressTribeCopy,
    onPressStandardCopy,
}: CondensedMacroCardProps) {
    const timeAgo = formatTimeAgo(savedAt);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const formattedHandle = authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`;
    
    // For delta, we use the absolute value for percentage calculation
    const calsFromP = Math.abs(protein * 4);
    const calsFromC = Math.abs(carbs * 4);
    const calsFromF = Math.abs(fats * 9);
    const totalCalsFromMacros = calsFromP + calsFromC + calsFromF;
    
    const getPct = (cals: number) => {
        if (totalCalsFromMacros === 0) return 0;
        return Math.round((cals / totalCalsFromMacros) * 100);
    };

    const pPct = getPct(calsFromP);
    const cPct = getPct(calsFromC);
    const fPct = getPct(calsFromF);

    const formatVal = (val: number, isCals = false) => {
        if (!isDeltaRow) return `${val}${isCals ? ' cals' : 'g'}`;
        const prefix = val > 0 ? '+' : '';
        return `${prefix}${val}${isCals ? ' cals' : 'g'}`;
    };

    const getColor = (val: number) => {
        if (!isDeltaRow) return 'white';
        if (val < 0) return '#825858'; // Burgundy for decrease
        if (val > 0) return '#4F6352'; // Green for increase
        return 'white'; // Neutral for zero
    };

    const calsColor = getColor(calories);
    const pColor = getColor(protein);
    const cColor = getColor(carbs);
    const fColor = getColor(fats);

    return (
        <View style={styles.card}>
            {isMenuOpen && (
                <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
                    <View style={[StyleSheet.absoluteFill, styles.dimOverlay]} />
                </TouchableWithoutFeedback>
            )}
            
            {/* Header Row */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={onPressProfile} style={styles.avatarContainer}>
                    <Image 
                        source={{ uri: authorAvatar || 'https://via.placeholder.com/60' }} 
                        style={styles.avatar} 
                    />
                </TouchableOpacity>
                
                <View style={styles.headerTextContainer}>
                    <TouchableOpacity style={styles.nameRow} onPress={onPressProfile}>
                        <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
                        <Text style={styles.authorHandle} numberOfLines={1}>{formattedHandle}</Text>
                        {authorStatus === 'natural' && <MaterialCommunityIcons name="leaf" size={14} color="#789370" />}
                        {authorStatus === 'enhanced' && <MaterialCommunityIcons name="hammer" size={14} color="rgba(255,255,255,0.8)" />}
                        {authorActivityIcon && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <MaterialCommunityIcons
                                    name={authorActivityIcon as any}
                                    size={14}
                                    color='white'
                                />
                                {authorActivity?.toLowerCase().includes('bulk') && (
                                    <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>+</Text>
                                )}
                                {authorActivity?.toLowerCase().includes('cut') && (
                                    <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>-</Text>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{isDeltaRow ? 'Update' : 'Macros'}</Text>
                        <Text style={styles.dateText}>{dateLabel}</Text>
                    </View>
                </View>

                {/* Top Right Action Button */}
                <View style={styles.rightActionContainer}>
                    {isMenuOpen && (
                        <View style={styles.floatingButtonsWrapper}>
                            <TouchableOpacity style={styles.floatingTribeBtn} onPress={() => { setIsMenuOpen(false); onPressTribeCopy(); }}>
                                <TabonoLogo size={16} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.floatingCopyBtn} onPress={() => { setIsMenuOpen(false); onPressStandardCopy(); }}>
                                <Ionicons name="copy-outline" size={14} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <TouchableOpacity style={styles.tribeButton} onPress={() => setIsMenuOpen(!isMenuOpen)}>
                        <TabonoLogo size={21.66} color={Colors.card} />
                    </TouchableOpacity>
                    {copyCount > 0 && (
                        <Text style={styles.copyCountText}>{copyCount}</Text>
                    )}
                </View>
            </View>
            
            {/* Metrics Row */}
            <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="fire" size={16} color={calsColor} />
                    <Text style={[styles.metricValue, { color: calsColor }]}>{formatVal(calories, true)}</Text>
                </View>
                
                <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="food-drumstick" size={16} color={pColor} />
                    <Text style={[styles.metricValue, { color: pColor }]}>{formatVal(protein)}</Text>
                </View>
                
                <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="barley" size={16} color={cColor} />
                    <Text style={[styles.metricValue, { color: cColor }]}>{formatVal(carbs)}</Text>
                </View>
                
                <View style={styles.metricItem}>
                    <Ionicons name="water" size={16} color={fColor} />
                    <Text style={[styles.metricValue, { color: fColor }]}>{formatVal(fats)}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.percentagesContainer}>
                <View style={styles.percentageItemEmpty} />
                
                <View style={styles.percentageItem}>
                    <Text style={styles.pctText}>{pPct}%</Text>
                </View>
                
                <View style={styles.percentageItem}>
                    <Text style={styles.pctText}>{cPct}%</Text>
                </View>
                
                <View style={styles.percentageItem}>
                    <Text style={styles.pctText}>{fPct}%</Text>
                </View>
            </View>

            {/* Footer Row */}
            <View style={styles.footerRow}>
                <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card, // Tribe Green (#A6B89D) equivalent from theme
        borderRadius: 30,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#A6B89D',
        backgroundColor: '#E1E1E1',
    },
    headerTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    authorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    authorHandle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
    },
    dateText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontStyle: 'italic',
    },
    rightActionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tribeButton: {
        backgroundColor: 'white',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    copyCountText: {
        fontSize: 12,
        color: 'white',
        fontWeight: '600',
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingHorizontal: 8,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        justifyContent: 'center',
    },
    metricValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 4,
        marginHorizontal: 8,
    },
    percentagesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    percentageItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentageItemEmpty: {
        flex: 1,
    },
    pctText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    footerRow: {
        alignItems: 'flex-end',
    },
    timeAgo: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
    },
    dimOverlay: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 5,
        borderRadius: 30,
    },
    floatingButtonsWrapper: {
        position: 'absolute',
        right: 36,
        top: 0,
        flexDirection: 'row',
        gap: 8,
        zIndex: 20,
    },
    floatingTribeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#A5B79D',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingCopyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#C5D7C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
