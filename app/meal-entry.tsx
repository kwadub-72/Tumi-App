import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { USDAFoodItem } from '../src/shared/services/USDAFoodService';
import { NutritionService } from '../src/shared/services/NutritionService';
import { useMealbookStore } from '../src/store/useMealbookStore';
import { Colors } from '../src/shared/theme/Colors';
import { useMealLogStore } from '../src/store/useMealLogStore';

// ─── Initial stats (consumed today — mocked) ──────────────────────────────────
const INITIAL_STATS = { p_consumed: 100, p_goal: 200, c_consumed: 100, c_goal: 200, f_consumed: 15, f_goal: 45 };
const GOAL_CAL = INITIAL_STATS.p_goal * 4 + INITIAL_STATS.c_goal * 4 + INITIAL_STATS.f_goal * 9;
const CONSUMED_CAL = INITIAL_STATS.p_consumed * 4 + INITIAL_STATS.c_consumed * 4 + INITIAL_STATS.f_consumed * 9;

// ─── MacroSlider ─────────────────────────────────────────────────────────────

function MacroSlider({
    icon,
    logged,
    cart,
    proposed,
    goal,
}: {
    icon: string;
    logged: number;
    cart: number;
    proposed: number;
    goal: number;
}) {
    const totalCurrent = logged + cart + proposed;
    let remaining = goal - totalCurrent;
    let overflow = 0;
    
    if (remaining < 0) {
        overflow = -remaining;
        remaining = 0;
    }
    
    const totalForScale = Math.max(goal, totalCurrent);
    const w = (v: number) => `${(v / totalForScale) * 100}%` as any;
    const isOverflowing = overflow > 0;

    return (
        <View style={mss.row}>
            <View style={mss.iconBox}>
                <MaterialCommunityIcons name={icon as any} size={28} color={Colors.primary} />
            </View>
            <View style={mss.trackWrap}>
                <View style={mss.track}>
                    {logged > 0 && (
                        <View style={[mss.seg, { width: w(logged), backgroundColor: Colors.primary }]}>
                            <Text style={[mss.segText, { color: 'white' }]} numberOfLines={1}>{logged}</Text>
                        </View>
                    )}
                    {cart > 0 && (
                        <View style={[mss.seg, { width: w(cart), backgroundColor: 'white' }]}>
                            <Text style={[mss.segText, { color: Colors.primary }]} numberOfLines={1}>{cart}</Text>
                        </View>
                    )}
                    {proposed > 0 && (
                        <View style={[mss.seg, { width: w(proposed), backgroundColor: isOverflowing ? 'rgba(239,68,68,0.4)' : '#DADBDA' }]}>
                            <Text style={[mss.segText, { color: isOverflowing ? 'white' : '#4F6352' }]} numberOfLines={1}>{proposed}</Text>
                        </View>
                    )}
                    {remaining > 0 && (
                        <View style={[mss.seg, { width: w(remaining), backgroundColor: '#8A8A8A' }]}>
                            <Text style={[mss.segText, { color: 'white' }]} numberOfLines={1}>{remaining}</Text>
                        </View>
                    )}
                    {overflow > 0 && (
                        <View style={[mss.seg, { width: w(overflow), backgroundColor: Colors.error }]}>
                            <Text style={[mss.segText, { color: 'white' }]} numberOfLines={1}>{overflow}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const mss = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 30, alignItems: 'center' },
    trackWrap: { flex: 1, marginLeft: 15 },
    track: { height: 45, backgroundColor: 'transparent', borderRadius: 25, flexDirection: 'row', overflow: 'hidden' },
    seg: { height: '100%', justifyContent: 'center', alignItems: 'center' },
    segText: { fontSize: 11, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MealEntryScreen() {
    const params = useLocalSearchParams<{
        id: string;
        title: string;
        description: string;
        caloriesPer100g?: string;
        proteinPer100g?: string;
        carbsPer100g?: string;
        fatPer100g?: string;
        servingSizeG?: string;
        servingSizeText?: string;
        fdcId?: string;
        fdcName?: string;
        fdcBrand?: string;
        servingUnits?: string;
    }>();

    const addItem = useMealLogStore((s) => s.addItem);
    const cartItems = useMealLogStore((s) => s.cartItems);
    const cartTotals = NutritionService.sumMacros(cartItems);

    const { addRecent } = useMealbookStore();

    const isUSDAFood = Boolean(params.caloriesPer100g);
    
    const caloriesPer100g = parseFloat(params.caloriesPer100g ?? '0');
    const proteinPer100g = parseFloat(params.proteinPer100g ?? '0');
    const carbsPer100g = parseFloat(params.carbsPer100g ?? '0');
    const fatPer100g = parseFloat(params.fatPer100g ?? '0');
    const servingSizeG = parseFloat(params.servingSizeG ?? '100');
    
    const servingSizeLabel = params.servingSizeText || `${servingSizeG}g`;

    const [amount, setAmount] = useState('1'); // Enter multiple
    const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);

    const servingUnits: any[] = params.servingUnits ? JSON.parse(params.servingUnits) : [
        { label: params.servingSizeText || `${servingSizeG}g`, gramsPerUnit: servingSizeG }
    ];

    const currentUnit = servingUnits[selectedUnitIndex];

    // Reset defaults when a new food is loaded
    useEffect(() => {
        setAmount('1');
        setSelectedUnitIndex(servingUnits.length - 1); // Prefer the "household" unit if it's last (usually is)
    }, [params.id]);

    const amountValue = parseFloat(amount) || 0;

    // ── Macro calculation ──
    let proposedCals = 0;
    let proposedMacros = { p: 0, c: 0, f: 0 };

    if (amountValue > 0) {
        if (isUSDAFood) {
            // Use the selected unit's gram conversion
            const totalGrams = currentUnit.gramsPerUnit * amountValue;
            const scale = totalGrams / 100;
            proposedCals = Math.round(caloriesPer100g * scale);
            proposedMacros = {
                p: Math.round(proteinPer100g * scale),
                c: Math.round(carbsPer100g * scale),
                f: Math.round(fatPer100g * scale),
            };
        } else {
            const OZ_CALS = 300, OZ_P = 25, OZ_C = 25, OZ_F = 10;
            proposedCals = Math.round(OZ_CALS * amountValue);
            proposedMacros = {
                p: Math.round(OZ_P * amountValue),
                c: Math.round(OZ_C * amountValue),
                f: Math.round(OZ_F * amountValue),
            };
        }
    }

    const handleAdd = () => {
        const unitLabel = currentUnit.label;
        addItem({
            id: Date.now().toString(),
            name: (params.title as string) || 'Meal Item',
            amount: `${amountValue} x ${unitLabel}`,
            cals: proposedCals,
            macros: proposedMacros,
        });

        if (isUSDAFood && params.fdcId) {
            const food: any = {
                fdcId: parseInt(params.fdcId),
                name: params.fdcName ?? params.title ?? '',
                brand: params.fdcBrand || undefined,
                servingSizeG: servingSizeG,
                servingSizeText: params.servingSizeText || undefined,
                caloriesPer100g: caloriesPer100g,
                macrosPer100g: { p: proteinPer100g, c: 0, f: fatPer100g }, // C is net carbs here
                netCarbsPer100g: carbsPer100g,
                servingUnits: servingUnits
            };
            addRecent(food);
        }

        router.back();
    };

    const toggleUnit = () => {
        setSelectedUnitIndex(prev => (prev + 1) % servingUnits.length);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{params.title}</Text>
                        <Text style={styles.subtitle}>{params.description || (isUSDAFood ? 'USDA database' : 'Homemade')}</Text>
                    </View>
                </View>

                {/* ── Macro summary row ── */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="fire" size={26} color={Colors.primary} />
                        <Text style={styles.summaryValue}>{proposedCals} cals</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="food-drumstick" size={18} color={Colors.primary + '88'} />
                        <Text style={styles.summaryValueSmall}>{proposedMacros.p}g</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="barley" size={18} color={Colors.primary + '88'} />
                        <Text style={styles.summaryValueSmall}>{proposedMacros.c}g</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="water" size={18} color={Colors.primary + '88'} />
                        <Text style={styles.summaryValueSmall}>{proposedMacros.f}g</Text>
                    </View>
                </View>

                {/* ── Amount & Unit inputs ── */}
                <View style={styles.inputsRow}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Serving size</Text>
                        <TouchableOpacity style={styles.pillBox} onPress={toggleUnit}>
                            <Text style={styles.pillText}>{currentUnit.label}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Amount</Text>
                        <View style={styles.amountPillBox}>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                placeholderTextColor="#666"
                                textAlign="center"
                            />
                        </View>
                    </View>
                </View>

                {/* ── Macro sliders ── */}
                <View style={styles.chartsContainer}>
                    <MacroSlider 
                        icon="fire" 
                        logged={CONSUMED_CAL} 
                        cart={cartTotals.cals} 
                        proposed={proposedCals} 
                        goal={GOAL_CAL} 
                    />
                    <MacroSlider 
                        icon="food-drumstick" 
                        logged={INITIAL_STATS.p_consumed} 
                        cart={cartTotals.macros.p} 
                        proposed={proposedMacros.p} 
                        goal={INITIAL_STATS.p_goal} 
                    />
                    <MacroSlider 
                        icon="barley" 
                        logged={INITIAL_STATS.c_consumed} 
                        cart={cartTotals.macros.c} 
                        proposed={proposedMacros.c} 
                        goal={INITIAL_STATS.c_goal} 
                    />
                    <MacroSlider 
                        icon="water" 
                        logged={INITIAL_STATS.f_consumed} 
                        cart={cartTotals.macros.f} 
                        proposed={proposedMacros.f} 
                        goal={INITIAL_STATS.f_goal} 
                    />
                </View>
                
                {/* ── Legend ── */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                        <Text style={styles.legendText}>Logged</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: 'white' }]} />
                        <Text style={styles.legendText}>In cart</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#DADBDA' }]} />
                        <Text style={styles.legendText}>Proposed entry</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#8A8A8A' }]} />
                        <Text style={styles.legendText}>Remaining</Text>
                    </View>
                </View>

                {/* ── Add button ── */}
                <TouchableOpacity style={styles.addCircle} onPress={handleAdd}>
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 30 },
    titleContainer: { marginLeft: 20, flex: 1 },
    title: { color: Colors.primary, fontSize: 24, fontWeight: 'bold' },
    subtitle: { color: Colors.primary + '99', fontSize: 16, fontStyle: 'italic' },
    summaryRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: Colors.primary + '33', marginBottom: 25,
    },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryValue: { color: Colors.textDark, fontSize: 18, fontWeight: '700' },
    summaryValueSmall: { color: Colors.textDark, fontSize: 16, fontWeight: '600' },
    inputsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    inputGroup: { width: '45%' },
    inputLabel: { color: Colors.textDark + 'AA', fontSize: 13, marginBottom: 8, fontStyle: 'italic' },
    pillBox: {
        height: 50, borderRadius: 25, borderWidth: 1, borderColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 15,
    },
    pillText: { color: Colors.textDark, fontSize: 16, fontWeight: '500' },
    amountPillBox: {
        height: 50, borderRadius: 25, borderWidth: 1, borderColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 15,
    },
    amountInput: { color: Colors.primary, fontSize: 16, fontWeight: '500', width: '100%', height: '100%' },
    chartsContainer: { gap: 18, marginBottom: 20 },
    legendContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        gap: 12, 
        marginTop: 10
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 14, height: 14, borderRadius: 7 },
    legendText: { color: Colors.textDark, fontSize: 12 },
    addCircle: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
        marginTop: 'auto', marginBottom: 30,
        // Optional floating shadow
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4
    },
});
