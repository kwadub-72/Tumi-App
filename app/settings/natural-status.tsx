import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
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
    Pressable,
    ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import { useAuthStore } from '@/store/AuthStore';
import { supabase } from '@/src/shared/services/supabase';
import { BirthdayPicker, MonthYearPicker } from '@/src/shared/components/AuthInputs';


export default function NaturalStatusScreen() {
    const router = useRouter();
    const { status: localStatus, setStatus } = useUserStore();
    const { profile } = useAuthStore();
    const currentStatus = profile?.status || localStatus || 'none';
    const [step, setStep] = useState(1); // 1: Select, 2: Natural Form, 3: Success

    useFocusEffect(
        React.useCallback(() => {
            useAuthStore.getState().refreshProfile();
        }, [])
    );

    const updateStatus = async (newStatus: 'none' | 'natural-pending' | 'natural' | 'enhanced') => {
        try {
            const err = await useAuthStore.getState().updateProfile({ status: newStatus });
            if (err) {
                console.error('[NaturalStatusScreen] Failed to update status in Supabase:', err);
                Alert.alert('Error', 'Failed to update status in database.');
                return;
            }
            setStatus(newStatus);
        } catch (error) {
            console.error('[NaturalStatusScreen] Exception during status update:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        }
    };

    // Form State
    const [yearsTraining, setYearsTraining] = useState('');
    const [dob, setDob] = useState('');
    const [age, setAge] = useState<number | null>(null);
    const [trainingMonth, setTrainingMonth] = useState(new Date().getMonth());
    const [trainingYear, setTrainingYear] = useState(new Date().getFullYear());
    const [photoStart, setPhotoStart] = useState<string | null>(null);
    const [photoToday, setPhotoToday] = useState<string | null>(null);
    const [docPolygraph, setDocPolygraph] = useState<string[]>([]);
    const [docMedical, setDocMedical] = useState<string[]>([]);
    const [emailOptIn, setEmailOptIn] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [photoStartMonth, setPhotoStartMonth] = useState(new Date().getMonth());
    const [photoStartYear, setPhotoStartYear] = useState(new Date().getFullYear());
    const [photoTodayMonth, setPhotoTodayMonth] = useState(new Date().getMonth());
    const [photoTodayYear, setPhotoTodayYear] = useState(new Date().getFullYear());
    const [exifStart, setExifStart] = useState<string | null>(null);
    const [exifToday, setExifToday] = useState<string | null>(null);
    const [showPendingModal, setShowPendingModal] = useState(false);

    const calculateAge = (dobString: string) => {
        if (!dobString) return null;
        const parts = dobString.split('-');
        if (parts.length !== 3) return null;
        const birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age > 0 ? age : null;
    };

    const pickImage = async (setUri: (uri: string) => void, setExif?: (exif: string | null) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
            exif: true,
        });

        if (!result.canceled && result.assets[0]) {
            setUri(result.assets[0].uri);
            if (setExif) {
                const exifDate = result.assets[0].exif?.DateTimeOriginal || result.assets[0].exif?.DateTimeDigitized || null;
                setExif(exifDate);
            }
        }
    };

    const handleAddDocument = async (currentDocs: string[], setDocs: (docs: string[]) => void) => {
        if (currentDocs.length >= 3) {
            Alert.alert('Limit Reached', 'You can only upload up to 3 documents.');
            return;
        }

        Alert.alert(
            'Upload Document',
            'Choose a source',
            [
                {
                    text: 'Photo Library',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'],
                                allowsEditing: true,
                                quality: 1,
                            });
                            if (!result.canceled && result.assets && result.assets[0]) {
                                setDocs([...currentDocs, result.assets[0].uri]);
                            }
                        } catch (err) {
                            console.error('[handleAddDocument] Image picker error:', err);
                            Alert.alert('Error', 'Failed to pick image.');
                        }
                    }
                },
                {
                    text: 'Files',
                    onPress: async () => {
                        try {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: ['application/pdf', 'image/jpeg', 'image/png']
                            });
                            if (!result.canceled && result.assets && result.assets[0]) {
                                setDocs([...currentDocs, result.assets[0].uri]);
                            }
                        } catch (err) {
                            console.error('[handleAddDocument] Document picker error:', err);
                            Alert.alert('Error', 'Failed to pick document.');
                        }
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!yearsTraining || !dob || !photoStart || !photoToday) {
            Alert.alert('Required Fields', 'Please complete all required photo, dob and training fields.');
            return;
        }

        const userId = useAuthStore.getState().session?.user?.id || profile?.id;
        if (!userId) {
            Alert.alert('Error', 'User session not found. Please log in again.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Helper function to handle a single file upload to Supabase storage
            const uploadFile = async (uri: string, fieldName: string, bucketName: string): Promise<string> => {
                const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
                
                let contentType = 'image/jpeg';
                if (fileExt === 'png') contentType = 'image/png';
                else if (fileExt === 'webp') contentType = 'image/webp';
                else if (fileExt === 'pdf') contentType = 'application/pdf';

                const fileName = `${Date.now()}_${fieldName}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                // Read local file as base64 string
                const base64Data = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                // Decode base64 to ArrayBuffer
                const arrayBuffer = decode(base64Data);

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, arrayBuffer, {
                        contentType,
                        upsert: true
                    });

                if (uploadError) {
                    throw uploadError;
                }

                return filePath;
            };

            // 1. Upload required files
            const photoStartUrl = await uploadFile(photoStart, 'photo_start', 'natural_applications');
            const photoTodayUrl = await uploadFile(photoToday, 'photo_today', 'natural_applications');

            // 2. Upload optional files if present
            let docPolygraphUrl = null;
            if (docPolygraph.length > 0) {
                const urls = await Promise.all(
                    docPolygraph.map((uri, idx) => uploadFile(uri, `doc_polygraph_${idx}`, 'verifications'))
                );
                docPolygraphUrl = urls.join(',');
            }

            let docMedicalUrl = null;
            if (docMedical.length > 0) {
                const urls = await Promise.all(
                    docMedical.map((uri, idx) => uploadFile(uri, `doc_medical_${idx}`, 'verifications'))
                );
                docMedicalUrl = urls.join(',');
            }

            // 4. Insert application record into the database table (dob is already formatted as YYYY-MM-DD from BirthdayPicker)
            const timestampStartFormatted = `${String(photoStartMonth + 1).padStart(2, '0')}/${photoStartYear}`;
            const timestampTodayFormatted = `${String(photoTodayMonth + 1).padStart(2, '0')}/${photoTodayYear}`;

            const { error: insertError } = await supabase
                .from('natural_applications')
                .insert({
                    user_id: userId,
                    years_training: parseInt(yearsTraining, 10),
                    dob: dob,
                    photo_start_url: photoStartUrl,
                    timestamp_start: timestampStartFormatted,
                    photo_today_url: photoTodayUrl,
                    timestamp_today: timestampTodayFormatted,
                    doc_polygraph_url: docPolygraphUrl,
                    doc_medical_url: docMedicalUrl,
                    email_opt_in: emailOptIn,
                    status: 'pending'
                });

            if (insertError) {
                throw insertError;
            }

            // 5. Update user profile status to pending
            await updateStatus('natural-pending');

            // 6. Navigate to success step
            setStep(3);
        } catch (error: any) {
            console.error('[NaturalStatusScreen] Form submission error:', error);
            Alert.alert(
                'Submission Failed',
                error?.message || 'An error occurred while uploading documents or saving application.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = (targetStatus: 'natural' | 'enhanced') => {
        if (currentStatus === 'natural-pending') {
            if (targetStatus === 'natural') {
                setShowPendingModal(true);
            } else {
                Alert.alert(
                    'Switch to Enhanced?',
                    'Are you sure you want to switch to Enhanced status? This will withdraw your pending Natural application.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Yes, Switch',
                            onPress: async () => {
                                await useAuthStore.getState().cancelPendingApplication();
                                await updateStatus('enhanced');
                            }
                        }
                    ]
                );
            }
            return;
        }

        if (currentStatus === targetStatus) {
            // Toggling off the current status
            const currentLabel = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
            let message = `Are you sure you want to remove your ${currentLabel} status?`;

            if (currentStatus === 'natural') {
                message += "\n\nWarning: You will be subject to re-application if you wish to return to Natural status later.";
            }

            Alert.alert(
                'Remove Status?',
                message,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Yes, Remove', onPress: () => updateStatus('none') }
                ]
            );
        } else if (currentStatus === 'natural' || currentStatus === 'enhanced') {
            const currentLabel = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
            const targetLabel = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1);
            let message = `Are you sure you want to change your status from ${currentLabel} to ${targetLabel}?`;

            if (currentStatus === 'natural' && targetStatus === 'enhanced') {
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
                                updateStatus('enhanced');
                            }
                        }
                    }
                ]
            );
        } else {
            if (targetStatus === 'natural') {
                setStep(2);
            } else {
                updateStatus('enhanced');
            }
        }
    };

    // Calendar Helpers


    if (step === 3) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
                    <Text style={styles.successTitle}>Application Submitted</Text>
                    <Text style={styles.successText}>
                        Chribe will contact the user’s email on file for additional information if needed. Decisions will be sent within 14 days. Thank you for your patience!
                    </Text>
                    <TouchableOpacity style={styles.backButtonLarge} onPress={() => setStep(1)}>
                        <Text style={styles.backButtonText}>Return to Status Chooser</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 2 && currentStatus !== 'natural-pending') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
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
                            <Text style={styles.label}>Date of Birth</Text>
                            {age !== null && <Text style={styles.ageIndicator}>Age: {age}</Text>}
                        </View>
                        <BirthdayPicker
                            value={dob}
                            onChange={(val) => {
                                setDob(val);
                                setAge(calculateAge(val));
                            }}
                            hideLabel={true}
                        />
                    </View>

                    {/* Weight/Resistance Training Start Date */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>When did you begin weight/resistance training?</Text>
                        <MonthYearPicker
                            month={trainingMonth}
                            year={trainingYear}
                            onChange={(m, y) => {
                                setTrainingMonth(m);
                                setTrainingYear(y);
                            }}
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
                            placeholderTextColor={Colors.theme.dust + '55'}
                            selectionColor={Colors.theme.harvestGold}
                        />
                    </View>

                    {/* Photo Start */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Photo within 1 year of beginning resistance training</Text>
                        <Text style={styles.subLabel}>
                            {"To complete verification, upload a clear photo that shows your face and upper body posture.\n\n• Required Visibility: Your face, traps, front delts, and midsection must be fully visible.\n• Approved Attire: A tank top, sleeveless shirt, or rolled-up tee that exposes the core.\n• Strict Policy: Photos must remain strictly within standard athletic/gym attire. Explicit or inappropriate uploads will result in an immediate account ban."}
                        </Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPhotoStart, setExifStart)}>
                            {photoStart ? (
                                <Image source={{ uri: photoStart }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="camera-outline" size={32} color={Colors.theme.harvestGold} />
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.label, { marginTop: 15 }]}>Date of photo (MM/YYYY)</Text>
                        <MonthYearPicker
                            month={photoStartMonth}
                            year={photoStartYear}
                            onChange={(m, y) => {
                                setPhotoStartMonth(m);
                                setPhotoStartYear(y);
                            }}
                        />
                    </View>

                    {/* Photo Today */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Photo of you today</Text>
                        <Text style={styles.subLabel}>
                            {"To complete verification, upload a clear photo that shows your face and upper body posture.\n\n• Required Visibility: Your face, traps, front delts, and midsection must be fully visible.\n• Approved Attire: A tank top, sleeveless shirt, or rolled-up tee that exposes the core.\n• Strict Policy: Photos must remain strictly within standard athletic/gym attire. Explicit or inappropriate uploads will result in an immediate account ban."}
                        </Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPhotoToday, setExifToday)}>
                            {photoToday ? (
                                <Image source={{ uri: photoToday }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="camera-outline" size={32} color={Colors.theme.harvestGold} />
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.label, { marginTop: 15 }]}>Date of photo (MM/YYYY)</Text>
                        <MonthYearPicker
                            month={photoTodayMonth}
                            year={photoTodayYear}
                            onChange={(m, y) => {
                                setPhotoTodayMonth(m);
                                setPhotoTodayYear(y);
                            }}
                        />
                    </View>

                    {/* Optional: Polygraph / League */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Expedite Your Verification (Optional)</Text>
                        <Text style={styles.subLabel}>
                            {"While not required for submission, providing verified drug-testing documentation can significantly accelerate your application review. All evidence must be dated within 6 weeks of your application.\n\nAccepted Documentation:\n• Lab Results: Official reports from a urinalysis, blood panel/DBS, or hair follicle test.\n• Polygraph Records: Official certificate or scored results.\n• Federation Proof: Current membership, stage results, or recent competition in a drug-tested competitive league (OCB, NCAA, NBA, etc.)\n\n> Note: Submitting documentation accelerates the review process but does not guarantee automatic application approval."}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            {docPolygraph.map((uri, index) => {
                                const isPdf = uri.toLowerCase().endsWith('.pdf') || uri.includes('/pdf');
                                return (
                                    <View key={uri + index} style={styles.thumbnailContainer}>
                                        {isPdf ? (
                                            <View style={styles.pdfThumbnail}>
                                                <Ionicons name="document-text" size={36} color={Colors.theme.harvestGold} />
                                                <Text numberOfLines={1} style={styles.pdfText}>PDF</Text>
                                            </View>
                                        ) : (
                                            <Image source={{ uri }} style={styles.thumbnailImage} />
                                        )}
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => setDocPolygraph(docPolygraph.filter((_, i) => i !== index))}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                            {docPolygraph.length < 3 && (
                                <TouchableOpacity 
                                    style={[styles.uploadBox, { width: 100, height: 100 }]} 
                                    onPress={() => handleAddDocument(docPolygraph, setDocPolygraph)}
                                >
                                    <Ionicons name="document-attach-outline" size={32} color={Colors.theme.harvestGold} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={[styles.tinyNote, { marginTop: 8 }]}>
                            {"Users may submit up to three documents.\nSupports PDF, JPG, and PNG"}
                        </Text>
                    </View>

                    {/* Optional: Medical Doc */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Medical Documentation (Optional)</Text>
                        <Text style={styles.subLabel}>Official prescription/note confirming treatment for illness. Must have hospital letterhead.</Text>
                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            {docMedical.map((uri, index) => {
                                const isPdf = uri.toLowerCase().endsWith('.pdf') || uri.includes('/pdf');
                                return (
                                    <View key={uri + index} style={styles.thumbnailContainer}>
                                        {isPdf ? (
                                            <View style={styles.pdfThumbnail}>
                                                <Ionicons name="document-text" size={36} color={Colors.theme.harvestGold} />
                                                <Text numberOfLines={1} style={styles.pdfText}>PDF</Text>
                                            </View>
                                        ) : (
                                            <Image source={{ uri }} style={styles.thumbnailImage} />
                                        )}
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => setDocMedical(docMedical.filter((_, i) => i !== index))}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                            {docMedical.length < 3 && (
                                <TouchableOpacity 
                                    style={[styles.uploadBox, { width: 100, height: 100 }]} 
                                    onPress={() => handleAddDocument(docMedical, setDocMedical)}
                                >
                                    <Ionicons name="medkit-outline" size={32} color={Colors.theme.harvestGold} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={[styles.tinyNote, { marginTop: 8 }]}>
                            {"Users may submit up to three documents.\nSupports PDF, JPG, and PNG"}
                        </Text>
                    </View>

                    <View style={styles.optInRow}>
                        <Text style={styles.optInLabel}>Enable notifications for decision</Text>
                        <Switch
                            value={emailOptIn}
                            onValueChange={setEmailOptIn}
                            trackColor={{ false: "#767577", true: Colors.theme.harvestGold }}
                            thumbColor={emailOptIn ? Colors.theme.matteBlack : "#f4f3f4"}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={Colors.theme.matteBlack} size="small" />
                        ) : (
                            <Text style={styles.submitBtnText}>Submit Application</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Modal
                transparent={true}
                visible={showPendingModal}
                animationType="fade"
                onRequestClose={() => setShowPendingModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pendingModalCard}>
                        <View style={styles.pendingModalIconContainer}>
                            <Ionicons name="time-outline" size={48} color="#DAA520" />
                        </View>
                        <Text style={styles.pendingModalTitle}>Under Review</Text>
                        <Text style={styles.pendingModalText}>
                            Your application is currently under review. You will be notified as soon as a decision is made.
                        </Text>
                        <TouchableOpacity 
                            style={styles.pendingModalCloseBtn} 
                            onPress={() => setShowPendingModal(false)}
                        >
                            <Text style={styles.pendingModalCloseBtnText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Status</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionHeading}>Choose your status</Text>

                {/* Natural Button */}
                <TouchableOpacity
                    style={[styles.statusCard, currentStatus === 'natural' && styles.statusActive]}
                    onPress={() => handleStatusUpdate('natural')}
                >
                    <View style={styles.statusInfo}>
                        <Ionicons 
                            name="leaf" 
                            size={32} 
                            color={currentStatus === 'natural' ? Colors.theme.matteBlack : Colors.theme.naturalGreen} 
                        />
                        <View>
                            <Text style={[styles.statusTitle, currentStatus === 'natural' && styles.statusTitleActive]}>Natural</Text>
                            {currentStatus === 'natural-pending' ? (
                                <Text style={styles.statusPending}>Application pending review</Text>
                            ) : (
                                <Text style={[styles.statusSubtitle, currentStatus === 'natural' && styles.statusSubtitleActive]}>
                                    {currentStatus === 'natural' ? 'Verified Status' : 'Apply for verified status'}
                                </Text>
                            )}
                        </View>
                    </View>
                    {currentStatus === 'natural' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.matteBlack} />}
                </TouchableOpacity>

                {/* Enhanced Button */}
                <TouchableOpacity
                    style={[styles.statusCard, currentStatus === 'enhanced' && styles.statusActiveEnhanced]}
                    onPress={() => handleStatusUpdate('enhanced')}
                >
                    <View style={styles.statusInfo}>
                        <MaterialCommunityIcons 
                            name="lightning-bolt" 
                            size={32} 
                            color={currentStatus === 'enhanced' ? Colors.theme.matteBlack : Colors.theme.burntSienna} 
                        />
                        <View>
                            <Text style={[styles.statusTitle, currentStatus === 'enhanced' && styles.statusTitleActive]}>Enhanced</Text>
                            <Text style={[styles.statusSubtitle, currentStatus === 'enhanced' && styles.statusSubtitleActive]}>Self-select enhanced status</Text>
                        </View>
                    </View>
                    {currentStatus === 'enhanced' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.matteBlack} />}
                </TouchableOpacity>

                {/* What is Chribe Natural? */}
                <TouchableOpacity
                    style={styles.definitionLink}
                    onPress={() => router.push('/settings/natural-definition')}
                >
                    <Text style={styles.definitionLabel}>What is Chribe natural?</Text>
                    <Ionicons name="leaf" size={30} color={Colors.theme.naturalGreen} style={{ marginTop: 10 }} />
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
        color: Colors.theme.harvestGold,
    },
    content: {
        paddingHorizontal: 20,
        gap: 20,
        flex: 1,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.theme.harvestGold,
        marginBottom: 10,
    },
    statusCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 25,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: 'rgba(218, 165, 32, 0.1)',
    },
    statusActive: {
        borderColor: Colors.theme.harvestGold,
        backgroundColor: Colors.theme.harvestGold,
    },
    statusActiveEnhanced: {
        borderColor: Colors.theme.harvestGold,
        backgroundColor: Colors.theme.harvestGold,
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.dust,
    },
    statusTitleActive: {
        color: Colors.theme.matteBlack,
    },
    statusSubtitle: {
        fontSize: 14,
        color: Colors.theme.dust,
        opacity: 0.5,
    },
    statusSubtitleActive: {
        color: Colors.theme.matteBlack,
        opacity: 0.8,
    },
    statusPending: {
        fontSize: 14,
        color: Colors.theme.harvestGold,
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
        color: Colors.theme.harvestGold,
        textDecorationLine: 'underline',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    instructionText: {
        fontSize: 15,
        color: Colors.theme.dust,
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
        color: Colors.theme.softWhite,
        flex: 1,
    },
    ageIndicator: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginLeft: 10,
    },
    subLabel: {
        fontSize: 12,
        color: Colors.theme.dust,
        opacity: 0.6,
        marginBottom: 10,
        lineHeight: 16,
    },
    input: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 15,
        height: 50,
        paddingHorizontal: 15,
        color: Colors.theme.softWhite,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
    },
    uploadBox: {
        backgroundColor: Colors.theme.charcoal,
        height: 150,
        borderRadius: 15,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(218, 165, 32, 0.4)',
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
        color: Colors.theme.dust,
        opacity: 0.5,
        marginTop: 5,
        textAlign: 'right',
    },
    thumbnailContainer: {
        width: 100,
        height: 100,
        borderRadius: 15,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        padding: 2,
    },
    pdfThumbnail: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    pdfText: {
        fontSize: 12,
        color: Colors.theme.dust,
        fontWeight: 'bold',
        marginTop: 4,
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
        color: Colors.theme.softWhite,
    },
    submitBtn: {
        backgroundColor: Colors.theme.harvestGold,
        borderRadius: 20,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        color: Colors.theme.matteBlack,
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
        color: Colors.theme.harvestGold,
        marginTop: 20,
        marginBottom: 15,
    },
    successText: {
        fontSize: 16,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
    backButtonLarge: {
        marginTop: 40,
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: Colors.theme.harvestGold,
        borderRadius: 25,
    },
    backButtonText: {
        color: Colors.theme.matteBlack,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarCard: {
        backgroundColor: Colors.theme.charcoal,
        width: '85%',
        borderRadius: 25,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    calendarMonthText: {
        color: Colors.theme.softWhite,
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
        color: Colors.theme.dust,
        opacity: 0.4,
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
        color: Colors.theme.softWhite,
        fontSize: 14,
    },
    pendingModalCard: {
        backgroundColor: '#121212',
        width: '85%',
        borderRadius: 25,
        padding: 24,
        borderWidth: 2,
        borderColor: '#DAA520',
        alignItems: 'center',
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    pendingModalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(218, 165, 32, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(218, 165, 32, 0.25)',
    },
    pendingModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#DAA520',
        marginBottom: 12,
        textAlign: 'center',
    },
    pendingModalText: {
        fontSize: 15,
        color: '#EDE8D5',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    pendingModalCloseBtn: {
        backgroundColor: '#000000',
        borderWidth: 2,
        borderColor: '#DAA520',
        borderRadius: 100,
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    pendingModalCloseBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
