import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { FeedPost } from '@/src/shared/models/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TribePostProps {
    post: FeedPost;
    cardColor: string; // The contrast color for the card
}

export default function TribePost({ post, cardColor }: TribePostProps) {
    // Render mainly Meal posts based on image, but handle others simply
    const isMeal = !!post.meal;

    return (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.header}>
                <Image source={typeof post.user.avatar === 'string' ? { uri: post.user.avatar } : post.user.avatar} style={styles.avatar} />
                <View>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{post.user.name}</Text>
                        {/* Icons: Leaf + Hammer (Hardcoded per user image style) */}
                        <MaterialCommunityIcons name="leaf" size={14} color="#4ADE80" style={{ marginLeft: 4 }} />
                        <MaterialCommunityIcons name="hammer" size={14} color="#E6A8A8" style={{ marginLeft: 2 }} />
                    </View>
                    <Text style={styles.handle}>{post.user.handle}</Text>
                </View>
                <TouchableOpacity style={{ marginLeft: 'auto' }}>
                    <MaterialCommunityIcons name="dots-horizontal" size={24} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {post.snapshot ? (
                <Text style={styles.caption}>{post.snapshot.caption}</Text>
            ) : post.meal ? (
                <Text style={styles.caption}>{post.meal.title}</Text> // "Cheat meal!!!!"
            ) : (
                <Text style={styles.caption}>Update</Text>
            )}

            {/* Meal Table */}
            {isMeal && post.meal && (
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.cell, { flex: 2, textAlign: 'left' }]}>Meal</Text>
                        <View style={styles.headerCell}>
                            <MaterialCommunityIcons name="fire" size={12} color="#E6A8A8" />
                            <Text style={styles.headerText}> {post.meal.calories} cals</Text>
                        </View>
                        <View style={styles.headerCell}>
                            <MaterialCommunityIcons name="food-drumstick" size={12} color="white" />
                            <Text style={styles.headerText}> {post.meal.macros.p}g</Text>
                        </View>
                        <View style={styles.headerCell}>
                            <MaterialCommunityIcons name="barley" size={12} color="white" />
                            <Text style={styles.headerText}> {post.meal.macros.c}g</Text>
                        </View>
                        <View style={styles.headerCell}>
                            <MaterialCommunityIcons name="water" size={12} color="white" />
                            <Text style={styles.headerText}> {post.meal.macros.f}g</Text>
                        </View>
                    </View>
                    {post.meal.ingredients.map((ing, idx) => (
                        <View key={idx} style={styles.tableRow}>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.rowText}>{ing.name}</Text>
                                <Text style={styles.subText}>{ing.amount}</Text>
                            </View>
                            <View style={styles.cellRow}>
                                <MaterialCommunityIcons name="fire" size={12} color="#E6A8A8" />
                                <Text style={styles.rowText}> {ing.cals} cals</Text>
                            </View>
                            <View style={styles.cellRow}>
                                <MaterialCommunityIcons name="food-drumstick" size={12} color="white" />
                                <Text style={styles.rowText}> {ing.macros.p}g</Text>
                            </View>
                            <View style={styles.cellRow}>
                                <MaterialCommunityIcons name="barley" size={12} color="white" />
                                <Text style={styles.rowText}> {ing.macros.c}g</Text>
                            </View>
                            <View style={styles.cellRow}>
                                <MaterialCommunityIcons name="water" size={12} color="white" />
                                <Text style={styles.rowText}> {ing.macros.f}g</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Fallback for other post types */}
            {!isMeal && (
                <View style={{ height: 50, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Post content...</Text>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'white',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    handle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    caption: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    table: {
        width: '100%',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    tableHeader: {
        borderBottomWidth: 1,
        borderBottomColor: 'white',
        paddingBottom: 8,
    },
    cell: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    headerCell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    headerText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12
    },
    cellRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    rowText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    subText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
    }
});
