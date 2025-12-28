import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const router = useRouter();

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        router.push({
            pathname: '/scan-result',
            params: { barcode: data }
        });
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing="back" onBarcodeScanned={handleBarCodeScanned}>

                {/* Overlay UI */}
                <SafeAreaViewComponent>
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.closeButton}>
                            <Text style={styles.closeText}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.title}>Scan Barcode</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    {/* Reticle / Frame */}
                    <View style={styles.overlay}>
                        <View style={styles.cutout} />
                    </View>

                </SafeAreaViewComponent>

            </CameraView>
        </View>
    );
}

// Custom safe area wrapper to handle the translucent camera view
function SafeAreaViewComponent({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.uiContainer}>
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'black',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
    },
    camera: {
        flex: 1,
    },
    uiContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60, // approximate status bar
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingBottom: 20,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#222',
        borderRadius: 16,
        paddingHorizontal: 16,
    },
    closeText: {
        color: Colors.primary,
        fontWeight: '600',
    },
    title: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cutout: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 20,
        backgroundColor: 'transparent',
    }
});
