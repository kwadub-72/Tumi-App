import React, { useEffect, useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    RefreshControl,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/shared/theme/Colors';
import { useNotificationStore, Notification } from '@/src/shared/stores/NotificationStore';

export default function NotificationScreen() {
    const router = useRouter();
    const { 
        notifications, 
        unreadCount, 
        loading, 
        fetchNotifications, 
        markAsRead, 
        markAllAsRead 
    } = useNotificationStore();

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleNotificationPress = async (item: Notification) => {
        if (!item.is_read) {
            await markAsRead(item.id);
        }

        // Parse JSON payload data for redirect routes
        const routeData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
        if (routeData) {
            if (routeData.postId) {
                router.push(`/post/${routeData.postId}`);
            } else if (routeData.tribeId) {
                router.push(`/tribe/${routeData.tribeId}`);
            } else if (routeData.handle) {
                router.push(`/user/${routeData.handle}`);
            }
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const now = new Date();
        const created = new Date(dateStr);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return `${diffDays}d ago`;
    };

    const resolveNotificationIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'like':
                return { name: 'heart', color: Colors.theme.burntSienna };
            case 'comment':
                return { name: 'chatbubble-ellipses', color: Colors.theme.harvestGold };
            case 'subscribe':
            case 'map_subscribe':
                return { name: 'map', color: '#657F3B' };
            case 'follow':
                return { name: 'people', color: Colors.theme.dust };
            default:
                return { name: 'notifications', color: Colors.theme.harvestGold };
        }
    };

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        const iconConfig = resolveNotificationIcon(item.type);
        return (
            <TouchableOpacity 
                style={[
                    styles.notificationCard, 
                    !item.is_read && styles.unreadCard
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.75}
            >
                {/* Left Side: Category Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
                </View>

                {/* Center: Message Details */}
                <View style={styles.messageContainer}>
                    <Text style={[
                        styles.notificationTitle, 
                        !item.is_read && styles.unreadText
                    ]}>
                        {item.title}
                    </Text>
                    <Text style={styles.notificationBody} numberOfLines={2}>
                        {item.body}
                    </Text>
                    <Text style={styles.timestamp}>
                        {formatTimeAgo(item.created_at)}
                    </Text>
                </View>

                {/* Right Side: Unread Dot */}
                {!item.is_read && (
                    <View style={styles.unreadDot} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header Row */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={26} color={Colors.theme.softWhite} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Notifications</Text>

                {unreadCount > 0 ? (
                    <TouchableOpacity 
                        style={styles.markAllButton}
                        onPress={() => markAllAsRead()}
                    >
                        <Text style={styles.markAllText}>Clear All</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {/* List Body */}
            {loading && notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNotificationItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                            tintColor={Colors.theme.harvestGold} 
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={48} color={Colors.theme.dust + '55'} />
                            <Text style={styles.emptyTitle}>All caught up!</Text>
                            <Text style={styles.emptySubtitle}>You have no notifications right now.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        color: Colors.theme.softWhite,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    markAllButton: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    markAllText: {
        color: Colors.theme.harvestGold,
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerSpacer: {
        width: 40,
    },
    listContainer: {
        paddingVertical: 8,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        alignItems: 'center',
    },
    unreadCard: {
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
        borderColor: 'rgba(218, 165, 32, 0.15)',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    messageContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    notificationTitle: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '500',
    },
    unreadText: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
    },
    notificationBody: {
        color: Colors.theme.dust,
        opacity: 0.8,
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
    timestamp: {
        color: Colors.theme.dust,
        opacity: 0.5,
        fontSize: 11,
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.theme.harvestGold,
        marginLeft: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 120,
    },
    emptyTitle: {
        color: Colors.theme.softWhite,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubtitle: {
        color: Colors.theme.dust,
        opacity: 0.6,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 40,
    },
});
