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
    Modal,
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
    const wPct = (v: number) => (totalForScale > 0 ? (v / totalForScale) * 100 : 0);
    const isOverflowing = overflow > 0;

    const renderSeg = (val: number, bg: string, textCol: string) => {
        if (val <= 0) return null;
        const pct = wPct(val);
        const isSmall = pct < 12;
        return (
            <View style={[mss.seg, { width: `${pct}%`, backgroundColor: bg }]}>
                {!isSmall && <Text style={[mss.segText, { color: textCol }]} numberOfLines={1}>{val}</Text>}
            </View>
        );
    }

    const renderSub = (val: number, textCol: string, align: 'center'|'left'|'right' = 'center') => {
        if (val <= 0) return null;
        const pct = wPct(val);
        const isSmall = pct < 12;
        return (
            <View style={{ width: `${pct}%` }}>
                {isSmall && (
                    <View style={{ position: 'absolute', top: 2, left: '50%', width: 20, marginLeft: -10, alignItems: 'center', overflow: 'visible' }}>
                        <Ionicons name="chevron-up" size={14} color={textCol} style={{ marginBottom: -4 }} />
                        <View style={{
                            position: 'absolute',
                            top: 14,
                            width: 100,
                            alignItems: align === 'left' ? 'flex-end' : align === 'right' ? 'flex-start' : 'center',
                            ...(align === 'left' ? { right: 10, paddingRight: 2 } : align === 'right' ? { left: 10, paddingLeft: 2 } : { left: -40 })
                        }}>
                            <Text style={[mss.segText, { color: textCol }]} numberOfLines={1}>{val}</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={mss.row}>
            <View style={mss.iconBox}>
                <MaterialCommunityIcons name={icon as any} size={28} color={Colors.primary} />
            </View>
            <View style={mss.trackWrap}>
                <View style={mss.track}>
                    {renderSeg(logged, Colors.primary, 'white')}
                    {renderSeg(cart, 'white', Colors.primary)}
                    {renderSeg(proposed, '#A0A5A0', '#4F6352')}
                    {renderSeg(remaining, '#787D78', 'white')}
                </View>
                <View style={{ flexDirection: 'row', height: 24, position: 'relative' }}>
                    {renderSub(logged, Colors.primary, 'center')}
                    {renderSub(cart, Colors.primary, 'left')}
                    {renderSub(proposed, '#A0A5A0', 'right')}
                    {renderSub(remaining, '#787D78', 'center')}
                    {overflow > 0 && (
                        <View style={{ position: 'absolute', right: -5, top: 2, alignItems: 'flex-end', overflow: 'visible' }}>
                            <Ionicons name="chevron-up" size={14} color="#F06565" style={{ marginBottom: -4, marginRight: 2 }} />
                            <View style={{ width: 100, alignItems: 'flex-end' }}>
                                <Text style={[mss.segText, { color: '#F06565' }]} numberOfLines={1}>-{overflow}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const mss = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    iconBox: { width: 30, alignItems: 'center', marginTop: 8 },
    trackWrap: { flex: 1, marginLeft: 15 },
    track: { height: 45, backgroundColor: 'transparent', borderRadius: 25, flexDirection: 'row', overflow: 'hidden' },
    seg: { height: '100%', justifyContent: 'center', alignItems: 'center' },
    segText: { fontSize: 13, fontWeight: '700' },
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
    const [showUnitPicker, setShowUnitPicker] = useState(false);

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
        const totalAmountNum = amountValue * currentUnit.amount;
        const formattedAmount = `${totalAmountNum} ${currentUnit.unit}`;
        
        addItem({
            id: Date.now().toString(),
            name: (params.title as string) || 'Meal Item',
            amount: formattedAmount,
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
                        <TouchableOpacity style={styles.pillBox} onPress={() => setShowUnitPicker(true)}>
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
                        <View style={[styles.legendDot, { backgroundColor: '#A0A5A0' }]} />
                        <Text style={styles.legendText}>Proposed entry</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={{ gap: 2 }}>
                            <View style={[styles.legendDot, { backgroundColor: '#787D78' }]} />
                            <View style={[styles.legendDot, { backgroundColor: '#F06565' }]} />
                        </View>
                        <Text style={styles.legendText}>Remaining</Text>
                    </View>
                </View>

                {/* ── Add button ── */}
                <TouchableOpacity style={styles.addCircle} onPress={handleAdd}>
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </Pressable>

            {/* ── Dropdown Modal ── */}
            <Modal
                visible={showUnitPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowUnitPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowUnitPicker(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Serving Size</Text>
                        <View style={styles.modalSeparator} />
                        {servingUnits.map((unit, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.modalOption}
                                onPress={() => {
                                    setSelectedUnitIndex(index);
                                    setShowUnitPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    selectedUnitIndex === index && { color: Colors.primary, fontWeight: '700' }
                                ]}>
                                    {unit.label}
                                </Text>
                                {selectedUnitIndex === index && (
                                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
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
        marginTop: 'auto', marginBottom: -25,
        // Optional floating shadow
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textDark,
        textAlign: 'center',
        marginBottom: 15,
    },
    modalSeparator: {
        height: 1,
        backgroundColor: Colors.primary + '33',
        marginBottom: 10,
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    modalOptionText: {
        fontSize: 16,
        color: Colors.textDark,
    },
});
