import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FeedPost } from '../src/shared/models/types';
import { OpenFoodFactsService, ProductData } from '../src/shared/services/OpenFoodFactsService';
import { Colors } from '../src/shared/theme/Colors';
import { PostStore } from '../store/PostStore';

export default function ScanResultScreen() {
    const router = useRouter();
    const { barcode } = useLocalSearchParams<{ barcode: string }>();

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<ProductData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Portion control (defaults to 100g)
    const [portionGrams, setPortionGrams] = useState('100');

    useEffect(() => {
        if (!barcode) {
            setError('No barcode provided');
            setLoading(false);
            return;
        }

        const fetchProduct = async () => {
            setLoading(true);
            try {
                const data = await OpenFoodFactsService.fetchProduct(barcode);
                if (data) {
                    setProduct(data);
                } else {
                    setError('Product not found');
                }
            } catch (err) {
                setError('Failed to fetch product data');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [barcode]);

    const addToToday = async () => {
        if (!product) return;

        const grams = parseFloat(portionGrams) || 100;
        const ratio = grams / 100;

        const calories = Math.round(product.calories * ratio);
        const p = Math.round(product.macros.p * ratio);
        const c = Math.round(product.macros.c * ratio);
        const f = Math.round(product.macros.f * ratio);

        const newPost: FeedPost = {
            id: Date.now().toString(),
            user: {
                id: 'currentUser', // Added ID
                name: 'Kwaku',
                handle: '@kwadub',
                avatar: require('../assets/images/kwadub.jpg'),
                verified: true,
            },
            timeAgo: 'Just now',
            meal: {
                id: Date.now().toString(), // Added ID
                title: product.name,
                type: 'Snack', // Default type
                calories: calories,
                macros: { p, c, f },
                ingredients: [
                    {
                        id: Date.now().toString(), // Added ID
                        name: product.name,
                        amount: `${grams}g`,
                        cals: calories,
                        macros: { p, c, f }
                    }
                ]
            },
            stats: { likes: 0, shares: 0, comments: 0, saves: 0 },
            isLiked: false,
            isShared: false,
            isSaved: false,
            hasCommented: false
        };

        await PostStore.addPost(newPost);
        router.dismissTo('/(tabs)');
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Fetching product...</Text>
                </View>
            );
        }

        if (error || !product) {
            return (
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                    <Text style={styles.errorText}>{error || 'Unknown error'}</Text>
                    <Pressable style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryText}>Scan Again</Text>
                    </Pressable>
                </View>
            );
        }

        const grams = parseFloat(portionGrams) || 0;
        const ratio = grams / 100;

        return (
            <View style={styles.content}>
                {/* Product Info */}
                <View style={styles.imagePlaceholder} />
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.brand}>{product.brand}</Text>

                <View style={styles.divider} />

                {/* Portion Input */}
                <Text style={styles.inputLabel}>Portion Size (g)</Text>
                <TextInput
                    style={styles.input}
                    value={portionGrams}
                    onChangeText={setPortionGrams}
                    keyboardType="numeric"
                />

                <Text style={styles.nutritionLabel}>Nutrition for {grams}g</Text>

                {/* Macros */}
                <View style={styles.macroRow}>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Calories</Text>
                        <Text style={styles.macroValue}>{Math.round(product.calories * ratio)}</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <Text style={styles.macroValue}>{Math.round(product.macros.p * ratio)}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <Text style={styles.macroValue}>{Math.round(product.macros.c * ratio)}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Fat</Text>
                        <Text style={styles.macroValue}>{Math.round(product.macros.f * ratio)}g</Text>
                    </View>
                </View>

                {/* Actions */}
                <Pressable style={styles.addButton} onPress={addToToday}>
                    <Text style={styles.addButtonText}>Add to Today</Text>
                </Pressable>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Pressable style={styles.backdrop} onPress={() => router.back()} />
            <View style={styles.card}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="chevron-back" size={24} color="#666" />
                    </Pressable>
                    <View style={styles.headerActions}>
                        <Text style={styles.headerTitle}>Scan Result</Text>
                    </View>
                </View>
                {renderContent()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        backgroundColor: '#000',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        height: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#222',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerActions: {
        flex: 1,
        alignItems: 'center',
        marginRight: 40, // Balance the icon width
    },
    headerTitle: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    imagePlaceholder: {
        width: '100%',
        height: 150,
        backgroundColor: '#222',
        borderRadius: 16,
        marginBottom: 20,
    },
    productName: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    brand: {
        color: '#666',
        fontSize: 16,
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginBottom: 20,
    },
    inputLabel: {
        color: '#ccc',
        fontSize: 12,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#111',
        color: 'white',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    nutritionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
        color: '#ccc'
    },
    macroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    macroItem: {
        alignItems: 'center',
    },
    macroLabel: {
        color: '#666',
        marginBottom: 4,
        fontSize: 12,
    },
    macroValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 'auto',
        marginBottom: 40,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
    },
    errorText: {
        color: '#fff',
        marginVertical: 10,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    retryText: {
        color: 'white',
        fontWeight: '600',
    }
});
