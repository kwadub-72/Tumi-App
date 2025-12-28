import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

interface HammerModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function HammerModal({ visible, onClose }: HammerModalProps) {
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
                        <Ionicons name="hammer" size={32} color={Colors.primary} style={styles.icon} />
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>Body Builder</Text>
                            <Text style={styles.subtitle}>(bulk)</Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
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
        paddingVertical: 20,
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
        marginRight: 16,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        color: Colors.primary,
        fontSize: 24,
        fontStyle: 'italic',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        color: Colors.primary,
        fontSize: 24,
        fontStyle: 'italic',
        fontWeight: 'bold',
        textAlign: 'center',
    }
});
