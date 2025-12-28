import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

interface VerifiedModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function VerifiedModal({ visible, onClose }: VerifiedModalProps) {
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
                        <Ionicons name="leaf" size={24} color={Colors.success} style={styles.icon} />
                        <Text style={styles.text}>Verified natural</Text>
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
        backgroundColor: 'black',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    icon: {
        marginRight: 12,
    },
    text: {
        color: 'white',
        fontSize: 20,
        fontStyle: 'italic',
        fontWeight: '600',
    }
});
