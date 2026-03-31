import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { ACTIVITIES } from '@/src/shared/constants/Activities';
import RolodexPicker from '@/src/features/explore/components/RolodexPicker';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';

export default function SignupFocus() {
    const router = useRouter();
    const [focus, setFocus] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const handleNext = () => {
        if (!focus) return;
        router.push('/signup/maintenance-strategy');
    };

    const selectedActivity = ACTIVITIES.find(a => a.name === focus);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={DARK_GREEN} />
                </TouchableOpacity>
                <TabonoLogo size={40} color={DARK_GREEN} />
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>What do{'\n'}you do?</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Select a focus</Text>
                    <TouchableOpacity style={styles.pill} onPress={() => setModalVisible(true)}>
                        <Text style={styles.pillText}>
                            {focus || "Select focus"}
                        </Text>
                        {selectedActivity && (
                            <MaterialCommunityIcons name={selectedActivity.icon as any} size={24} color={DARK_GREEN} />
                        )}
                        {!focus && <Ionicons name="add" size={24} color={DARK_GREEN} />}
                    </TouchableOpacity>
                </View>

                {/* Next Button */}
                {focus && (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Rolodex Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Focus</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={CREAM_COLOR} />
                            </TouchableOpacity>
                        </View>
                        <RolodexPicker
                            options={ACTIVITIES}
                            selected={focus || ACTIVITIES[0].name}
                            onSelect={setFocus}
                            showAll={false}
                        />
                        <TouchableOpacity style={styles.confirmButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.confirmText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 40,
        color: DARK_GREEN,
        textAlign: 'center',
        fontWeight: 'bold', // "What do you do?" seems bold
        marginBottom: 60,
        lineHeight: 50,
    },
    inputContainer: {
        width: '100%',
        gap: 10,
    },
    label: {
        color: DARK_GREEN,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    pill: {
        backgroundColor: SAGE_GREEN, // Light Green from image
        borderRadius: 30,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(47, 58, 39, 0.2)',
    },
    pillText: {
        color: DARK_GREEN,
        fontSize: 18,
        fontWeight: '600',
    },
    nextButton: {
        position: 'absolute',
        bottom: 50,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: DARK_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E251E', // Dark Rolodex bg
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    modalTitle: {
        color: CREAM_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
    confirmButton: {
        marginTop: 20,
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: DARK_GREEN,
        borderRadius: 20,
    },
    confirmText: {
        color: CREAM_COLOR,
        fontWeight: 'bold',
    },
});
