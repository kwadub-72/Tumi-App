import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';

// Views
import DiaryView from '@/src/features/home/components/DiaryView';
import FollowingView from '@/src/features/home/components/FollowingView';
import TribeView from '@/src/features/home/components/TribeView';

// Components
import TribeSelectionModal from '@/src/features/home/components/TribeSelectionModal';

type NavTab = 'Following' | 'Diary' | 'Tribe';

export default function HomeScreen() {
    const [currentTab, setCurrentTab] = useState<NavTab>('Following');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [isTribeModalVisible, setIsTribeModalVisible] = useState(false);

    // Format date for button (e.g., "Dec 29, 2025")
    const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleTabPress = (tab: NavTab) => {
        if (tab === 'Tribe' && currentTab === 'Tribe') {
            setIsTribeModalVisible(true);
        } else {
            setCurrentTab(tab);
        }
    };

    const renderContent = () => {
        switch (currentTab) {
            case 'Following': return <FollowingView />;
            case 'Diary': return <DiaryView />;
            case 'Tribe': return <TribeView />;
            default: return <FollowingView />;
        }
    };

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

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Navigation */}
            <View style={styles.topNavWrapper}>
                <View style={styles.tabsContainer}>
                    {(['Following', 'Diary', 'Tribe'] as NavTab[]).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tabButton,
                                currentTab === tab && styles.tabButtonActive
                            ]}
                            onPress={() => handleTabPress(tab)}
                        >
                            <Text style={[
                                styles.tabText,
                                currentTab === tab && styles.tabTextActive
                            ]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setIsCalendarVisible(true)}
                >
                    <Text style={styles.dateButtonText}>{formattedDate}</Text>
                </TouchableOpacity>
            </View>

            {/* Content View */}
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>

            <TribeSelectionModal
                visible={isTribeModalVisible}
                onClose={() => setIsTribeModalVisible(false)}
            />

            {/* Calendar Modal */}
            <Modal
                visible={isCalendarVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsCalendarVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarVisible(false)}>
                    <Pressable style={styles.calendarCard}>
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
                                const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;
                                return (
                                    <TouchableOpacity
                                        key={dateStr}
                                        style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                                        onPress={() => {
                                            setSelectedDate(day);
                                            setIsCalendarVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day.getDate()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    topNavWrapper: {
        alignItems: 'center',
        paddingTop: 15,
        paddingBottom: 5,
        backgroundColor: Colors.background,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.topNavBackground,
        borderRadius: 25,
        padding: 5,
        width: '80%',
        justifyContent: 'space-between',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabButtonActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6E7A66', // Sage dark muted
    },
    tabTextActive: {
        color: 'white',
    },
    dateButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 15,
        marginTop: 10,
    },
    dateButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    contentContainer: {
        flex: 1,
    },
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
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    calendarMonthText: {
        color: 'white',
        fontSize: 18,
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
        fontWeight: 'bold',
        marginBottom: 10,
    },
    dayButton: {
        width: `${100 / 7}%`,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonActive: {
        backgroundColor: 'white',
        borderRadius: 10,
    },
    dayText: {
        color: 'white',
        fontSize: 14,
    },
    dayTextActive: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});
