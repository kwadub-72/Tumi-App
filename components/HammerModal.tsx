import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

interface HammerModalProps {
    visible: boolean;
    onClose: () => void;
    activityName: string;
    activityIcon: string;
}

export default function HammerModal({ visible, onClose, activityName, activityIcon }: HammerModalProps) {
    const isPeach = activityName === 'Glute Growth';
    const isBulk = activityName.toLowerCase().includes('bulk');
    const isCut = activityName.toLowerCase().includes('cut');

    // Determine the symbol (+ or -)
    let symbol = '';
    if (isBulk) symbol = '+';
    if (isCut) symbol = '-';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    <View style={styles.capsule}>
                        <Text style={styles.activityText}>{activityName}</Text>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons
                                name={activityIcon as any}
                                size={28}
                                color={isPeach ? '#FFB07C' : "#F5F5DC"}
                            />
                            {symbol !== '' && (
                                <Text style={[styles.symbol, isPeach && { color: '#FFB07C' }]}>{symbol}</Text>
                            )}
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        alignItems: 'center',
    },
    capsule: {
        flexDirection: 'row',
        backgroundColor: '#4F6352', // Dark Green from image
        paddingHorizontal: 30,
        paddingVertical: 18,
        borderRadius: 100,
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    activityText: {
        color: '#F5F5DC', // Light Beige
        fontSize: 26,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    symbol: {
        color: '#F5F5DC',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: -4,
        marginLeft: 2,
    }
});
