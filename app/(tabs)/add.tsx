import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { USDAFoodItem, USDAFoodService } from '../../src/shared/services/USDAFoodService';
import { useMealbookStore } from '../../src/store/useMealbookStore';
import { Colors } from '../../src/shared/theme/Colors';
import { useMealLogStore } from '../../src/store/useMealLogStore';
import { useAuthStore } from '../../store/AuthStore';
import { SupabasePostService } from '../../src/shared/services/SupabasePostService';
import { PostStore } from '../../store/PostStore';
import { BookCard } from '../../src/features/feed/components/BookCard';
import { CondensedMealCard } from '../../src/features/feed/components/CondensedMealCard';

import { supabase } from '../../src/shared/services/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'All' | 'Recents' | 'Meal book';
const TABS: Tab[] = ['All', 'Recents', 'Meal book'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calories for 1 serving of a USDA item */
function calPerServing(item: USDAFoodItem) {
    return Math.round((item.caloriesPer100g * item.servingSizeG) / 100);
}
function macroPerServing(item: USDAFoodItem) {
    const s = item.servingSizeG / 100;
    return {
        p: Math.round(item.macrosPer100g.p * s),
        c: Math.round(item.macrosPer100g.c * s),
        f: Math.round(item.macrosPer100g.f * s),
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function USDAResultCard({
    item,
    onAdd,
    onQuickAdd,
}: {
    item: USDAFoodItem;
    onAdd: () => void;
    onQuickAdd: () => void;
}) {
    const cals = calPerServing(item);
    const macros = macroPerServing(item);
    const servingLabel = item.servingSizeText
        ? `${item.servingSizeText} (${item.servingSizeG}g)`
        : `${item.servingSizeG}g`;

    return (
        <TouchableOpacity style={styles.usdaCard} onPress={onAdd} activeOpacity={0.85}>
            <View style={styles.usdaCardLeft}>
                <Text style={styles.usdaName} numberOfLines={2}>
                    {item.name}
                </Text>
                {item.brand && (
                    <Text style={styles.usdaBrand} numberOfLines={1}>
                        {item.brand}
                    </Text>
                )}
                <Text style={styles.usdaServing}>{servingLabel}</Text>
                <View style={styles.usdaMacros}>
                    <View style={styles.usdaMacroItem}>
                        <MaterialCommunityIcons name="fire" size={13} color={Colors.primary} />
                        <Text style={styles.usdaMacroText}>{cals}</Text>
                    </View>
                    <View style={styles.usdaMacroItem}>
                        <MaterialCommunityIcons name="food-drumstick" size={12} color="white" />
                        <Text style={styles.usdaMacroText}>{macros.p}g</Text>
                    </View>
                    <View style={styles.usdaMacroItem}>
                        <MaterialCommunityIcons name="barley" size={12} color="white" />
                        <Text style={styles.usdaMacroText}>{Math.round(item.netCarbsPer100g * (item.servingSizeG/100))}g</Text>
                    </View>
                    <View style={styles.usdaMacroItem}>
                        <Ionicons name="water" size={12} color="white" />
                        <Text style={styles.usdaMacroText}>{macros.f}g</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.usdaAddBtn} onPress={onQuickAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="add" size={22} color={Colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddMealScreen() {
    const { navigateToProfile } = useProfileNavigation();
    const params = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>((params.tab as Tab) || 'All');
    const [isLocked, setIsLocked] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<USDAFoodItem[]>([]);
    const [fullResults, setFullResults] = useState<USDAFoodItem[]>([]);
    const [showFullResults, setShowFullResults] = useState(false);
    const [followingPosts, setFollowingPosts] = useState<FeedPost[]>([]);
    const [mealLogItems, setMealLogItems] = useState<any[]>([]);

    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stores
    const cartItems = useMealLogStore((s) => s.cartItems);
    const addItem = useMealLogStore((s) => s.addItem);
    const removeItem = useMealLogStore((s) => s.removeItem);
    const clearCart = useMealLogStore((s) => s.clear);
    const { bookmarks, recents, addRecent } = useMealbookStore();

    const capturedMedia = useMealLogStore((s) => s.capturedMedia);
    const capturedImage = capturedMedia?.uri;
    const mediaType = capturedMedia?.type;
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const { session, profile } = useAuthStore();
    const userInfo = { handle: profile?.handle, name: profile?.name, avatar: profile?.avatar_url, status: profile?.status }; // Stub if needed, though profile might be better

    // ── Load following feed for the Following tab & Meal Log ──
    useFocusEffect(
        useCallback(() => {
            if (!session?.user?.id) return;
            
            const fetchMealLog = async () => {
                const data = await SupabasePostService.getMealBook(session.user.id);
                setMealLogItems(data);
            };
            fetchMealLog();
        }, [session?.user?.id])
    );

    // ── Sheet visibility ──
    useEffect(() => {
        setIsSheetVisible(cartItems.length > 0);
    }, [cartItems.length]);

    // Media persistence is handled by useMealLogStore and cleared on publish.

    // ── Debounced inline suggestions (keystroke) ──
    useEffect(() => {
        if (suggestTimer.current) clearTimeout(suggestTimer.current);
        setSuggestions([]);
        setShowFullResults(false);

        if (!searchQuery.trim() || activeTab !== 'All') return;

        suggestTimer.current = setTimeout(async () => {
            const items = await USDAFoodService.suggest(searchQuery);
            setSuggestions(items);
        }, 350);

        return () => {
            if (suggestTimer.current) clearTimeout(suggestTimer.current);
        };
    }, [searchQuery, activeTab]);

    // ── Full search (submit / arrow) ──
    const handleSubmitSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        Keyboard.dismiss();
        setSuggestions([]);
        setIsSearching(true);
        setShowFullResults(true);
        const items = await USDAFoodService.search(searchQuery, 40);
        setFullResults(items);
        setIsSearching(false);
    }, [searchQuery]);

    // ── Add USDA item to cart ──
    const addUSDAToCart = useCallback(
        (food: USDAFoodItem) => {
            const macros = macroPerServing(food);
            const newItem: Ingredient = {
                id: `usda-${food.fdcId}-${Date.now()}`,
                name: food.name,
                amount: food.servingSizeText ?? `${food.servingSizeG}g`,
                cals: calPerServing(food),
                macros,
                metadata: {
                    caloriesPer100g: food.caloriesPer100g,
                    macrosPer100g: food.macrosPer100g,
                    servingSizeG: food.servingSizeG,
                    servingSizeText: food.servingSizeText,
                    fdcId: food.fdcId,
                    servingUnits: food.servingUnits,
                }
            };
            addItem(newItem);
            addRecent(food);
        },
        [addItem, addRecent]
    );

    const handleEditItem = useCallback((item: Ingredient) => {
        // If it's a USDA food with metadata, navigate to meal-entry for full editing
        if (item.metadata) {
            router.push({
                pathname: '/meal-entry',
                params: {
                    id: String(item.metadata.fdcId),
                    title: item.name,
                    description: '', // could add brand if we store it
                    caloriesPer100g: String(item.metadata.caloriesPer100g),
                    proteinPer100g: String(item.metadata.macrosPer100g?.p),
                    carbsPer100g: String(item.metadata.macrosPer100g?.c),
                    fatPer100g: String(item.metadata.macrosPer100g?.f),
                    servingSizeG: String(item.metadata.servingSizeG),
                    servingSizeText: item.metadata.servingSizeText ?? '',
                    fdcId: String(item.metadata.fdcId),
                    fdcName: item.name,
                    servingUnits: JSON.stringify(item.metadata.servingUnits),
                    editId: item.id, // Pass the existing ID to update it
                    initialAmount: item.amount.split(' ')[0], // Try to extract amount
                },
            });
        } else {
            // Manual items - could open a simple editor or reuse meal-entry
            // For now, let's treat them as simple entries
            router.push({
                pathname: '/meal-entry',
                params: {
                    id: item.id,
                    title: item.name,
                    editId: item.id,
                    initialAmount: item.amount.split(' ')[0],
                    // Manual items in meal-entry currently use fixed macros (L195)
                    // We might want to fix that, but let's see.
                }
            });
        }
    }, []);

    // ── Navigate to meal-entry for detail view ──
    const goToEntry = useCallback(
        (food: USDAFoodItem) => {
            router.push({
                pathname: '/meal-entry',
                params: {
                    id: String(food.fdcId),
                    title: food.name,
                    description: food.brand ?? '',
                    caloriesPer100g: String(food.caloriesPer100g),
                    proteinPer100g: String(food.macrosPer100g.p),
                    carbsPer100g: String(food.netCarbsPer100g), // Pass NET CARBS as requested
                    fatPer100g: String(food.macrosPer100g.f),
                    servingSizeG: String(food.servingSizeG),
                    servingSizeText: food.servingSizeText ?? '',
                    fdcId: String(food.fdcId),
                    fdcName: food.name,
                    fdcBrand: food.brand ?? '',
                    servingUnits: JSON.stringify(food.servingUnits),
                },
            });
        },
        []
    );

    // ── Publish meal ──
    const handlePublish = async (mealData: {
        title: string;
        type: string;
        ingredients: Ingredient[];
        mediaUrl?: any;
        mediaType?: 'image' | 'video' | null;
    }) => {
        if (!session?.user?.id) return;
        const totals = NutritionService.sumMacros(cartItems);

        // Upload to supabase (already implemented)
        await SupabasePostService.addPost({
            authorId: session.user.id,
            postType: 'meal',
            caption: mealData.title,
            mediaUrl: mealData.mediaUrl,
            mediaType: mealData.mediaType || undefined,
            payload: {
                meal: {
                    id: Date.now().toString(),
                    title: mealData.type && mealData.type !== 'Meal' ? mealData.type : mealData.title || 'My Meal',
                    type: mealData.type,
                    calories: totals.cals,
                    macros: totals.macros,
                    ingredients: mealData.ingredients,
                    time: 'Just now', // added time
                },
            },
            tribeId: undefined // Let users optionally log to a tribe in the future
        });

        const newPost: FeedPost = {
            id: Date.now().toString(),
            user: {
                id: session.user.id,
                handle: profile?.handle || 'me',
                name: profile?.name || 'Me',
                avatar: profile?.avatar_url || '',
                status: profile?.status || 'none',
            },
            meal: {
                id: Date.now().toString(),
                title: mealData.title || mealData.type || 'My Meal',
                type: mealData.type,
                ingredients: mealData.ingredients,
                calories: totals.cals,
                macros: totals.macros,
                timeAgo: 'Just now',
            },
            timeAgo: 'Just now',
            stats: { likes: 0, comments: 0, saves: 0, shares: 0 },
            isLiked: false,
            isSaved: false,
            mediaUrl: mealData.mediaUrl,
            mediaType: mealData.mediaType || 'image',
        };
        await PostStore.addPost(newPost);

        clearCart();
        setIsSheetVisible(false);
        // Navigate to the main feed tab (which defaults to 'Following')
        router.replace('/');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────────────────────

    const renderUSDACard = ({ item }: { item: USDAFoodItem }) => (
        <USDAResultCard
            item={item}
            onAdd={() => goToEntry(item)}
            onQuickAdd={() => addUSDAToCart(item)}
        />
    );

    const renderMealLogCard = ({ item }: { item: any }) => (
        <CondensedMealCard
            title={item.item_name}
            portionSize={item.portion_size || item.notes || '1 serving'}
            calories={item.calories}
            protein={item.protein}
            carbs={item.carbs}
            fats={item.fats}
            savedAt={item.created_at}
            copyCount={item.copy_count || 0}
            authorName={item.original_author?.name || profile?.name || 'Me'}
            authorHandle={item.original_author?.handle || profile?.handle || 'me'}
            authorAvatar={item.original_author?.avatar_url || profile?.avatar_url || ''}
            authorStatus={item.original_author?.status || profile?.status}
            authorActivityIcon={item.original_author?.activity_icon || profile?.activity_icon}
            authorActivity={item.original_author?.activity || profile?.activity}
            onPressProfile={() => navigateToProfile({ 
                id: item.original_author?.id || profile?.id, 
                handle: item.original_author?.handle || profile?.handle || 'me' 
            })}
            onPressStandardCopy={() => {
                const ing: Ingredient = {
                    id: `meal_log-${item.id}-${Math.random()}`,
                    name: item.item_name,
                    amount: item.portion_size,
                    cals: item.calories,
                    macros: { p: item.protein, c: item.carbs, f: item.fats },
                };
                addItem(ing);
            }}
            onPressTribeCopy={async () => {
                if (!session?.user?.id || !item.original_post_id) return;
                
                // If the user is copying their own post, it should be a 1:1 copy
                if (item.original_author?.id === session.user.id) {
                    const ing: Ingredient = {
                        id: `tribe_copy-${item.id}-${Math.random()}`,
                        name: item.item_name,
                        amount: item.portion_size,
                        cals: Math.round(item.protein * 4 + item.carbs * 4 + item.fats * 9),
                        macros: { p: item.protein, c: item.carbs, f: item.fats },
                    };
                    addItem(ing);
                    return;
                }

                const scaledIngredients = await SupabasePostService.tribeCopyFood(item.original_post_id, session.user.id);
                if (scaledIngredients) {
                    scaledIngredients.forEach((ing: Ingredient) => {
                        addItem({
                            ...ing,
                            id: `tribe_copy-${ing.id}-${Math.random()}`,
                            cals: Math.round(ing.macros.p * 4 + ing.macros.c * 4 + ing.macros.f * 9) // Ensure correct calories
                        });
                    });
                }
            }}
        />
    );

    const renderRecentCard = ({ item }: { item: typeof recents[0] }) => (
        <USDAResultCard
            item={item}
            onAdd={() => goToEntry(item)}
            onQuickAdd={() => addUSDAToCart(item)}
        />
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Filtered data per tab
    // ─────────────────────────────────────────────────────────────────────────

    const filteredRecents = searchQuery
        ? recents.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : recents;

    const filteredMealLog = searchQuery
        ? mealLogItems.filter((m) => m.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
        : mealLogItems;

    // ─────────────────────────────────────────────────────────────────────────
    // Body content per tab
    // ─────────────────────────────────────────────────────────────────────────

    const renderAllTab = () => {
        if (showFullResults || suggestions.length > 0) {
            const dataToRender = showFullResults ? fullResults : suggestions;
            if (isSearching) {
                return (
                    <View style={styles.centered}>
                        <ActivityIndicator color={Colors.primary} size="large" />
                        <Text style={styles.loadingText}>Searching USDA database…</Text>
                    </View>
                );
            }
            if (dataToRender.length === 0) {
                return (
                    <View style={styles.centered}>
                        <Ionicons name="search" size={48} color={Colors.primary + '55'} />
                        <Text style={styles.emptyText}>No results found</Text>
                    </View>
                );
            }
            return (
                <FlatList
                    data={dataToRender}
                    keyExtractor={(i) => String(i.fdcId)}
                    renderItem={renderUSDACard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />
            );
        }

        // No search yet
        return (
            <View style={styles.centered}>
                <Ionicons name="nutrition" size={56} color={Colors.primary + '44'} />
                <Text style={styles.emptyText}>Search millions of foods</Text>
                <Text style={styles.emptySubText}>Type above to search the USDA database</Text>
            </View>
        );
    };

    const renderRecentsTab = () => {
        if (filteredRecents.length === 0) {
            return (
                <View style={styles.centered}>
                    <Ionicons name="time-outline" size={56} color={Colors.primary + '44'} />
                    <Text style={styles.emptyText}>No recent foods</Text>
                    <Text style={styles.emptySubText}>Foods you log will appear here</Text>
                </View>
            );
        }
        return (
            <FlatList
                data={filteredRecents}
                keyExtractor={(i) => String(i.fdcId)}
                renderItem={renderRecentCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        );
    };



    const renderMealLogTab = () => {
        if (filteredMealLog.length === 0) {
            return (
                <View style={styles.centered}>
                    <Ionicons name="book-outline" size={56} color={Colors.primary + '44'} />
                    <Text style={styles.emptyText}>Your Meal book is empty</Text>
                    <Text style={styles.emptySubText}>
                        Save items from posts to see them here
                    </Text>
                </View>
            );
        }
        return (
            <FlatList
                data={filteredMealLog}
                keyExtractor={(i) => String(i.id)}
                renderItem={renderMealLogCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'All': return renderAllTab();
            case 'Recents': return renderRecentsTab();
            case 'Meal book': return renderMealLogTab();
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header bar ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => router.push('/scan')}
                >
                    <MaterialCommunityIcons name="barcode-scan" size={24} color={Colors.primary} />
                </TouchableOpacity>

                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Log it…"
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={(t) => {
                            setSearchQuery(t);
                            if (!t.trim()) {
                                setShowFullResults(false);
                                setFullResults([]);
                            }
                        }}
                        onSubmitEditing={() => {
                            handleSubmitSearch();
                            Keyboard.dismiss();
                        }}
                        returnKeyType="search"
                    />
                    <TouchableOpacity onPress={handleSubmitSearch}>
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

            {/* ── Tabs ── */}
            <View style={styles.tabsRow}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => {
                            setActiveTab(tab);
                            setShowFullResults(false);
                            setSuggestions([]);
                        }}
                        style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                    >
                        <Text
                            style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Content ── */}
            <View style={{ flex: 1 }}>{renderTabContent()}</View>

            <MealLoggerSheet
                visible={isSheetVisible}
                items={cartItems}
                onClose={() => setIsSheetVisible(false)}
                onPublish={handlePublish}
                onRemoveItem={removeItem}
                onPressItem={handleEditItem}
                capturedImage={capturedImage}
                mediaType={mediaType}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    scanButton: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(164, 182, 157, 0.2)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: Colors.primary,
    },
    searchWrapper: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        height: 44, borderRadius: 22, borderWidth: 1.5,
        borderColor: Colors.primary, paddingHorizontal: 12,
        backgroundColor: Colors.background,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: Colors.textDark, fontSize: 16 },
    modeButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    modeButtonGlobal: { backgroundColor: Colors.primary },
    modeButtonLocked: { backgroundColor: 'rgba(164,182,157,0.2)', borderWidth: 1, borderColor: Colors.primary },

    // Tabs
    tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tabPill: {
        flex: 1, height: 34, borderRadius: 17,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'transparent',
    },
    tabPillActive: { backgroundColor: Colors.primary },
    tabText: { color: Colors.textDark, fontSize: 12, fontWeight: '500' },
    tabTextActive: { color: 'white', fontWeight: 'bold' },

    listContent: { paddingHorizontal: 12, paddingBottom: 100 },

    // USDA result card
    usdaCard: {
        backgroundColor: Colors.card,
        borderRadius: 20, padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
    },
    usdaCardLeft: { flex: 1, paddingRight: 10 },
    usdaName: { color: 'white', fontSize: 15, fontWeight: '700', marginBottom: 2 },
    usdaBrand: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 2 },
    usdaServing: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 6 },
    usdaMacros: { flexDirection: 'row', gap: 10 },
    usdaMacroItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    usdaMacroText: { color: 'white', fontSize: 12, fontWeight: '600' },
    usdaAddBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'white', justifyContent: 'center', alignItems: 'center',
    },

    // Following card
    followingCard: {
        backgroundColor: Colors.card, borderRadius: 20,
        padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
    },
    followingLeft: { flex: 1, paddingRight: 10 },
    followingUserRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    followingAvatar: { width: 20, height: 20, borderRadius: 10 },
    followingUser: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
    followingName: { color: 'white', fontSize: 15, fontWeight: '700', marginBottom: 6 },

    // Empty / loading states
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { color: Colors.textDark, marginTop: 16, fontSize: 14 },
    emptyText: { color: Colors.textDark, fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubText: { color: Colors.textDark + '99', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
