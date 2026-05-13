import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/shared/theme/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onDelete?: () => void;
    onReport?: () => void;
    onSelectItems?: () => void;
    onAddToMealBook?: () => void;
    onAddToLiftBook?: () => void;
    onAddToMacroBook?: () => void;
    onShare?: () => void;
    isOwner: boolean;
}

export default function PostOptionsModal({
    visible,
    onClose,
    onDelete,
    onReport,
    onSelectItems,
    onAddToMealBook,
    onAddToLiftBook,
    onAddToMacroBook,
    onShare,
    isOwner
}: PostOptionsModalProps) {
    const handleDelete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete?.();
    };

    const handleReport = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onReport?.();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <Text style={styles.headerTitle}>Options</Text>
                        <View style={styles.divider} />
                    </View>
                    
                    <View style={styles.optionsContainer}>
                        {onShare && (
                            <>
                                <TouchableOpacity 
                                    style={styles.option} 
                                    onPress={onShare}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="share-social" size={28} color={Colors.theme.harvestGold} />
                                    </View>
                                    <Text style={[styles.optionText, { color: Colors.theme.harvestGold }]}>Share Tribe Mark</Text>
                                </TouchableOpacity>
                                <View style={styles.itemDivider} />
                            </>
                        )}
                        {onAddToMealBook && (
                            <>
                                <TouchableOpacity 
                                    style={styles.option} 
                                    onPress={onAddToMealBook}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="book" size={28} color={Colors.theme.softWhite} />
                                    </View>
                                    <Text style={[styles.optionText, { color: Colors.theme.softWhite }]}>Add to meal book</Text>
                                </TouchableOpacity>
                                <View style={styles.itemDivider} />
                            </>
                        )}
                        {onAddToLiftBook && (
                            <>
                                <TouchableOpacity 
                                    style={styles.option} 
                                    onPress={onAddToLiftBook}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="book" size={28} color={Colors.theme.softWhite} />
                                    </View>
                                    <Text style={[styles.optionText, { color: Colors.theme.softWhite }]}>Add to lift book</Text>
                                </TouchableOpacity>
                                <View style={styles.itemDivider} />
                            </>
                        )}
                        {onAddToMacroBook && (
                            <>
                                <TouchableOpacity 
                                    style={styles.option} 
                                    onPress={onAddToMacroBook}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="book" size={28} color={Colors.theme.softWhite} />
                                    </View>
                                    <Text style={[styles.optionText, { color: Colors.theme.softWhite }]}>Add to macro book</Text>
                                </TouchableOpacity>
                                <View style={styles.itemDivider} />
                            </>
                        )}
                        {onSelectItems && (
                            <>
                                <TouchableOpacity 
                                    style={styles.option} 
                                    onPress={onSelectItems}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.selectIconContainer}>
                                        <Ionicons name="checkmark" size={18} color={Colors.theme.matteBlack} />
                                    </View>
                                    <Text style={[styles.optionText, { color: Colors.theme.softWhite }]}>Select items</Text>
                                </TouchableOpacity>
                                <View style={styles.itemDivider} />
                            </>
                        )}
                        {isOwner ? (
                            <TouchableOpacity 
                                style={styles.option} 
                                onPress={handleDelete}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash" size={26} color={Colors.theme.burntSienna} />
                                <Text style={[styles.optionText, { color: Colors.theme.burntSienna }]}>Delete</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={styles.option} 
                                onPress={handleReport}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="flag" size={26} color={Colors.theme.burntSienna} />
                                <Text style={[styles.optionText, { color: Colors.theme.burntSienna }]}>Report</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.theme.matteBlack,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        paddingTop: 12,
        marginBottom: 15,
    },
    handle: {
        width: 60,
        height: 4,
        backgroundColor: Colors.theme.dust,
        borderRadius: 2,
        opacity: 0.5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.theme.dust,
        marginTop: 8,
        marginBottom: 8,
    },
    divider: {
        width: '85%',
        height: 1,
        backgroundColor: 'rgba(237, 232, 213, 0.2)', // Dust with 0.2 opacity
    },
    optionsContainer: {
        paddingHorizontal: 35,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 15,
    },
    iconContainer: {
        width: 32,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 28,
        fontWeight: '500',
        letterSpacing: -0.5,
    },
    selectIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.theme.harvestGold,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: -3, // To compensate for the smaller icon visual footprint compared to raw Ionicons
    },
    itemDivider: {
        height: 1,
        backgroundColor: 'rgba(237, 232, 213, 0.2)', // Dust with 0.2 opacity
        marginVertical: 10,
    }
});
