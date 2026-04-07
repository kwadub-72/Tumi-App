import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'All' | 'Recents' | 'Following' | 'Mealbook';
const TABS: Tab[] = ['All', 'Recents', 'Following', 'Mealbook'];

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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('All');
    const [isLocked, setIsLocked] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<USDAFoodItem[]>([]);
    const [fullResults, setFullResults] = useState<USDAFoodItem[]>([]);
    const [showFullResults, setShowFullResults] = useState(false);
    const [followingPosts, setFollowingPosts] = useState<FeedPost[]>([]);

    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stores
    const cartItems = useMealLogStore((s) => s.cartItems);
    const addItem = useMealLogStore((s) => s.addItem);
    const removeItem = useMealLogStore((s) => s.removeItem);
    const clearCart = useMealLogStore((s) => s.clear);
    const { bookmarks, recents, addRecent } = useMealbookStore();

    const params = useLocalSearchParams<{ capturedImage?: string; mediaType?: 'image' | 'video' }>();
    const capturedImage = params.capturedImage;
    const mediaType = params.mediaType;
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const { session, profile } = useAuthStore();
    const userInfo = { handle: profile?.handle, name: profile?.name, avatar: profile?.avatar_url, status: profile?.status }; // Stub if needed, though profile might be better

    // ── Load following feed for the Following tab ──
    useEffect(() => {
        if (!session?.user?.id) return;
        SupabasePostService.getFeed({
            userId: session.user.id,
            feedType: 'following',
            date: new Date(),
            limit: 50
        }).then((posts) => {
            setFollowingPosts(posts);
        });
    }, [session?.user?.id]);

    // ── Sheet visibility ──
    useEffect(() => {
        setIsSheetVisible(cartItems.length > 0);
    }, [cartItems.length]);

    // ── Clear captured image params ──
    useEffect(() => {
        if (capturedImage) {
            const t = setTimeout(() => {
                router.setParams({ capturedImage: undefined, mediaType: undefined });
            }, 500);
            return () => clearTimeout(t);
        }
    }, [capturedImage]);

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
            };
            addItem(newItem);
            addRecent(food);
        },
        [addItem, addRecent]
    );

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
    }) => {
        if (!session?.user?.id) return;
        const totals = NutritionService.sumMacros(cartItems);

        await SupabasePostService.addPost({
            authorId: session.user.id,
            postType: 'meal',
            payload: {
                meal: {
                    id: Date.now().toString(),
                    title: mealData.type && mealData.type !== 'Meal' ? mealData.type : mealData.title || 'My Meal',
                    type: mealData.type,
                    calories: totals.cals,
                    macros: totals.macros,
                    ingredients: mealData.ingredients,
                }
            },
            tribeId: undefined // Let users optionally log to a tribe in the future
        });

        clearCart();
        setIsSheetVisible(false);
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

    /** Following tab: extract unique foods from following's meal posts */
    const followingFoods = (() => {
        const seen = new Set<string>();
        const foods: Array<{ name: string; cals: number; p: number; c: number; f: number; userName: string; avatar: any }> = [];
        followingPosts.forEach((post) => {
            if (!post.meal) return;
            const q = searchQuery.toLowerCase();
            post.meal.ingredients.forEach((ing) => {
                if (q && !ing.name.toLowerCase().includes(q)) return;
                if (seen.has(ing.name)) return;
                seen.add(ing.name);
                foods.push({
                    name: ing.name,
                    cals: ing.cals,
                    p: ing.macros.p,
                    c: ing.macros.c,
                    f: ing.macros.f,
                    userName: post.user.name,
                    avatar: post.user.avatar,
                });
            });
        });
        return foods;
    })();

    const renderFollowingFood = ({ item }: { item: typeof followingFoods[0] }) => (
        <View style={styles.followingCard}>
            <View style={styles.followingLeft}>
                <View style={styles.followingUserRow}>
                    <Image
                        source={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar}
                        style={styles.followingAvatar}
                    />
                    <Text style={styles.followingUser}>{item.userName}</Text>
                </View>
                <Text style={styles.followingName}>{item.name}</Text>
                <View style={styles.usdaMacros}>
                    <View style={styles.usdaMacroItem}>
                        <MaterialCommunityIcons name="fire" size={13} color={Colors.primary} />
                        <Text style={styles.usdaMacroText}>{item.cals}</Text>
                    </View>
                    <View style={styles.usdaMacroItem}>
                        <MaterialCommunityIcons name="food-drumstick" size={12} color="white" />
                        <Text style={styles.usdaMacroText}>{item.p}g</Text>
                    </View>
                    <View style={styles.usdaMacroItem}>
                        <MaterialCommunityIcons name="barley" size={12} color="white" />
                        <Text style={styles.usdaMacroText}>{item.c}g</Text>
                    </View>
                    <View style={styles.usdaMacroItem}>
                        <Ionicons name="water" size={12} color="white" />
                        <Text style={styles.usdaMacroText}>{item.f}g</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity
                style={styles.usdaAddBtn}
                onPress={() => {
                    const ing: Ingredient = {
                        id: `following-${Date.now()}-${Math.random()}`,
                        name: item.name,
                        amount: '1 serving',
                        cals: item.cals,
                        macros: { p: item.p, c: item.c, f: item.f },
                    };
                    addItem(ing);
                }}
            >
                <Ionicons name="add" size={22} color={Colors.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderMealbookCard = ({ item }: { item: typeof bookmarks[0] }) => (
        <USDAResultCard
            item={item}
            onAdd={() => goToEntry(item)}
            onQuickAdd={() => addUSDAToCart(item)}
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

    const filteredBookmarks = searchQuery
        ? bookmarks.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : bookmarks;

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

    const renderFollowingTab = () => {
        if (followingPosts.length === 0) {
            return (
                <View style={styles.centered}>
                    <Ionicons name="people-outline" size={56} color={Colors.primary + '44'} />
                    <Text style={styles.emptyText}>Nobody followed yet</Text>
                    <Text style={styles.emptySubText}>
                        Follow people to see their recent foods here
                    </Text>
                </View>
            );
        }
        if (followingFoods.length === 0) {
            return (
                <View style={styles.centered}>
                    <Ionicons name="restaurant-outline" size={56} color={Colors.primary + '44'} />
                    <Text style={styles.emptyText}>No meals logged yet</Text>
                    <Text style={styles.emptySubText}>
                        Your followed users haven't logged any meals
                    </Text>
                </View>
            );
        }
        return (
            <FlatList
                data={followingFoods}
                keyExtractor={(i, idx) => `${i.name}-${idx}`}
                renderItem={renderFollowingFood}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    const renderMealbookTab = () => {
        if (filteredBookmarks.length === 0) {
            return (
                <View style={styles.centered}>
                    <Ionicons name="bookmark-outline" size={56} color={Colors.primary + '44'} />
                    <Text style={styles.emptyText}>Your Mealbook is empty</Text>
                    <Text style={styles.emptySubText}>
                        Bookmark a meal post to save its foods here
                    </Text>
                </View>
            );
        }
        return (
            <FlatList
                data={filteredBookmarks}
                keyExtractor={(i) => String(i.fdcId)}
                renderItem={renderMealbookCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'All': return renderAllTab();
            case 'Recents': return renderRecentsTab();
            case 'Following': return renderFollowingTab();
            case 'Mealbook': return renderMealbookTab();
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
                        placeholder={activeTab === 'Following' ? 'Search following foods…' : 'Log it…'}
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
