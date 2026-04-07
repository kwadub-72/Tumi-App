import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Button, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';
import { USDAFoodService } from '../src/shared/services/USDAFoodService';
import { useState, useRef } from 'react';
import Toast from '../components/ui/Toast';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const scanLock = useRef(false);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanLock.current) return;
        scanLock.current = true;
        
        setIsScanning(true);
        const food = await USDAFoodService.findByBarcode(data);
        setIsScanning(false);

        if (food) {
            setToastMessage('Item Found!');
            setToastVisible(true);
            
            // Brief delay for toast to be seen
            setTimeout(() => {
                router.replace({
                    pathname: '/meal-entry',
                    params: {
                        id: String(food.fdcId),
                        title: food.name,
                        description: food.brand ?? '',
                        caloriesPer100g: String(food.caloriesPer100g),
                        proteinPer100g: String(food.macrosPer100g.p),
                        carbsPer100g: String(food.netCarbsPer100g),
                        fatPer100g: String(food.macrosPer100g.f),
                        servingSizeG: String(food.servingSizeG),
                        servingSizeText: food.servingSizeText ?? '',
                        fdcId: String(food.fdcId),
                        fdcName: food.name,
                        fdcBrand: food.brand ?? '',
                        servingUnits: JSON.stringify(food.servingUnits),
                    }
                });
            }, 800);
        } else {
            setToastMessage('Item Not Found');
            setToastVisible(true);
            setTimeout(() => {
                scanLock.current = false;
            }, 2000);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView 
                style={styles.camera} 
                facing="back" 
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8"]
                }}
            >
                <View style={styles.uiContainer}>
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.closeButton}>
                            <Text style={styles.closeText}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.title}>Scan Barcode</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <View style={styles.overlay}>
                        <View style={styles.cutout}>
                           {isScanning && <ActivityIndicator color="white" size="large" />}
                        </View>
                        <Text style={styles.instructions}>Center a barcode in the frame</Text>
                    </View>
                </View>

                <Toast 
                    message={toastMessage} 
                    visible={toastVisible} 
                    onHide={() => setToastVisible(false)} 
                />
            </CameraView>
        </View>
    );
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
        paddingTop: 60,
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
        width: 280,
        height: 180,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructions: {
        color: 'white',
        marginTop: 20,
        fontSize: 14,
        fontWeight: '500',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    }
});
