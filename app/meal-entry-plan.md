import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealLogStore } from '../store/MealLogStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UNITS = ['oz', 'g', 'kg', 'lb', 'ml'];

// Conversion factors to OZ (base unit)
const CONVERSION_TO_OZ: Record<string, number> = {
    oz: 1,
    g: 0.035274,
    kg: 35.274,
    lb: 16,
    ml: 0.033814, // Assuming water density for calculation
};

// Base serving: 1 oz = 300 cals, 25 P, 25 C, 10 F
const BASE_OZ_MACROS = {
    cals: 300,
    p: 25,
    c: 25,
    f: 10
};

// Initial consumed stats
const INITIAL_STATS = {
    p_consumed: 100,
    p_goal: 200,
    c_consumed: 100,
    c_goal: 200,
    f_consumed: 15,
    f_goal: 45,
};

// Derived initial calories (goal estimate)
const GOAL_CAL = INITIAL_STATS.p_goal * 4 + INITIAL_STATS.c_goal * 4 + INITIAL_STATS.f_goal * 9;
const CONSUMED_CAL = INITIAL_STATS.p_consumed * 4 + INITIAL_STATS.c_consumed * 4 + INITIAL_STATS.f_consumed * 9;

export default function MealEntryScreen() {
    const { id, title, description } = useLocalSearchParams();
    
    const [unit, setUnit] = useState('oz');
    const [amount, setAmount] = useState('1');
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [isEditingAmount, setIsEditingAmount] = useState(false);

    const amountValue = parseFloat(amount) || 0;
    
    // Scale amount to OZ for logic consistency
    const amountInOz = amountValue * CONVERSION_TO_OZ[unit];

    // Calculate proposed macros based on scaled OZ
    const proposed = {
        cals: Math.round(BASE_OZ_MACROS.cals * amountInOz),
        p: Math.round(BASE_OZ_MACROS.p * amountInOz),
        c: Math.round(BASE_OZ_MACROS.c * amountInOz),
        f: Math.round(BASE_OZ_MACROS.f * amountInOz)
    };

    const handleAdd = () => {
        MealLogStore.addItem({
            id: Date.now().toString(),
            name: (title as string) || 'Meal Item',
            amount: `${amount} ${unit}`,
            cals: proposed.cals,
            macros: {
                p: proposed.p,
                c: proposed.c,
                f: proposed.f
            }
        });
        router.back();
    };

    const MacroSlider = ({ label, icon, consumed, proposed, goal, color }: any) => {
        const remaining = Math.max(0, goal - (consumed + proposed));
        const overflow = Math.max(0, (consumed + proposed) - goal);
        
        // Use the larger of goal or total consumed+proposed for scaling
        const totalForScale = Math.max(goal, consumed + proposed);
        
        const consumedWidth = (consumed / totalForScale) * 100;
        const proposedWidth = (proposed / totalForScale) * 100;
        const remainingWidth = (remaining / totalForScale) * 100;
        const overflowWidth = (overflow / totalForScale) * 100;

        const isOverflowing = overflow > 0;

        return (
            <View style={styles.macroSliderRow}>
                <View style={styles.macroIconContainer}>
                    <MaterialCommunityIcons name={icon} size={28} color={color || "white"} />
                </View>
                <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                        {/* Consumed */}
                        <View style={[styles.sliderSegment, { width: `${consumedWidth}%`, backgroundColor: color || 'white' }]}>
                            <Text style={[styles.sliderText, { color: color ? '#000' : '#444' }]}>{consumed}</Text>
                        </View>
                        {/* Proposed */}
                        <View style={[
                            styles.sliderSegment, 
                            { 
                                width: `${proposedWidth}%`, 
                                backgroundColor: isOverflowing ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255,255,255,0.3)' 
                            }
                        ]}>
                            <Text style={styles.sliderText}>{proposed}</Text>
                        </View>
                        {/* Remaining */}
                        {remaining > 0 && (
                            <View style={[styles.sliderSegment, { width: `${remainingWidth}%`, backgroundColor: '#222' }]}>
                                <Text style={styles.sliderText}>{remaining}</Text>
                        </View>
                        )}
                        {/* Overflow Warning */}
                        {isOverflowing && (
                            <View style={[styles.sliderSegment, { width: `${overflowWidth}%`, backgroundColor: '#EF4444' }]}>
                                <Text style={styles.sliderText}>+{overflow}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color="#EF4444" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{description || 'Homemade'}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="fire" size={32} color="#EF4444" />
                        <Text style={styles.summaryValue}>{proposed.cals} cals</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="food-drumstick" size={20} color="white" />
                        <Text style={styles.summaryValueSmall}>{proposed.p}g</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="barley" size={20} color="white" />
                        <Text style={styles.summaryValueSmall}>{proposed.c}g</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="water" size={20} color="white" />
                        <Text style={styles.summaryValueSmall}>{proposed.f}g</Text>
                    </View>
                </View>

                <View style={styles.inputsRow}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Serving size</Text>
                        <TouchableOpacity 
                            style={styles.pillBox}
                            onPress={() => setShowUnitPicker(true)}
                        >
                            <Text style={styles.pillText}>1 {unit}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Amount</Text>
                        <View style={styles.pillBox}>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                onFocus={() => setIsEditingAmount(true)}
                                onBlur={() => setIsEditingAmount(false)}
                                placeholderTextColor="#666"
                            />
                            <Text style={styles.unitSuffix}>{unit}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.chartsContainer}>
                    <MacroSlider 
                        icon="fire" 
                        label="Calories" 
                        consumed={CONSUMED_CAL} 
                        proposed={proposed.cals} 
                        goal={GOAL_CAL} 
                        color="#EF4444" 
                    />
                    <MacroSlider 
                        icon="food-drumstick" 
                        label="Protein" 
                        consumed={INITIAL_STATS.p_consumed} 
                        proposed={proposed.p} 
                        goal={INITIAL_STATS.p_goal} 
                    />
                    <MacroSlider 
                        icon="barley" 
                        label="Carbs" 
                        consumed={INITIAL_STATS.c_consumed} 
                        proposed={proposed.c} 
                        goal={INITIAL_STATS.c_goal} 
                    />
                    <MacroSlider 
                        icon="water" 
                        label="Fat" 
                        consumed={INITIAL_STATS.f_consumed} 
                        proposed={proposed.f} 
                        goal={INITIAL_STATS.f_goal} 
                    />
                </View>

                <TouchableOpacity style={styles.addCircle} onPress={handleAdd}>
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </Pressable>

            <Modal
                visible={showUnitPicker}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalCloseArea} 
                        onPress={() => setShowUnitPicker(false)} 
                    />
                    <View style={styles.pickerContainer}>
                        <Text style={styles.pickerTitle}>Select Unit</Text>
                        {UNITS.map(u => (
                            <TouchableOpacity 
                                key={u} 
                                style={styles.unitOption}
                                onPress={() => {
                                    setUnit(u);
                                    setShowUnitPicker(false);
                                }}
                            >
                                <Text style={[styles.unitText, unit === u && { color: '#EF4444' }]}>{u}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    titleContainer: {
        marginLeft: 20,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#666',
        fontSize: 20,
        fontStyle: 'italic',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        marginBottom: 30,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryValue: {
        color: 'white',
        fontSize: 22,
        fontWeight: '500',
    },
    summaryValueSmall: {
        color: 'white',
        fontSize: 18,
    },
    inputsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    inputGroup: {
        width: '45%',
    },
    inputLabel: {
        color: '#666',
        fontSize: 14,
        marginBottom: 10,
        marginLeft: 10,
    },
    pillBox: {
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#EF4444',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
        paddingHorizontal: 15,
    },
    pillText: {
        color: 'white',
        fontSize: 16,
    },
    amountInput: {
        color: 'white',
        fontSize: 16,
        textAlign: 'right',
        flex: 1,
        paddingRight: 4,
    },
    unitSuffix: {
        color: 'white',
        fontSize: 16,
        flex: 1,
        paddingLeft: 4,
    },
    chartsContainer: {
        gap: 25,
    },
    macroSliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    macroIconContainer: {
        width: 40,
        alignItems: 'center',
    },
    sliderContainer: {
        flex: 1,
        marginLeft: 15,
    },
    sliderTrack: {
        height: 40,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    sliderSegment: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sliderText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    addCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: 'auto',
        marginBottom: 30,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalCloseArea: {
        flex: 1,
    },
    pickerContainer: {
        backgroundColor: '#111',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 30,
        paddingBottom: 50,
    },
    pickerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    unitOption: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    unitText: {
        color: 'white',
        fontSize: 20,
    },
});
