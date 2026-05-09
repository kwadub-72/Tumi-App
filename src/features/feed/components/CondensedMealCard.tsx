import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { formatTimeAgo } from '@/src/shared/services/SupabasePostService';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

interface CondensedMealCardProps {
    title: string;
    portionSize: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    savedAt: string;
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

export function CondensedMealCard({
    title,
    portionSize,
    calories,
    protein,
    carbs,
    fats,
    savedAt,
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
}: CondensedMealCardProps) {
    const timeAgo = formatTimeAgo(savedAt);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const formattedHandle = authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`;
    const calculatedCalories = Math.round(protein * 4 + carbs * 4 + fats * 9);

    return (
        <View style={styles.card}>
            {isMenuOpen && (
                <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
                    <View style={[StyleSheet.absoluteFill, styles.dimOverlay]} />
                </TouchableWithoutFeedback>
            )}
            <TouchableOpacity onPress={onPressProfile} style={{ zIndex: 1 }}>
                <Image 
                    source={{ uri: authorAvatar || 'https://via.placeholder.com/60' }} 
                    style={styles.avatar} 
                />
            </TouchableOpacity>
            
            <View style={[styles.centerColumn, { zIndex: 1 }]}>
                <TouchableOpacity style={styles.headerRow} onPress={onPressProfile}>
                    <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
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
                    <Text style={styles.authorHandle} numberOfLines={1}>{formattedHandle}</Text>
                </TouchableOpacity>
                
                <View style={styles.titleMacroContainer}>
                    <Text style={styles.title} numberOfLines={2}>{title}</Text>
                    
                    <View style={styles.macroRow}>
                        <View style={styles.macroItem}>
                            <MaterialCommunityIcons name="fire" size={12} color="white" />
                            <Text style={styles.macroText}>{calculatedCalories} cals</Text>
                        </View>
                        <View style={styles.macroItem}>
                            <MaterialCommunityIcons name="food-drumstick" size={12} color="white" />
                            <Text style={styles.macroText}>{protein}g</Text>
                        </View>
                        <View style={styles.macroItem}>
                            <MaterialCommunityIcons name="barley" size={12} color="white" />
                            <Text style={styles.macroText}>{carbs}g</Text>
                        </View>
                        <View style={styles.macroItem}>
                            <Ionicons name="water" size={12} color="white" />
                            <Text style={styles.macroText}>{fats}g</Text>
                        </View>
                    </View>
                </View>
                
                <Text style={styles.portionText} numberOfLines={1}>{portionSize}</Text>
            </View>

            <View style={[styles.rightColumn, { zIndex: 10 }]}>
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
                <View style={{ flex: 1 }} />
                <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card, // Tribe Green (#A6B89D) equivalent from theme
        borderRadius: 40, // Pill shape
        padding: 12,
        paddingRight: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#E3E3CC', // Match main background or white
        backgroundColor: '#E1E1E1',
    },
    centerColumn: {
        flex: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: 2,
    },
    authorName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
    },
    authorHandle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },
    titleMacroContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    macroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    macroText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    portionText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontStyle: 'italic',
        marginTop: 2,
    },
    rightColumn: {
        alignItems: 'center',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        paddingVertical: 4,
    },
    tribeButton: {
        backgroundColor: 'white',
        width: 28.88,
        height: 28.88,
        borderRadius: 14.44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        marginTop: 9.56,
    },
    copyCountText: {
        fontSize: 12,
        color: 'white',
        fontWeight: '600',
    },
    timeAgo: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 'auto', // Pushes timestamp to bottom
    },
    dimOverlay: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 5,
        borderRadius: 40,
    },
    floatingButtonsWrapper: {
        position: 'absolute',
        right: 40,
        top: 6,
        flexDirection: 'row',
        gap: 8,
        zIndex: 20,
    },
    floatingTribeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#A5B79D',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingCopyBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#C5D7C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
