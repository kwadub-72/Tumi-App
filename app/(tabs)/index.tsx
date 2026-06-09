import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { useLocalSearchParams, router } from 'expo-router';
import { useNotificationStore } from '@/src/shared/stores/NotificationStore';

// Views
import DiaryView from '@/src/features/home/components/DiaryView';
import FollowingView from '@/src/features/home/components/FollowingView';
import TribeView from '@/src/features/home/components/TribeView';

// Components
import TribeSelectionModal from '@/src/features/home/components/TribeSelectionModal';
import TribeScoreboardModal from '@/src/features/tribes/components/TribeScoreboardModal';

type NavTab = 'Following' | 'Diary' | 'Tribe';

import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { useAuthStore } from '@/store/AuthStore';
import { MacroMapInterceptor } from '@/src/features/macromaps/components/MacroMapInterceptor';

export default function HomeScreen() {
    const params = useLocalSearchParams();
    const { init, selectedTribe, selectTribe } = useUserTribeStore();
    const session = useAuthStore(state => state.session);
    const userId = session?.user?.id;
    const { unreadCount, fetchNotifications } = useNotificationStore();

    const [currentTab, setCurrentTab] = useState<NavTab>('Following');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [isTribeModalVisible, setIsTribeModalVisible] = useState(false);
    const [isScoreboardVisible, setIsScoreboardVisible] = useState(false);

    useEffect(() => {
        if (userId) {
            init(userId);
            fetchNotifications();
        }
    }, [userId]);

    useEffect(() => {
        if (params.tab && ['Following', 'Diary', 'Tribe'].includes(params.tab as string)) {
            setCurrentTab(params.tab as NavTab);
        }
    }, [params.tab]);

    // Format date for button (e.g., "Dec 29, 2025")
    const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const isTribeThemeActive = currentTab === 'Tribe' && selectedTribe;
    const dynamicPrimaryColor = currentTab === 'Diary' ? '#DAA520' : '#262525';
    const dateButtonTextColor = currentTab === 'Diary' ? '#262525' : '#EDE8D5';

    useEffect(() => {
        if (currentTab === 'Tribe' && !selectedTribe) {
            setIsTribeModalVisible(true);
        }
    }, [currentTab, selectedTribe]);

    const handleTabPress = (tab: NavTab) => {
        if (tab === 'Tribe' && currentTab === 'Tribe') {
            setIsTribeModalVisible(true);
        } else {
            setCurrentTab(tab);
        }
    };

    const renderContent = () => {
        switch (currentTab) {
            case 'Following': return <FollowingView selectedDate={selectedDate} />;
            case 'Diary': return <DiaryView selectedDate={selectedDate} />;
            case 'Tribe': return <TribeView selectedDate={selectedDate} />;
            default: return <FollowingView selectedDate={selectedDate} />;
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
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <MacroMapInterceptor />
            {/* Top Navigation */}
            <View style={styles.topNavWrapper}>
                <View style={styles.headerRow}>
                    <View style={styles.headerSpacer} />
                    <View style={styles.tabsContainer}>
                        {(['Following', 'Diary', 'Tribe'] as NavTab[]).map((tab) => {
                            const isActive = currentTab === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[
                                        styles.tabButton,
                                        isActive && { backgroundColor: '#DAA520' }
                                    ]}
                                    onPress={() => handleTabPress(tab)}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        isActive ? { color: '#262525' } : { color: '#EDE8D5' }
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity 
                        style={styles.bellButton} 
                        onPress={() => router.push('/notifications')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="notifications-outline" size={24} color={Colors.theme.softWhite} />
                        {unreadCount > 0 && (
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                {currentTab === 'Diary' && (
                    <TouchableOpacity
                        style={[
                            styles.dateButton, 
                            { backgroundColor: dynamicPrimaryColor, borderWidth: currentTab === 'Diary' ? 0 : 1, borderColor: '#EDE8D5' }
                        ]}
                        onPress={() => setIsCalendarVisible(true)}
                    >
                        <Text style={[styles.dateButtonText, { color: dateButtonTextColor }]}>{formattedDate}</Text>
                    </TouchableOpacity>
                )}

                {currentTab === 'Tribe' && selectedTribe && (
                    <TouchableOpacity
                        style={[
                            styles.dateButton, 
                            { backgroundColor: '#262525', borderWidth: 1, borderColor: '#DAA520' }
                        ]}
                        onPress={() => router.push(`/tribe/${selectedTribe.id}` as any)}
                    >
                        <Text style={[styles.dateButtonText, { color: '#DAA520' }]}>{selectedTribe.name}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Content View */}
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>

            <TribeSelectionModal
                visible={isTribeModalVisible}
                onClose={() => setIsTribeModalVisible(false)}
            />

            <TribeScoreboardModal
                visible={isScoreboardVisible}
                onClose={() => setIsScoreboardVisible(false)}
                tribeId={selectedTribe?.id}
                tribeName={selectedTribe?.name}
                tribe={selectedTribe}
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
            {/* Scoreboard FAB floating at the bottom right */}
            {currentTab === 'Tribe' && selectedTribe && (
                <TouchableOpacity
                    style={styles.scoreboardTriggerButton}
                    onPress={() => setIsScoreboardVisible(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="podium" size={24} color="white" />
                </TouchableOpacity>
            )}
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 16,
    },
    headerSpacer: {
        width: 40,
    },
    bellButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badgeContainer: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: Colors.theme.burntSienna,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.topNavBackground,
        borderRadius: 25,
        padding: 5,
        flex: 1,
        marginHorizontal: 12,
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
    scoreboardTriggerButton: {
        position: 'absolute',
        right: 24,
        bottom: 24, // Floating beautifully above the feed list!
        width: 56, // Enforcing a larger, touch-friendly, standard FAB size
        height: 56,
        borderRadius: 28,
        backgroundColor: '#262525', // Charcoal background matching requested #262525
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1.5,
        borderColor: '#DAA520', // Harvest Gold outline
    },
});
