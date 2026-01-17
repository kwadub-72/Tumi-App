import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

interface VerifiedModalProps {
    visible: boolean;
    onClose: () => void;
    status?: 'natural' | 'enhanced' | 'natural-pending' | 'none';
}

export default function VerifiedModal({ visible, onClose, status }: VerifiedModalProps) {
    const isEnhanced = status === 'enhanced';
    const text = isEnhanced ? 'Self-declared Enhanced' : 'Tribe-verified natural';
    const IconComponent = isEnhanced ? MaterialCommunityIcons : Ionicons;
    const iconName = isEnhanced ? 'lightning-bolt' : 'leaf';
    const iconColor = isEnhanced ? '#FFD700' : Colors.success;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    {/* The Pill */}
                    <View style={styles.pill}>
                        <IconComponent name={iconName as any} size={24} color={iconColor} style={styles.icon} />
                        <Text style={styles.text}>{text}</Text>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)', // Faded out background
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pill: {
        flexDirection: 'row',
        backgroundColor: '#4F6352', // Dark Green
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    icon: {
        marginRight: 12,
    },
    text: {
        color: '#F5F5DC', // Beige
        fontSize: 20,
        fontStyle: 'italic',
        fontWeight: '600',
    }
});
