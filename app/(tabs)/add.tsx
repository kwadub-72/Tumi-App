import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MealLoggerSheet from '../../src/features/meal-logging/components/MealLoggerSheet';
import { FeedPost, Ingredient } from '../../src/shared/models/types';
import { NutritionService } from '../../src/shared/services/NutritionService';
import { Colors } from '../../src/shared/theme/Colors';
import { useMealLogStore } from '../../src/store/useMealLogStore';
import { PostStore } from '../../store/PostStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MealItem {
    id: string;
    userName?: string;
    handle?: string;
    avatar?: any;
    brand?: string;
    title: string;
    calories: number;
    p: number;
    c: number;
    f: number;
    timestamp?: string;
    description?: string;
    isSystemItem?: boolean;
}

const MOCK_MEALS: MealItem[] = [
    {
        id: '1',
        userName: 'Kwaku',
        handle: '@kwadub',
        avatar: require('../../assets/images/kwadub.jpg'),
        title: 'Halal guys chicken and rice... post celebration',
        calories: 1000,
        p: 54,
        c: 80,
        f: 20,
        timestamp: 'Tues 12/23/25 1:03 PM',
    },
    // ... other recents
];

const SYSTEM_MEALS: MealItem[] = [
    {
        id: 's1',
        brand: 'Optimum\nNutrition',
        title: 'Chocolate Shake',
        description: '2 scoops',
        calories: 240,
        p: 48,
        c: 5,
        f: 2,
        isSystemItem: true,
    },
    {
        id: 's2',
        brand: 'Muscle\nMilk',
        title: 'Protein Pack',
        description: '1 container',
        calories: 160,
        p: 25,
        c: 4,
        f: 5,
        isSystemItem: true,
    },
    {
        id: 's3',
        brand: 'Egg\nWhites',
        title: 'Morning Scramble',
        description: '1 cup',
        calories: 120,
        p: 26,
        c: 0,
        f: 0,
        isSystemItem: true,
    },
    {
        id: 's4',
        brand: 'Greek\nYogurt',
        title: 'Plain Non-fat',
        description: '170g',
        calories: 100,
        p: 18,
        c: 6,
        f: 0,
        isSystemItem: true,
    },
];

export default function AddMealScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [isLocked, setIsLocked] = useState(false);

    // Zustand Store
    const cartItems = useMealLogStore((state) => state.cartItems);
    const addItem = useMealLogStore((state) => state.addItem);
    const removeItem = useMealLogStore((state) => state.removeItem);
    const clearCart = useMealLogStore((state) => state.clear);

    const params = useLocalSearchParams<{ capturedImage?: string, mediaType?: 'image' | 'video' }>();
    const capturedImage = params.capturedImage;
    const mediaType = params.mediaType;

    const [isSheetVisible, setIsSheetVisible] = useState(false);

    // Clear params after consumption to prevent camera screen persistence
    React.useEffect(() => {
        if (capturedImage) {
            // Params will be consumed by MealLoggerSheet, clear them after a brief delay
            const timer = setTimeout(() => {
                router.setParams({ capturedImage: undefined, mediaType: undefined });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [capturedImage]);

    // Derived state for sheet visibility based on cart
    React.useEffect(() => {
        if (cartItems.length > 0) {
            setIsSheetVisible(true);
        } else {
            setIsSheetVisible(false); // Optional: decide if it should auto-close
        }
    }, [cartItems.length]);

    const filteredMeals = activeTab === 'Mealbook'
        ? SYSTEM_MEALS
        : MOCK_MEALS.filter((meal) =>
            meal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (meal.description && meal.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );

    const addToLog = (meal: MealItem) => {
        const newItem: Ingredient = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: meal.title.split(' ').slice(0, 3).join(' '),
            amount: meal.description || '1 serving',
            cals: meal.calories,
            macros: { p: meal.p, c: meal.c, f: meal.f },
        };
        addItem(newItem);
    };

    const handlePublish = async (mealData: { title: string; type: string; ingredients: Ingredient[]; mediaUrl?: any }) => {
        const totals = NutritionService.sumMacros(cartItems);

        const newPost: FeedPost = {
            id: Date.now().toString(),
            user: {
                id: 'currentUser', // Added ID
                name: 'Kwaku',
                handle: '@kwadub',
                avatar: require('../../assets/images/kwadub.jpg'),
                verified: true,
            },
            timeAgo: 'Just now',
            meal: {
                id: Date.now().toString(), // Added ID
                title: (mealData.type && mealData.type !== 'Meal') ? mealData.type : (mealData.title || 'My Meal'),
                type: mealData.type, // Added Type
                calories: totals.cals,
                macros: totals.macros,
                ingredients: mealData.ingredients,
            },
            stats: { likes: 0, shares: 0, comments: 0, saves: 0 },
            isLiked: false,
            isShared: false,
            isSaved: false,
            hasCommented: false,
            mediaUrl: mealData.mediaUrl,
            mediaType: mealData.mediaUrl ? 'image' : undefined,
        };

        await PostStore.addPost(newPost);
        clearCart();
        setIsSheetVisible(false);
    };

    const renderMealItem = ({ item }: { item: MealItem }) => {
        const goToEntry = () => {
            router.push({
                pathname: '/meal-entry',
                params: {
                    id: item.id,
                    title: item.title,
                    description: item.description || '',
                },
            });
        };

        if (item.isSystemItem) {
            return (
                <TouchableOpacity
                    style={styles.systemMealCard}
                    onPress={goToEntry}
                    activeOpacity={0.9}
                >
                    <View style={styles.systemTopRow}>
                        <View style={styles.brandContainer}>
                            <Text style={styles.brandText}>{item.brand}</Text>
                        </View>

                        <View style={styles.systemContent}>
                            <Text style={styles.systemMealTitle}>{item.title}</Text>
                            <Text style={styles.systemMealDesc}>{item.description}</Text>
                        </View>
                    </View>

                    <View style={styles.systemStatsRow}>
                        <View style={styles.systemStat}>
                            <MaterialCommunityIcons name="fire" size={18} color="#1a2e05" />
                            <Text style={styles.systemStatText}>{item.calories} cals</Text>
                        </View>
                        <View style={styles.systemStat}>
                            <MaterialCommunityIcons name="food-drumstick" size={16} color="white" />
                            <Text style={styles.systemStatText}>{item.p}g</Text>
                        </View>
                        <View style={styles.systemStat}>
                            <MaterialCommunityIcons name="barley" size={16} color="white" />
                            <Text style={styles.systemStatText}>{item.c}g</Text>
                        </View>
                        <View style={styles.systemStat}>
                            <Ionicons name="water" size={16} color="white" />
                            <Text style={styles.systemStatText}>{item.f}g</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.systemPlusButton}
                        onPress={() => addToLog(item)}
                    >
                        <Ionicons name="add" size={24} color="#556b2f" />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        }

        const isLongName = item.id === '1' || item.id === '2';
        const displayTitle = item.title.length > 50
            ? item.title.slice(0, 50) + '...'
            : item.title;

        return (
            <View style={styles.mealCard}>
                <View style={[styles.mealRow, { alignItems: 'flex-start' }]}>
                    <View style={styles.userSection}>
                        <Image source={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar} style={styles.avatar} />
                        <View style={styles.userColumn}>
                            <Text style={styles.userName}>{item.userName}</Text>
                            <Text style={styles.handle}>{item.handle}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.tappableMain}
                        activeOpacity={0.7}
                        onPress={goToEntry}
                    >
                        <View style={styles.contentColumn}>
                            <Text
                                style={[
                                    styles.mealTitle,
                                    isLongName && { fontSize: 12 },
                                ]}
                                numberOfLines={isLongName ? 2 : 1}
                            >
                                {displayTitle}
                            </Text>
                            {item.description && (
                                <Text style={styles.mealDescription}>{item.description}</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.actionColumn}>
                        <TouchableOpacity style={styles.itemAddButton} onPress={() => addToLog(item)}>
                            <Ionicons name="add" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={goToEntry} style={styles.timestampContainer}>
                            <Text style={styles.timestampText}>{item.timestamp?.split(' ')[0]}</Text>
                            <Text style={styles.timestampText}>{item.timestamp?.split(' ')[1]}</Text>
                            <Text style={styles.timestampText}>
                                {item.timestamp?.split(' ').slice(2).join(' ')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.mealStats}
                    onPress={goToEntry}
                    activeOpacity={0.7}
                >
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="fire" size={16} color={Colors.primary} />
                        <Text style={styles.statText}>{item.calories} cals</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="food-drumstick" size={16} color="white" />
                        <Text style={styles.statText}>{item.p}g</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="barley" size={16} color="white" />
                        <Text style={styles.statText}>{item.c}g</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="water" size={16} color="white" />
                        <Text style={styles.statText}>{item.f}g</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.scanButton}>
                    <MaterialCommunityIcons name="barcode-scan" size={24} color={Colors.primary} />
                </TouchableOpacity>

                <View style={styles.searchWrapper}>
                    <Ionicons
                        name="search"
                        size={20}
                        color={Colors.primary}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Log it..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                        <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => setIsLocked(!isLocked)}
                    style={[
                        styles.modeButton,
                        isLocked ? styles.modeButtonLocked : styles.modeButtonGlobal,
                    ]}
                >
                    <Ionicons
                        name={isLocked ? 'lock-closed' : 'earth'}
                        size={20}
                        color={isLocked ? '#888' : 'white'}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.tabsRow}>
                {['All', 'Recents', 'Following', 'Mealbook'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[
                            styles.tabPill,
                            activeTab === tab && styles.tabPillActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab && styles.tabTextActive,
                            ]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredMeals}
                renderItem={renderMealItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            <MealLoggerSheet
                visible={isSheetVisible}
                items={cartItems}
                onClose={() => setIsSheetVisible(false)}
                onPublish={handlePublish}
                onRemoveItem={removeItem}
                capturedImage={capturedImage}
                mediaType={mediaType}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    scanButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    cameraButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        paddingHorizontal: 12,
        backgroundColor: '#000',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
    },
    modeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeButtonGlobal: {
        backgroundColor: Colors.primary,
    },
    modeButtonLocked: {
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333',
    },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    tabPill: {
        flex: 1,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabPillActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '500',
    },
    tabTextActive: {
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    mealCard: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 12,
        marginBottom: 12,
    },
    mealRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tappableMain: {
        flex: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    userColumn: {
        width: 60,
    },
    userName: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    handle: {
        color: '#666',
        fontSize: 10,
    },
    contentColumn: {
        flex: 1,
        paddingHorizontal: 8,
    },
    mealTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    mealDescription: {
        color: '#888',
        fontSize: 12,
    },
    actionColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
    },
    itemAddButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    timestampContainer: {
        alignItems: 'center',
    },
    timestampText: {
        color: '#666',
        fontSize: 8,
        textAlign: 'center',
        lineHeight: 10,
    },
    mealStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 16,
        paddingLeft: 4,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    systemMealCard: {
        backgroundColor: '#8ca07a', // Sage green from image
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        height: 100,
        justifyContent: 'space-between',
    },
    systemTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    brandContainer: {
        width: 80,
    },
    brandText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'none',
        lineHeight: 14,
    },
    systemContent: {
        flex: 1,
        paddingLeft: 10,
    },
    systemMealTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    systemMealDesc: {
        color: 'white',
        fontSize: 14,
        fontStyle: 'italic',
        opacity: 0.9,
    },
    systemPlusButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        right: 16,
        top: 34, // (100 total height - 32 button height) / 2
    },
    systemStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    systemStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    systemStatText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
