import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/shared/theme/Colors';

export default function CameraCaptureScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [mode, setMode] = useState<'picture' | 'video'>('picture');
    const [capturedMedia, setCapturedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [facing, setFacing] = useState<CameraType>('back');
    const [isMuted, setIsMuted] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.permissionText}>We need your permission to show the camera</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCapture = async () => {
        if (!cameraRef.current) return;

        if (mode === 'picture') {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            });
            if (photo) {
                setCapturedMedia({ uri: photo.uri, type: 'image' });
            }
        } else {
            if (isRecording) {
                cameraRef.current.stopRecording();
            } else {
                if (!micPermission?.granted) {
                    const status = await requestMicPermission();
                    if (!status.granted) return;
                }

                setIsRecording(true);
                try {
                    const video = await cameraRef.current.recordAsync({
                        maxDuration: 5,
                    });
                    if (video) {
                        setCapturedMedia({ uri: video.uri, type: 'video' });
                    }
                } catch (e) {
                    console.error('Video recording failed', e);
                } finally {
                    setIsRecording(false);
                }
            }
        }
    };

    const handleConfirm = () => {
        if (capturedMedia) {
            // Use setParams to pass data, then go back to dismiss modal
            router.setParams({
                capturedImage: capturedMedia.uri,
                mediaType: capturedMedia.type
            });
            router.back();
        }
    };

    const toggleFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.content}>
                {/* Header with Cancel */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    {!capturedMedia && (
                        <TouchableOpacity onPress={toggleFacing} style={styles.flipButton}>
                            <Ionicons name="camera-reverse-outline" size={28} color="white" />
                        </TouchableOpacity>
                    )}
                </View>

                {capturedMedia ? (
                    <View style={styles.previewContainer}>
                        {capturedMedia.type === 'image' ? (
                            <Image source={{ uri: capturedMedia.uri }} style={styles.previewMedia} />
                        ) : (
                            <View style={styles.videoPreviewWrapper}>
                                <Video
                                    source={{ uri: capturedMedia.uri }}
                                    style={styles.previewMedia}
                                    resizeMode={ResizeMode.COVER}
                                    isLooping
                                    shouldPlay
                                    isMuted={isMuted}
                                />
                                <TouchableOpacity
                                    style={styles.muteToggleBtn}
                                    onPress={() => setIsMuted(!isMuted)}
                                >
                                    <Ionicons
                                        name={isMuted ? "volume-mute" : "volume-high"}
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.retakeButton}
                                onPress={() => setCapturedMedia(null)}
                            >
                                <Text style={styles.retakeText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.confirmText}>Use {capturedMedia.type === 'image' ? 'Photo' : 'Video'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.cameraInterface}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.cameraView}
                            facing={facing}
                            mode={mode}
                        >
                            {isRecording && (
                                <View style={styles.recordingIndicator}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingText}>REC</Text>
                                </View>
                            )}
                        </CameraView>

                        <View style={styles.lowerControls}>
                            <View style={styles.modeSelector}>
                                <TouchableOpacity onPress={() => setMode('picture')}>
                                    <Text style={[styles.modeText, mode === 'picture' && styles.activeMode]}>PHOTO</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setMode('video')}>
                                    <Text style={[styles.modeText, mode === 'video' && styles.activeMode]}>VIDEO</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.shutterButton, mode === 'video' && isRecording && styles.recordingButton]}
                                onPress={handleCapture}
                            >
                                <View style={[styles.shutterInner, mode === 'video' && isRecording && styles.recordingInner]} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    content: {
        flex: 1,
    },
    header: {
        height: 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        marginTop: 30,
    },
    cancelButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    flipButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permissionText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    previewContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewMedia: {
        width: '90%',
        aspectRatio: 3 / 4,
        borderRadius: 30,
        backgroundColor: '#111',
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 40,
    },
    retakeButton: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#444',
    },
    retakeText: {
        color: 'white',
        fontWeight: 'bold',
    },
    confirmButton: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        backgroundColor: Colors.primary,
    },
    confirmText: {
        color: 'white',
        fontWeight: 'bold',
    },
    cameraInterface: {
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    cameraView: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
    },
    recordingIndicator: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff3b30',
    },
    recordingText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    lowerControls: {
        alignItems: 'center',
        gap: 30,
        paddingTop: 20,
    },
    modeSelector: {
        flexDirection: 'row',
        gap: 40,
    },
    modeText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    activeMode: {
        color: Colors.primary,
    },
    shutterButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButton: {
        borderColor: '#ff3b30',
    },
    shutterInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'white',
    },
    recordingInner: {
        backgroundColor: '#ff3b30',
        borderRadius: 6,
        width: 32,
        height: 32,
    },
    videoPreviewWrapper: {
        width: '90%',
        aspectRatio: 3 / 4,
        position: 'relative',
    },
    muteToggleBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
