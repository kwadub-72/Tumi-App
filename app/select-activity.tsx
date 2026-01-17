import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { ACTIVITIES, ActivityOption } from '@/src/shared/constants/Activities';
import { useUserStore } from '@/store/UserStore';

export default function SelectActivityScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredActivities = ACTIVITIES.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (activity: ActivityOption) => {
        userInfo.setProfile({
            activity: activity.name,
            activityIcon: activity.icon
        });
        router.back();
    };

    const renderItem = ({ item }: { item: ActivityOption }) => {
        const isSelected = userInfo.activity === item.name;
        const isPeach = item.name === 'Glute Growth';
        const isBulk = item.name.toLowerCase().includes('bulk');
        const isCut = item.name.toLowerCase().includes('cut');
        let symbol = '';
        if (isBulk) symbol = '+';
        if (isCut) symbol = '-';

        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => handleSelect(item)}
            >
                <View style={styles.itemContent}>
                    <View style={styles.iconContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <MaterialCommunityIcons
                                name={item.icon as any}
                                size={28}
                                color={isSelected ? 'white' : (isPeach ? '#FFB07C' : Colors.primary)}
                            />
                            {symbol !== '' && (
                                <Text style={{
                                    color: isSelected ? 'white' : (isPeach ? '#FFB07C' : Colors.primary),
                                    fontSize: 14,
                                    fontWeight: 'bold',
                                    marginLeft: 1,
                                    marginTop: -2
                                }}>{symbol}</Text>
                            )}
                        </View>
                    </View>
                    <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>{item.name}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="white" />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Activity</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search activities..."
                        placeholderTextColor="rgba(79, 99, 82, 0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <FlatList
                data={filteredActivities}
                keyExtractor={(item) => item.name}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No activities found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    searchSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.card,
        borderRadius: 25,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.1)',
    },
    itemSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(79, 99, 82, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        flex: 1,
    },
    itemNameSelected: {
        color: 'white',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: 'rgba(79, 99, 82, 0.5)',
        fontSize: 16,
        fontWeight: '600',
    },
});
