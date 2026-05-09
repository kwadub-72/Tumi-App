import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { formatTimeAgo } from '@/src/shared/services/SupabasePostService';

interface BookCardProps {
    bookType: 'meal' | 'lift' | 'macro';
    title: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    setsReps?: string;
    subText?: string;
    isDeltaRow?: boolean;
    savedAt: string;
    copyCount: number;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    onPressTribeButton: () => void;
    onPressDelete?: () => void;
}

export function BookCard({
    bookType,
    title,
    calories,
    protein,
    carbs,
    fats,
    setsReps,
    subText,
    isDeltaRow = false,
    savedAt,
    copyCount,
    authorName,
    authorHandle,
    authorAvatar,
    onPressTribeButton,
    onPressDelete
}: BookCardProps) {
    const timeAgo = formatTimeAgo(savedAt);

    const renderMacroBreakdown = () => {
        if (calories === undefined || protein === undefined || carbs === undefined || fats === undefined) {
            return null;
        }

        const totalCals = Math.round(protein * 4 + carbs * 4 + fats * 9);
        const pPct = totalCals > 0 ? Math.round((protein * 4 / totalCals) * 100) : 0;
        const cPct = totalCals > 0 ? Math.round((carbs * 4 / totalCals) * 100) : 0;
        const fPct = totalCals > 0 ? Math.round((fats * 9 / totalCals) * 100) : 0;

        const isMacroBook = bookType === 'macro';
        const showPct = isMacroBook && !isDeltaRow;

        const getDeltaColor = (val: number) => {
            if (!isDeltaRow) return Colors.text;
            return val < 0 ? '#825858' : '#405F4F'; // Burgundy for decrease, Green for increase
        };

        const formatVal = (val: number) => {
            if (!isDeltaRow) return `${val}g`;
            return val >= 0 ? `+${val}g` : `${val}g`;
        };

        return (
            <View style={styles.macroContainer}>
                <Text style={styles.caloriesText}>{totalCals} cal</Text>
                <View style={styles.macroRow}>
                    <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: getDeltaColor(protein) }]}>{formatVal(protein)}</Text>
                        <Text style={styles.macroLabel}>P</Text>
                        {showPct && <Text style={styles.pctLabel}>{pPct}%</Text>}
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: getDeltaColor(carbs) }]}>{formatVal(carbs)}</Text>
                        <Text style={styles.macroLabel}>C</Text>
                        {showPct && <Text style={styles.pctLabel}>{cPct}%</Text>}
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: getDeltaColor(fats) }]}>{formatVal(fats)}</Text>
                        <Text style={styles.macroLabel}>F</Text>
                        {showPct && <Text style={styles.pctLabel}>{fPct}%</Text>}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: authorAvatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                    <View style={styles.userText}>
                        <Text style={styles.userName}>{authorName}</Text>
                        <Text style={styles.userHandle}>@{authorHandle}</Text>
                    </View>
                </View>
                <View style={styles.rightHeader}>
                    {onPressDelete && (
                        <TouchableOpacity style={styles.deleteButton} onPress={onPressDelete}>
                            <Ionicons name="trash-outline" size={18} color="#825858" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.tribeButton} onPress={onPressTribeButton}>
                        <Ionicons name="add" size={20} color="white" />
                        {copyCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{copyCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.timeAgo}>{timeAgo}</Text>
                </View>

                {bookType === 'meal' && renderMacroBreakdown()}
                
                {bookType === 'lift' && (
                    <View style={styles.liftContent}>
                        {setsReps && <Text style={styles.setsReps}>{setsReps}</Text>}
                    </View>
                )}

                {bookType === 'macro' && renderMacroBreakdown()}

                {subText && <Text style={styles.subText}>{subText}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: '#E1E1E1',
    },
    userText: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
    },
    userHandle: {
        fontSize: 12,
        color: Colors.textDark + '88',
    },
    rightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    tribeButton: {
        backgroundColor: '#405F4F', // TRIBE_GREEN
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        backgroundColor: '#825858', // BURGUNDY
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        marginTop: 4,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        flex: 1,
    },
    timeAgo: {
        fontSize: 12,
        color: Colors.textDark + '88',
    },
    macroContainer: {
        marginBottom: 8,
    },
    caloriesText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    macroRow: {
        flexDirection: 'row',
        gap: 16,
    },
    macroItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    macroVal: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroLabel: {
        fontSize: 12,
        color: Colors.textDark + '88',
    },
    pctLabel: {
        fontSize: 10,
        color: Colors.textDark + '55',
        marginLeft: 2,
    },
    liftContent: {
        marginBottom: 8,
    },
    setsReps: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    subText: {
        fontSize: 12,
        color: Colors.textDark + '66',
        fontStyle: 'italic',
    },
});
