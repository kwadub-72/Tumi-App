import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

interface TribeSelectionModalProps {
    visible: boolean;
    onClose: () => void;
}

// Mock tribes data
const TRIBES = [
    { id: '1', name: 'Harvard alum league', meta: 'key', count: '11/15', icon: 'key' },
    { id: '2', name: 'Team Flex', meta: 'global', count: '11/15', icon: 'earth' },
    { id: '3', name: 'Harvard alum', meta: 'leaf', count: '11/15', icon: 'leaf' },
];

export default function TribeSelectionModal({ visible, onClose }: TribeSelectionModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.modalContent}>
                    <View style={styles.handle} />

                    <FlatList
                        data={TRIBES}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.tribeRow}>
                                <Image source={{ uri: 'https://via.placeholder.com/50' }} style={styles.tribeAvatar} />
                                <View style={styles.tribeInfo}>
                                    <Text style={styles.tribeName}>{item.name}</Text>
                                    <View style={styles.tribeMetaRow}>
                                        <Ionicons name={item.icon === 'key' ? 'key' : 'globe-outline'} size={14} color="white" />
                                    </View>
                                </View>
                                <View style={styles.tribeRight}>
                                    <Ionicons name="leaf" size={16} color={Colors.success} />
                                    <Ionicons name="hammer" size={16} color="white" style={{ marginLeft: 5 }} />
                                    <Text style={styles.countText}>{item.count}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContent}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#2D3A26', // Dark green background for modal
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 10,
        paddingHorizontal: 20,
        height: '40%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#fff',
        opacity: 0.3,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    listContent: {
        paddingBottom: 40,
    },
    tribeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 12,
        marginBottom: 10,
    },
    tribeAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        marginRight: 12,
    },
    tribeInfo: {
        flex: 1,
    },
    tribeName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tribeMetaRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    tribeRight: {
        alignItems: 'center', // Fixed duplicate property issue
        justifyContent: 'center',
        flexDirection: 'row',
    },
    countText: {
        color: '#ddd',
        fontSize: 12,
        marginLeft: 8,
        fontWeight: 'bold',
    }
});
