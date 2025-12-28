import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/shared/theme/Colors';

import { useState } from 'react';
import HammerModal from '../../components/HammerModal';
import VerifiedModal from '../../components/VerifiedModal';

export default function ProfileScreen() {
    // Mock grid images
    const gridImages = Array(9).fill('https://via.placeholder.com/150');
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <VerifiedModal
                visible={isVerifiedModalVisible}
                onClose={() => setVerifiedModalVisible(false)}
            />
            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/images/kwadub.jpg')}
                        style={styles.avatar}
                    />
                    <View style={styles.nameSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>Kwaku Adubofour</Text>
                            <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={{ marginLeft: 4 }} />
                        </View>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setVerifiedModalVisible(true)}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Text style={styles.handle}>@kwadub </Text>
                            <Ionicons name="leaf" size={14} color={Colors.success} />
                        </TouchableOpacity>
                    </View>

                    {/* Bio Stats */}
                    <View style={styles.bioContainer}>
                        <TouchableOpacity
                            style={styles.bioItem}
                            onPress={() => setHammerModalVisible(true)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="hammer" size={16} color={Colors.primary} />
                            <Text style={styles.bioText}>Bodybuilder (bulk)</Text>
                        </TouchableOpacity>
                        <View style={styles.bioItem}>
                            <Ionicons name="stats-chart" size={16} color="#ccc" />
                            <Text style={styles.bioText}>6'3 • 243 lbs • 8%</Text>
                        </View>
                    </View>

                    {/* Followers Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>45</Text>
                            <Text style={styles.statLabel}>Meals</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>87</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>130</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <Pressable style={styles.followBtn}>
                            <Text style={styles.followBtnText}>Following</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Message</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Similar</Text>
                        </Pressable>
                    </View>

                </View>

                {/* Content Tabs */}
                <View style={styles.tabs}>
                    <Ionicons name="grid" size={24} color="white" />
                    <Ionicons name="heart-outline" size={24} color="#666" />
                    <Ionicons name="bookmark-outline" size={24} color="#666" />
                </View>

                {/* Grid */}
                <View style={styles.gridContainer}>
                    {gridImages.map((img, i) => (
                        <View key={i} style={styles.gridItem}>
                            <Image source={{ uri: img }} style={styles.gridImage} />
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        paddingTop: 20,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        marginBottom: 10,
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: '#000000',
    },
    nameSection: {
        alignItems: 'center',
        marginBottom: 10,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    handle: {
        color: '#999',
        fontSize: 14,
        marginTop: 2,
    },
    bioContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    bioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    bioText: {
        color: '#ccc', // Lighter grey for text
        marginLeft: 6,
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 40,
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#888',
        fontSize: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    followBtn: {
        backgroundColor: '#ccc',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    followBtnText: {
        color: 'black',
        fontWeight: '600',
    },
    secondaryBtn: {
        backgroundColor: '#333',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#444',
    },
    secondaryBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingVertical: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        width: Dimensions.get('window').width / 3,
        height: Dimensions.get('window').width / 3,
        padding: 1,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
    }
});
