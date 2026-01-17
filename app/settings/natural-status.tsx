import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    ScrollView,
    Image,
    Alert,
    Switch,
    Modal,
    Pressable
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';

export default function NaturalStatusScreen() {
    const router = useRouter();
    const { status, setStatus } = useUserStore();
    const [step, setStep] = useState(1); // 1: Select, 2: Natural Form, 3: Success

    // Form State
    const [yearsTraining, setYearsTraining] = useState('');
    const [dob, setDob] = useState('');
    const [age, setAge] = useState<number | null>(null);
    const [photoStart, setPhotoStart] = useState<string | null>(null);
    const [timestampStart, setTimestampStart] = useState('');
    const [photoToday, setPhotoToday] = useState<string | null>(null);
    const [timestampToday, setTimestampToday] = useState('');
    const [docPolygraph, setDocPolygraph] = useState<string | null>(null);
    const [docMedical, setDocMedical] = useState<string | null>(null);
    const [emailOptIn, setEmailOptIn] = useState(true);

    // Calendar Modal State
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [activeDateField, setActiveDateField] = useState<'start' | 'today' | null>(null);
    const [viewDate, setViewDate] = useState(new Date());

    const calculateAge = (dobString: string) => {
        const birthDate = new Date(dobString);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age > 0 ? age : null;
    };

    const handleDobChange = (text: string) => {
        setDob(text);
        if (text.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const ageVal = calculateAge(text);
            setAge(ageVal);
        } else {
            setAge(null);
        }
    };

    const pickImage = async (setter: (uri: string) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const handleSubmit = () => {
        if (!yearsTraining || !dob || !photoStart || !timestampStart || !photoToday || !timestampToday) {
            Alert.alert('Required Fields', 'Please complete all required photo, dob and training fields.');
            return;
        }
        setStatus('natural-pending');
        setStep(3);
    };

    const handleApproveAdmin = () => {
        setStatus('natural');
        Alert.alert('Admin: Approved', 'User status set to Natural.');
    };

    const handleStatusUpdate = (targetStatus: 'natural' | 'enhanced') => {
        if (status === targetStatus) {
            // Toggling off the current status
            const currentLabel = status.charAt(0).toUpperCase() + status.slice(1);
            let message = `Are you sure you want to remove your ${currentLabel} status?`;

            if (status === 'natural') {
                message += "\n\nWarning: You will be subject to re-application if you wish to return to Natural status later.";
            }

            Alert.alert(
                'Remove Status?',
                message,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Yes, Remove', onPress: () => setStatus('none') }
                ]
            );
        } else if (status === 'natural' || status === 'enhanced') {
            const currentLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const targetLabel = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1);
            let message = `Are you sure you want to change your status from ${currentLabel} to ${targetLabel}?`;

            if (status === 'natural' && targetStatus === 'enhanced') {
                message += "\n\nWarning: You will be subject to re-application if you wish to return to Natural status later.";
            }

            Alert.alert(
                'Change Status?',
                message,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Yes, Change',
                        onPress: () => {
                            if (targetStatus === 'natural') {
                                setStep(2);
                            } else {
                                setStatus('enhanced');
                            }
                        }
                    }
                ]
            );
        } else {
            if (targetStatus === 'natural') {
                setStep(2);
            } else {
                setStatus('enhanced');
            }
        }
    };

    // Calendar Helpers
    const openCalendar = (field: 'start' | 'today') => {
        setActiveDateField(field);
        setIsCalendarVisible(true);
    };

    const selectDate = (date: Date) => {
        const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        if (activeDateField === 'start') setTimestampStart(dateStr);
        if (activeDateField === 'today') setTimestampToday(dateStr);
        setIsCalendarVisible(false);
    };

    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));

        return days;
    };

    if (step === 3) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
                    <Text style={styles.successTitle}>Application Submitted</Text>
                    <Text style={styles.successText}>
                        Tribe will contact the user’s email on file for additional information if needed. Decisions will be sent within 14 days. Thank you for your patience!
                    </Text>
                    <TouchableOpacity style={styles.backButtonLarge} onPress={() => setStep(1)}>
                        <Text style={styles.backButtonText}>Return to Status Chooser</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 2) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Natural Application</Text>
                    <View style={{ width: 28 }} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.instructionText}>
                        Provide the following details to apply for verified natural status.
                    </Text>

                    {/* Date of Birth */}
                    <View style={styles.fieldGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Date of birth (MM/DD/YYYY)</Text>
                            {age !== null && <Text style={styles.ageIndicator}>Age: {age}</Text>}
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="MM/DD/YYYY"
                            keyboardType="numbers-and-punctuation"
                            value={dob}
                            onChangeText={handleDobChange}
                            maxLength={10}
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Years Resistance Training */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Years resistance training</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 5"
                            keyboardType="numeric"
                            value={yearsTraining}
                            onChangeText={setYearsTraining}
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Photo Start */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Photo within 1 year of beginning resistance training</Text>
                        <Text style={styles.subLabel}>
                            Photos must clearly show the face, front deltoids, and abdomen with no more than one layer of clothing (e.g., a t-shirt or button-down shirt). Photos taken shirtless, in a tank top, or in a sports bra that display the required anatomy may facilitate smoother verification but are not required for approval.
                        </Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPhotoStart)}>
                            {photoStart ? (
                                <Image source={{ uri: photoStart }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.input, { marginTop: 10, justifyContent: 'center' }]}
                            onPress={() => openCalendar('start')}
                        >
                            <Text style={{ color: timestampStart ? Colors.primary : '#999', fontSize: 16 }}>
                                {timestampStart || "Select timestamp (MM/YYYY)"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Photo Today */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Photo of you today</Text>
                        <Text style={styles.subLabel}>
                            Photos must be taken shirtless, in a sports bra, or in a tank top, with the face, front deltoids, abdomen, and arms clearly visible with no layers of clothing covering the required anatomy.
                        </Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPhotoToday)}>
                            {photoToday ? (
                                <Image source={{ uri: photoToday }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.input, { marginTop: 10, justifyContent: 'center' }]}
                            onPress={() => openCalendar('today')}
                        >
                            <Text style={{ color: timestampToday ? Colors.primary : '#999', fontSize: 16 }}>
                                {timestampToday || "Select current timestamp"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Optional: Polygraph / League */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Verification (Optional)</Text>
                        <Text style={styles.subLabel}>Polygraph (within 7 days) or Drug-tested league membership image (NCAA, NBA, OCB, etc.)</Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setDocPolygraph)}>
                            {docPolygraph ? (
                                <Image source={{ uri: docPolygraph }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="document-attach-outline" size={32} color={Colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Optional: Medical Doc */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Medical Documentation (Optional)</Text>
                        <Text style={styles.subLabel}>Official prescription/note confirming treatment for illness. Must have hospital letterhead.</Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setDocMedical)}>
                            {docMedical ? (
                                <Image source={{ uri: docMedical }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="medkit-outline" size={32} color={Colors.primary} />
                            )}
                        </TouchableOpacity>
                        <Text style={styles.tinyNote}>Supports PDF, JPG, IMG</Text>
                    </View>

                    <View style={styles.optInRow}>
                        <Text style={styles.optInLabel}>Enable notifications for decision</Text>
                        <Switch
                            value={emailOptIn}
                            onValueChange={setEmailOptIn}
                            trackColor={{ false: "#767577", true: Colors.primary }}
                            thumbColor={emailOptIn ? Colors.success : "#f4f3f4"}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                        <Text style={styles.submitBtnText}>Submit Application</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Calendar Modal */}
                <Modal
                    visible={isCalendarVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsCalendarVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarVisible(false)}>
                        <Pressable style={styles.calendarCard}>
                            <View style={styles.calendarHeader}>
                                <TouchableOpacity onPress={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() - 1);
                                    setViewDate(d);
                                }}>
                                    <Ionicons name="chevron-back" size={20} color="white" />
                                </TouchableOpacity>
                                <Text style={styles.calendarMonthText}>
                                    {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() + 1);
                                    setViewDate(d);
                                }}>
                                    <Ionicons name="chevron-forward" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.calendarGrid}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, idx) => (
                                    <Text key={idx} style={styles.dayHeader}>{h}</Text>
                                ))}
                                {generateCalendarDays().map((day, i) => {
                                    if (!day) return <View key={i} style={styles.calendarDayBtn} />;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.calendarDayBtn}
                                            onPress={() => selectDate(day)}
                                        >
                                            <Text style={styles.calendarDayText}>{day.getDate()}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Status</Text>
                {status === 'natural-pending' ? (
                    <TouchableOpacity onPress={handleApproveAdmin} style={styles.approveBtn}>
                        <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionHeading}>Choose your status</Text>

                {/* Natural Button */}
                <TouchableOpacity
                    style={[styles.statusCard, status === 'natural' && styles.statusActive]}
                    onPress={() => handleStatusUpdate('natural')}
                >
                    <View style={styles.statusInfo}>
                        <Ionicons name="leaf" size={32} color={Colors.success} />
                        <View>
                            <Text style={styles.statusTitle}>Natural</Text>
                            {status === 'natural-pending' ? (
                                <Text style={styles.statusPending}>Application pending review</Text>
                            ) : (
                                <Text style={styles.statusSubtitle}>{status === 'natural' ? 'Verified Status' : 'Apply for verified status'}</Text>
                            )}
                        </View>
                    </View>
                    {status === 'natural' && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* Enhanced Button */}
                <TouchableOpacity
                    style={[styles.statusCard, status === 'enhanced' && styles.statusActiveEnhanced]}
                    onPress={() => handleStatusUpdate('enhanced')}
                >
                    <View style={styles.statusInfo}>
                        <MaterialCommunityIcons name="lightning-bolt" size={32} color="#FFD700" />
                        <View>
                            <Text style={styles.statusTitle}>Enhanced</Text>
                            <Text style={styles.statusSubtitle}>Self-select enhanced status</Text>
                        </View>
                    </View>
                    {status === 'enhanced' && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* What is Tribe Natural? */}
                <TouchableOpacity
                    style={styles.definitionLink}
                    onPress={() => router.push('/settings/natural-definition')}
                >
                    <Text style={styles.definitionLabel}>What is Tribe natural?</Text>
                    <Ionicons name="leaf" size={30} color={Colors.success} style={{ marginTop: 10 }} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    approveBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    approveBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    content: {
        paddingHorizontal: 20,
        gap: 20,
        flex: 1,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 10,
    },
    statusCard: {
        backgroundColor: Colors.card,
        borderRadius: 25,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    statusActive: {
        borderColor: Colors.success,
        backgroundColor: '#D1DEC7',
    },
    statusActiveEnhanced: {
        borderColor: '#FFD700',
        backgroundColor: '#FFF9E6',
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    statusSubtitle: {
        fontSize: 14,
        color: Colors.primary,
        opacity: 0.6,
    },
    statusPending: {
        fontSize: 14,
        color: '#B8860B',
        fontWeight: 'bold',
    },
    definitionLink: {
        marginTop: 'auto',
        marginBottom: 40,
        alignItems: 'center',
    },
    definitionLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        textDecorationLine: 'underline',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    instructionText: {
        fontSize: 15,
        color: Colors.primary,
        opacity: 0.8,
        marginBottom: 20,
        lineHeight: 22,
    },
    fieldGroup: {
        marginBottom: 25,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 5,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        flex: 1,
    },
    ageIndicator: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.success,
        marginLeft: 10,
    },
    subLabel: {
        fontSize: 12,
        color: Colors.primary,
        opacity: 0.7,
        marginBottom: 10,
        lineHeight: 16,
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: 15,
        height: 50,
        paddingHorizontal: 15,
        color: Colors.primary,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(45, 58, 38, 0.1)',
    },
    uploadBox: {
        backgroundColor: Colors.card,
        height: 150,
        borderRadius: 15,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(45, 58, 38, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    tinyNote: {
        fontSize: 10,
        color: '#999',
        marginTop: 5,
        textAlign: 'right',
    },
    optInRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingHorizontal: 5,
    },
    optInLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        marginTop: 20,
        marginBottom: 15,
    },
    successText: {
        fontSize: 16,
        color: Colors.primary,
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
    backButtonLarge: {
        marginTop: 40,
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: Colors.primary,
        borderRadius: 25,
    },
    backButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarCard: {
        backgroundColor: Colors.primary,
        width: '85%',
        borderRadius: 25,
        padding: 20,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    calendarMonthText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: '14.28%',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    calendarDayBtn: {
        width: '14.28%',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarDayText: {
        color: 'white',
        fontSize: 14,
    },
});
