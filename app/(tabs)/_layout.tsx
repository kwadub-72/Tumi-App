import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '../../src/shared/theme/Colors';
import { WeightStore } from '../../store/WeightStore';
import { useUserStore } from '../../store/UserStore';

export default function TabLayout() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
    const [tempWeight, setTempWeight] = useState('253.1');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewDate, setViewDate] = useState(new Date());

    const { units } = useUserStore();

    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const calendarHolders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    const handleSaveWeight = async () => {
        if (tempWeight.trim() === '') {
            await WeightStore.deleteWeight(selectedDate);
            setIsWeightModalVisible(false);
            setIsMenuOpen(false);
            return;
        }

        const weightNum = parseFloat(tempWeight);
        // Basic range check (lbs or kgs)
        const isImperial = units === 'imperial';
        const minWeight = isImperial ? 50 : 20;
        const maxWeight = isImperial ? 800 : 400;

        if (!isNaN(weightNum)) {
            if (weightNum < minWeight || weightNum > maxWeight) {
                Alert.alert('Error', 'Please enter a realistic weight');
                return;
            }

            await WeightStore.addWeight({
                date: selectedDate,
                weight: weightNum,
                timestamp: Date.now(),
            });

            // Update bio if it's the current date
            const todayStr = new Date().toISOString().split('T')[0];
            if (selectedDate === todayStr) {
                useUserStore.getState().setProfile({ weight: weightNum });
            }

            setIsWeightModalVisible(false);
            setIsMenuOpen(false);
        } else {
            Alert.alert('Error', 'Please enter a valid weight');
        }
    };

    useEffect(() => {
        if (isWeightModalVisible) {
            const loadCurrent = async () => {
                const weights = await WeightStore.loadWeights();
                const current = weights.find(w => w.date === selectedDate);
                setTempWeight(current ? current.weight.toString() : '');
            };
            loadCurrent();
        }
    }, [selectedDate, isWeightModalVisible]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: Colors.tabBar,
                        borderTopWidth: 0,
                        height: 90,
                        paddingBottom: 25,
                        paddingTop: 10,
                        elevation: 0,
                    },
                    tabBarShowLabel: false,
                    tabBarActiveTintColor: Colors.white,
                    tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
                }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons name="home" size={36} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="search"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name="search" size={32} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="add"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <View style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: Colors.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginTop: -30,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 5,
                            }}>
                                <Ionicons name="add" size={40} color="white" />
                            </View>
                        ),
                    }}
                    listeners={() => ({
                        tabPress: (e) => {
                            e.preventDefault();
                            setIsMenuOpen(!isMenuOpen);
                        }
                    })}
                />
                <Tabs.Screen
                    name="activity"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name="stats-chart" size={32} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name="person" size={32} color={color} />
                        ),
                    }}
                />
            </Tabs>

            {isMenuOpen && (
                <Pressable style={styles.menuOverlay} onPress={() => setIsMenuOpen(false)}>
                    <View style={styles.fabContainer}>
                        {/* Workout/Run Button */}
                        <TouchableOpacity
                            style={[styles.subFab, styles.workoutFab]}
                            onPress={() => {
                                setIsMenuOpen(false);
                                router.push('/add-exercise');
                            }}
                        >
                            <MaterialCommunityIcons name="run" size={40} color="white" />
                        </TouchableOpacity>

                        {/* Fire/Food Button */}
                        <TouchableOpacity
                            style={[styles.subFab, styles.tumiFab]}
                            onPress={() => {
                                setIsMenuOpen(false);
                                router.push('/(tabs)/add');
                            }}
                        >
                            <MaterialCommunityIcons name="fire" size={45} color="white" />
                        </TouchableOpacity>

                        {/* Macro Update Button (New) */}
                        <TouchableOpacity
                            style={[styles.subFab, styles.macroFab]}
                            onPress={() => {
                                setIsMenuOpen(false);
                                router.push('/macro-update');
                            }}
                        >
                            <View>
                                <MaterialCommunityIcons name="chart-areaspline-variant" size={32} color="white" />
                                <MaterialCommunityIcons
                                    name="plus"
                                    size={16}
                                    color="white"
                                    style={{ position: 'absolute', top: -4, right: -4 }}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Scale Button */}
                        <TouchableOpacity
                            style={[styles.subFab, styles.scaleFab]}
                            onPress={() => setIsWeightModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="scale-bathroom" size={40} color="white" />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            )}

            <Modal
                visible={isWeightModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsWeightModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setIsWeightModalVisible(false)}
                >
                    <Pressable
                        style={styles.adjustmentCard}
                        onPress={() => Keyboard.dismiss()}
                    >
                        <Text style={styles.adjustmentTitle}>Update Weight ({units === 'imperial' ? 'lbs' : 'kg'})</Text>
                        <TextInput
                            style={styles.adjustmentInput}
                            value={tempWeight}
                            onChangeText={setTempWeight}
                            keyboardType="numeric"
                            autoFocus
                            selectTextOnFocus
                            placeholderTextColor="#666"
                        />
                        <Text style={styles.sectionLabel}>Select Date</Text>
                        <View style={styles.calendarContainer}>
                            <View style={styles.calendarHeader}>
                                <TouchableOpacity onPress={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() - 1);
                                    setViewDate(d);
                                }}>
                                    <Ionicons name="chevron-back" size={20} color="white" />
                                </TouchableOpacity>
                                <Text style={styles.calendarMonthText}>{monthName} {viewDate.getFullYear()}</Text>
                                <TouchableOpacity onPress={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() + 1);
                                    setViewDate(d);
                                }}>
                                    <Ionicons name="chevron-forward" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.calendarGrid}>
                                {calendarHolders.map((h, idx) => <Text key={idx} style={styles.dayHeader}>{h}</Text>)}
                                {generateCalendarDays().map((day, i) => {
                                    if (!day) return <View key={i} style={styles.dayButton} />;
                                    const dateStr = day.toISOString().split('T')[0];
                                    const isSelected = selectedDate === dateStr;
                                    return (
                                        <TouchableOpacity
                                            key={dateStr}
                                            style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                                            onPress={() => setSelectedDate(dateStr)}
                                        >
                                            <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                                                {day.getDate()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={styles.adjustmentActions}>
                            <TouchableOpacity
                                style={styles.adjustCancelBtn}
                                onPress={() => setIsWeightModalVisible(false)}
                            >
                                <Text style={styles.adjustBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.adjustSaveBtn}
                                onPress={handleSaveWeight}
                            >
                                <Text style={styles.adjustBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    menuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 120,
        alignItems: 'center',
        justifyContent: 'center',
        left: '50%',
        marginLeft: -40,
    },
    subFab: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    scaleFab: {
        bottom: 20,
        left: -115,
    },
    macroFab: {
        bottom: 50,
        left: -40,
    },
    tumiFab: {
        bottom: 50,
        left: 40,
    },
    workoutFab: {
        bottom: 20,
        left: 115,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustmentCard: {
        width: '85%',
        backgroundColor: '#2D3A26',
        borderRadius: 30,
        padding: 25,
        alignItems: 'center',
    },
    adjustmentTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    adjustmentInput: {
        width: '100%',
        height: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 15,
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    adjustmentActions: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    adjustCancelBtn: {
        flex: 1,
        height: 45,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustSaveBtn: {
        flex: 1,
        height: 45,
        backgroundColor: Colors.white,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustBtnText: {
        color: 'black',
        fontWeight: 'bold',
    },
    sectionLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    calendarContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        padding: 10,
        marginBottom: 20,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    calendarMonthText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: `${100 / 7}%`,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginBottom: 10,
    },
    dayButton: {
        width: `${100 / 7}%`,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonActive: {
        backgroundColor: Colors.white,
        borderRadius: 8,
    },
    dayText: {
        color: 'white',
    },
    dayTextActive: {
        color: 'black',
        fontWeight: 'bold',
    },
});
