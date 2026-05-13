import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { formatTimeAgo } from '@/src/shared/services/SupabasePostService';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

interface CondensedLiftCardProps {
    title: string;
    setsReps: string;
    subText?: string;
    eccentric?: string;
    savedAt: string;
    copyCount: number;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    authorStatus?: 'natural' | 'enhanced' | 'none' | string;
    authorActivityIcon?: string;
    authorActivity?: string;
    onPressProfile: () => void;
    onPressTribeButton: () => void;
}

export function CondensedLiftCard({
    title,
    setsReps,
    subText,
    eccentric,
    savedAt,
    copyCount,
    authorName,
    authorHandle,
    authorAvatar,
    authorStatus,
    authorActivityIcon,
    authorActivity,
    onPressProfile,
    onPressTribeButton,
}: CondensedLiftCardProps) {
    const timeAgo = formatTimeAgo(savedAt);
    
    const formattedHandle = authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`;

    return (
        <View style={styles.card}>
            <TouchableOpacity onPress={onPressProfile} style={{ zIndex: 1 }}>
                <Image 
                    source={{ uri: authorAvatar || 'https://via.placeholder.com/60' }} 
                    style={styles.avatar} 
                />
            </TouchableOpacity>
            
            <View style={[styles.centerColumn, { zIndex: 1 }]}>
                <TouchableOpacity style={styles.headerRow} onPress={onPressProfile}>
                    <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
                    <Text style={styles.authorHandle} numberOfLines={1}>{formattedHandle}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
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
                    </View>
                </TouchableOpacity>
                
                <View style={styles.contentRow}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={2}>{title}</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                        <Text style={styles.setsReps}>{setsReps}</Text>
                        {eccentric && <Text style={styles.subText}>{eccentric} sec eccentric</Text>}
                        {subText && <Text style={styles.subText}>{subText}</Text>}
                    </View>
                </View>
            </View>

            <View style={[styles.rightColumn, { zIndex: 10 }]}>
                <TouchableOpacity style={styles.tribeButton} onPress={onPressTribeButton}>
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
        borderColor: Colors.theme.matteBlack, // Match main background
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
        marginBottom: 4,
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
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 4,
    },
    titleContainer: {
        flex: 1,
        paddingRight: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        color: 'white',
    },
    detailsContainer: {
        alignItems: 'center',
    },
    setsReps: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    subText: {
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
});
