import React, { useRef, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    PanResponder,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';

interface CalendarModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectDate: (date: Date) => void;
    initialDate?: Date;
}

type RolodexTarget = 'month' | 'year' | null;

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_H = 44; // Height of each rolodex item

/** Clamps a date to the 1st so month arithmetic never overflows */
function safeMonth(base: Date, delta: number): Date {
    const d = new Date(base);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    return d;
}

export function CalendarModal({ visible, onClose, onSelectDate, initialDate }: CalendarModalProps) {
    const today = new Date();
    const [viewDate, setViewDate] = useState<Date>(initialDate || today);
    const [rolodex, setRolodex] = useState<RolodexTarget>(null);

    // ── Swipe to change month ──────────────────────────────────────────────
    const swipeX = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 40,
            onPanResponderMove: Animated.event([null, { dx: swipeX }], { useNativeDriver: false }),
            onPanResponderRelease: (_, g) => {
                if (g.dx < -50) {
                    // swipe left → next month
                    Animated.timing(swipeX, { toValue: -300, duration: 150, useNativeDriver: false }).start(() => {
                        setViewDate(prev => safeMonth(prev, 1));
                        swipeX.setValue(0);
                    });
                } else if (g.dx > 50) {
                    // swipe right → prev month
                    Animated.timing(swipeX, { toValue: 300, duration: 150, useNativeDriver: false }).start(() => {
                        setViewDate(prev => safeMonth(prev, -1));
                        swipeX.setValue(0);
                    });
                } else {
                    Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
                }
            },
        })
    ).current;

    // ── Calendar day grid ─────────────────────────────────────────────────
    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days: (Date | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const todayStr = today.toISOString().split('T')[0];
    const calendarHolders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // ── Year list for rolodex ─────────────────────────────────────────────
    const currentYear = viewDate.getFullYear();
    const yearList = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i);

    // ── Rolodex scroll refs ──────────────────────────────────────────────
    const monthScrollRef = useRef<ScrollView>(null);
    const yearScrollRef  = useRef<ScrollView>(null);

    const openRolodex = (target: RolodexTarget) => {
        setRolodex(target);
        // Scroll to current selection after a tick so the ScrollView is mounted
        setTimeout(() => {
            if (target === 'month') {
                monthScrollRef.current?.scrollTo({
                    y: viewDate.getMonth() * ITEM_H,
                    animated: false,
                });
            } else if (target === 'year') {
                const idx = yearList.indexOf(viewDate.getFullYear());
                yearScrollRef.current?.scrollTo({
                    y: Math.max(0, idx - 2) * ITEM_H,
                    animated: false,
                });
            }
        }, 50);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={styles.calendarCard}>
                    {/* ── Header ── */}
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity
                            onPress={() => setViewDate(prev => safeMonth(prev, -1))}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="chevron-back" size={20} color="white" />
                        </TouchableOpacity>

                        {/* Tappable month / year → opens rolodex */}
                        <View style={styles.headerCenter}>
                            <TouchableOpacity onPress={() => openRolodex('month')} style={styles.headerPill}>
                                <Text style={styles.calendarMonthText}>
                                    {MONTHS[viewDate.getMonth()]}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openRolodex('year')} style={styles.headerPill}>
                                <Text style={styles.calendarYearText}>
                                    {viewDate.getFullYear()}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => setViewDate(prev => safeMonth(prev, 1))}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="chevron-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* ── Day grid (swipeable) ── */}
                    <Animated.View
                        style={{ transform: [{ translateX: swipeX }] }}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.calendarGrid}>
                            {calendarHolders.map((h, idx) => (
                                <Text key={idx} style={styles.dayHeader}>{h}</Text>
                            ))}
                            {generateCalendarDays().map((day, i) => {
                                if (!day) return <View key={i} style={styles.dayButton} />;
                                const dayStr = day.toISOString().split('T')[0];
                                const isToday = dayStr === todayStr;
                                return (
                                    <TouchableOpacity
                                        key={dayStr}
                                        style={[styles.dayButton, isToday && styles.dayButtonToday]}
                                        onPress={() => { onSelectDate(day); onClose(); }}
                                    >
                                        <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                                            {day.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>

                    {/* ── Today button ── */}
                    <TouchableOpacity
                        style={styles.todayButton}
                        onPress={() => {
                            setViewDate(today);
                            onSelectDate(today);
                            onClose();
                        }}
                    >
                        <Text style={styles.todayButtonText}>Today</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>

            {/* ── Month rolodex overlay ── */}
            {rolodex === 'month' && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setRolodex(null)}>
                    <Pressable style={styles.rolodexOverlay} onPress={() => setRolodex(null)}>
                        <Pressable style={styles.rolodexCard}>
                            <Text style={styles.rolodexTitle}>Select Month</Text>
                            <ScrollView
                                ref={monthScrollRef}
                                showsVerticalScrollIndicator={false}
                                style={{ maxHeight: ITEM_H * 5 }}
                            >
                                {MONTHS.map((m, idx) => {
                                    const selected = idx === viewDate.getMonth();
                                    return (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.rolodexItem, selected && styles.rolodexItemSelected]}
                                            onPress={() => {
                                                const d = new Date(viewDate);
                                                d.setDate(1);
                                                d.setMonth(idx);
                                                setViewDate(d);
                                                setRolodex(null);
                                            }}
                                        >
                                            <Text style={[styles.rolodexItemText, selected && styles.rolodexItemTextSelected]}>
                                                {m}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}

            {/* ── Year rolodex overlay ── */}
            {rolodex === 'year' && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setRolodex(null)}>
                    <Pressable style={styles.rolodexOverlay} onPress={() => setRolodex(null)}>
                        <Pressable style={styles.rolodexCard}>
                            <Text style={styles.rolodexTitle}>Select Year</Text>
                            <ScrollView
                                ref={yearScrollRef}
                                showsVerticalScrollIndicator={false}
                                style={{ maxHeight: ITEM_H * 5 }}
                            >
                                {yearList.map(yr => {
                                    const selected = yr === viewDate.getFullYear();
                                    return (
                                        <TouchableOpacity
                                            key={yr}
                                            style={[styles.rolodexItem, selected && styles.rolodexItemSelected]}
                                            onPress={() => {
                                                const d = new Date(viewDate);
                                                d.setDate(1);
                                                d.setFullYear(yr);
                                                setViewDate(d);
                                                setRolodex(null);
                                            }}
                                        >
                                            <Text style={[styles.rolodexItemText, selected && styles.rolodexItemTextSelected]}>
                                                {yr}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    // ── Modal shell ──────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarCard: {
        width: '85%',
        backgroundColor: Colors.primary,
        borderRadius: 30,
        padding: 20,
    },
    // ── Header ───────────────────────────────────────────────────────────
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    calendarMonthText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
    calendarYearText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 17,
        fontWeight: '600',
    },
    // ── Grid ─────────────────────────────────────────────────────────────
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: `${100 / 7}%`,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    dayButton: {
        width: `${100 / 7}%`,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonToday: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    dayText: {
        color: 'white',
        fontSize: 14,
    },
    dayTextToday: {
        fontWeight: 'bold',
    },
    // ── Today button ─────────────────────────────────────────────────────
    todayButton: {
        marginTop: 14,
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    todayButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    // ── Rolodex ──────────────────────────────────────────────────────────
    rolodexOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rolodexCard: {
        width: '65%',
        backgroundColor: Colors.primary,
        borderRadius: 22,
        padding: 16,
        alignItems: 'stretch',
    },
    rolodexTitle: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rolodexItem: {
        height: ITEM_H,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    rolodexItemSelected: {
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    rolodexItemText: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 16,
    },
    rolodexItemTextSelected: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
