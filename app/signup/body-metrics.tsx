import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, Modal, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';

export default function SignupBodyMetrics() {
    const router = useRouter();
    const params = useLocalSearchParams(); // strategy could be accessed here

    const [heightStart, setHeightStart] = useState(5); // Feet
    const [heightEnd, setHeightEnd] = useState(10); // Inches
    const [heightFraction, setHeightFraction] = useState(0); // 0 or 0.5
    const [heightString, setHeightString] = useState('');
    const [showHeightPicker, setShowHeightPicker] = useState(false);

    const [weight, setWeight] = useState('');
    const [bf, setBf] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);

    const handleHeightConfirm = () => {
        setHeightString(`${heightStart}' ${heightEnd}${heightFraction ? '.5' : ''}"`);
        setShowHeightPicker(false);
    };

    const handleNext = () => {
        // Submit signup data
        // Navigate to Feed
        router.replace('/(tabs)');
    };

    const renderHeightPicker = () => {
        const feet = [4, 5, 6, 7, 8];
        const inches = Array.from({ length: 12 }, (_, i) => i);
        const fractions = [0, 0.5];

        return (
            <View style={styles.pickerContainer}>
                <View style={styles.pickerColumn}>
                    <Text style={styles.colHeader}>Ft</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {feet.map(f => (
                            <TouchableOpacity key={f} onPress={() => setHeightStart(f)} style={[styles.pickerItem, heightStart === f && styles.selectedPickerItem]}>
                                <Text style={[styles.pickerText, heightStart === f && styles.selectedPickerText]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.pickerColumn}>
                    <Text style={styles.colHeader}>In</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {inches.map(i => (
                            <TouchableOpacity key={i} onPress={() => setHeightEnd(i)} style={[styles.pickerItem, heightEnd === i && styles.selectedPickerItem]}>
                                <Text style={[styles.pickerText, heightEnd === i && styles.selectedPickerText]}>{i}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.pickerColumn}>
                    <Text style={styles.colHeader}>.5</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {fractions.map(f => (
                            <TouchableOpacity key={f} onPress={() => setHeightFraction(f)} style={[styles.pickerItem, heightFraction === f && styles.selectedPickerItem]}>
                                <Text style={[styles.pickerText, heightFraction === f && styles.selectedPickerText]}>{f === 0 ? '0' : '.5'}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={DARK_GREEN} />
                </TouchableOpacity>
                <TabonoLogo size={40} color={DARK_GREEN} />
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Set body metrics</Text>

                <View style={styles.form}>
                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Text style={styles.labelText}>Height</Text>
                        </View>
                        <TouchableOpacity style={styles.input} onPress={() => setShowHeightPicker(true)}>
                            <Text style={{ color: heightString ? DARK_GREEN : 'rgba(47, 58, 39, 0.5)' }}>
                                {heightString || 'Select height'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Text style={styles.labelText}>Weight</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter weight..."
                            placeholderTextColor="rgba(47, 58, 39, 0.5)"
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Text style={[styles.labelText, { fontSize: 14 }]}>Body-fat estimate</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter %..."
                            placeholderTextColor="rgba(47, 58, 39, 0.5)"
                            value={bf}
                            onChangeText={setBf}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Text style={styles.labelText}>Body metric privacy</Text>
                        </View>
                        <View style={styles.privacyToggleContainer}>
                            <Switch
                                value={isPrivate}
                                onValueChange={setIsPrivate}
                                trackColor={{ false: '#767577', true: DARK_GREEN }}
                                thumbColor={CREAM_COLOR}
                            />
                            {isPrivate && (
                                <View style={styles.lockIcon}>
                                    <Ionicons name="lock-closed" size={12} color="white" />
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                </TouchableOpacity>
            </View>

            {/* Height Picker Modal */}
            <Modal visible={showHeightPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Height</Text>
                            <TouchableOpacity onPress={() => setShowHeightPicker(false)}>
                                <Ionicons name="close" size={24} color={DARK_GREEN} />
                            </TouchableOpacity>
                        </View>
                        {renderHeightPicker()}
                        <TouchableOpacity style={styles.confirmButton} onPress={handleHeightConfirm}>
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
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        color: DARK_GREEN,
        textAlign: 'center',
        fontWeight: '400',
        marginBottom: 40,
    },
    form: {
        width: '100%',
        gap: 15,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: SAGE_GREEN,
        height: 60,
        borderRadius: 30,
        paddingHorizontal: 5, // Input is nested
    },
    labelContainer: {
        paddingLeft: 20,
        width: '40%',
    },
    labelText: {
        color: DARK_GREEN,
        fontWeight: '600',
        fontSize: 16,
    },
    input: {
        backgroundColor: CREAM_COLOR, // Inner input pill
        height: '85%', // Slightly smaller height
        flex: 1,
        borderRadius: 25,
        marginRight: 5,
        paddingHorizontal: 15,
        justifyContent: 'center',
        fontSize: 16,
        color: DARK_GREEN,
    },
    privacyToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
        justifyContent: 'flex-end',
        flex: 1,
    },
    lockIcon: {
        position: 'absolute',
        right: 8, // Adjust based on toggle size
        pointerEvents: 'none',
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
        alignSelf: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: BG_COLOR,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        height: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DARK_GREEN,
    },
    pickerContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    pickerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    colHeader: {
        fontWeight: 'bold',
        marginVertical: 10,
        color: DARK_GREEN,
    },
    pickerItem: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    selectedPickerItem: {
        backgroundColor: SAGE_GREEN,
        width: '80%',
        borderRadius: 10,
    },
    pickerText: {
        fontSize: 18,
        color: DARK_GREEN,
    },
    selectedPickerText: {
        fontWeight: 'bold',
        color: 'white',
    },
    confirmButton: {
        margin: 20,
        backgroundColor: DARK_GREEN,
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
    },
    confirmText: {
        color: CREAM_COLOR,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
