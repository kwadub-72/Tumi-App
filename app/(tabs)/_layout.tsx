import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '../../src/shared/theme/Colors';
import { WeightStore } from '../../store/WeightStore';

export default function TabLayout() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
    const [tempWeight, setTempWeight] = useState('253.1');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewDate, setViewDate] = useState(new Date()); // For calendar navigation

    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Padding for start of month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const calendarHolders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    const showFAB = pathname !== '/profile' && pathname !== '/add';

    const handleSaveWeight = async () => {
        // If empty, delete the entry
        if (tempWeight.trim() === '') {
            await WeightStore.deleteWeight(selectedDate);
            setIsWeightModalVisible(false);
            setIsMenuOpen(false);
            return;
        }

        const weightNum = parseFloat(tempWeight);
        const TARGET_WEIGHT = 250;

        if (!isNaN(weightNum)) {
            if (Math.abs(weightNum - TARGET_WEIGHT) > 50) {
                Alert.alert('Error', 'Extreme weight fluctuation, consult medical professional immediately');
                return;
            }

            await WeightStore.addWeight({
                date: selectedDate,
                weight: weightNum,
                timestamp: Date.now(),
            });
            setIsWeightModalVisible(false);
            setIsMenuOpen(false);
        } else {
            Alert.alert('Error', 'Please enter a valid weight');
        }
    };

    // Load existing weight when date changes
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
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: Colors.tabBar,
                        borderTopWidth: 1, // Assuming a border width of 1 to make borderTopColor visible
                        borderTopColor: '#333',
                        height: 70,
                        paddingBottom: 10,
                        paddingTop: 10,
                    },
                    tabBarShowLabel: false,
                    tabBarActiveTintColor: Colors.tabIconSelected,
                    tabBarInactiveTintColor: Colors.tabIconDefault,
                }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? "home" : "home-outline"} size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="search"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name="search" size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="activity"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons name="finance" size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="add"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons name={focused ? "fire" : "fire"} size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? "person" : "person-outline"} size={28} color={color} />
                        ),
                    }}
                />
            </Tabs>

            {showFAB && (
                <View style={styles.fabContainer}>
                    {isMenuOpen && (
                        <>
                            {/* Scale Button */}
                            <TouchableOpacity
                                style={[styles.subFab, styles.scaleFab]}
                                onPress={() => {
                                    setIsWeightModalVisible(true);
                                }}
                            >
                                <MaterialCommunityIcons name="scale-bathroom" size={40} color="white" />
                            </TouchableOpacity>

                            {/* Tumi Button */}
                            <TouchableOpacity
                                style={[styles.subFab, styles.tumiFab]}
                                onPress={() => {
                                    setIsMenuOpen(false);
                                    router.push('/(tabs)/add');
                                }}
                            >
                                <MaterialCommunityIcons name="fire" size={45} color="white" />
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.fab, isMenuOpen && styles.fabOpen]}
                        onPress={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <Ionicons name={isMenuOpen ? "close" : "add"} size={isMenuOpen ? 30 : 40} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Weight Input Modal */}
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
                        <Text style={styles.adjustmentTitle}>Update Weight</Text>
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
                                {calendarHolders.map((h, idx) => <Text key={`${h}-${idx}`} style={styles.dayHeader}>{h}</Text>)}
                                {generateCalendarDays().map((day, i) => {
                                    if (!day) return <View key={`empty-${i}`} style={styles.dayButton} />;
                                    const dateStr = day.toISOString().split('T')[0];
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                    return (
                                        <TouchableOpacity
                                            key={dateStr}
                                            style={[
                                                styles.dayButton,
                                                isSelected && styles.dayButtonActive,
                                                isToday && !isSelected && styles.dayButtonToday
                                            ]}
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
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.theme.sage,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    fabOpen: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    subFab: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.theme.sage,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    scaleFab: {
        bottom: 80, // Positioned above
    },
    tumiFab: {
        right: 80, // Positioned to the left
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
    },
    adjustmentCard: {
        width: '85%',
        backgroundColor: '#111',
        borderRadius: 30,
        padding: 25,
        borderWidth: 1,
        borderColor: Colors.primary,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
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
        backgroundColor: '#000',
        borderRadius: 15,
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 20,
    },
    logWeightButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    adjustmentActions: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    adjustCancelBtn: {
        flex: 1,
        height: 45,
        backgroundColor: '#222',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustSaveBtn: {
        flex: 1,
        height: 45,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    sectionLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
        marginBottom: 15,
        marginTop: 5,
    },
    calendarContainer: {
        width: '100%',
        backgroundColor: '#000',
        borderRadius: 15,
        padding: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 10,
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
        color: '#444',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    dayButton: {
        width: `${100 / 7}%`,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        borderRadius: 8,
    },
    dayButtonActive: {
        backgroundColor: Colors.primary,
    },
    dayButtonToday: {
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    dayText: {
        color: 'white',
        fontSize: 14,
    },
    dayTextActive: {
        fontWeight: 'bold',
    },
});
