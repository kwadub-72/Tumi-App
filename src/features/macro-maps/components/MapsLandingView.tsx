import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface OptionCardProps {
    title: string;
    subtitle: string;
    icon: any;
    onPress: () => void;
    isPrimary?: boolean;
}

const OptionCard = ({ title, subtitle, icon, onPress, isPrimary }: OptionCardProps) => (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.cardContainer}>
        {isPrimary ? (
            <LinearGradient
                colors={['#262525', '#1A1A1A']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.iconContainerPrimary}>
                    <MaterialCommunityIcons name={icon} size={32} color={Colors.theme.harvestGold} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.titlePrimary}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.theme.harvestGold} />
            </LinearGradient>
        ) : (
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name={icon} size={28} color={Colors.theme.harvestGold} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.theme.dust} />
            </View>
        )}
    </TouchableOpacity>
);

export function MapsLandingView({ onLaunch, onCreate, onFindMap, onSavePrevious }: {
    onLaunch: () => void;
    onCreate: () => void;
    onFindMap: () => void;
    onSavePrevious: () => void;
}) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="map-legend" size={48} color={Colors.theme.harvestGold} />
                <Text style={styles.mainTitle}>Macro maps</Text>
            </View>

            <View style={styles.cardsWrapper}>
                <OptionCard 
                    title="Find a map"
                    subtitle="Browse, select, and subscribe to a creator's map to align your nutrition with their path."
                    icon="rocket-launch"
                    isPrimary
                    onPress={onFindMap}
                />
                <OptionCard 
                    title="Launch a live map"
                    subtitle="Broadcast your real-time, day-to-day macro choices synchronously to your followers as you make them."
                    icon="satellite-uplink"
                    onPress={onLaunch}
                />
                <OptionCard 
                    title="Create a map from scratch"
                    subtitle="Build an automated, macro blueprint for your subscribers follow."
                    icon="pencil-ruler"
                    onPress={onCreate}
                />
                <OptionCard 
                    title="Save a previous journey"
                    subtitle="Open the Compile Studio to turn a historical stretch of your past logs into a permanent masterclass track."
                    icon="archive-arrow-down"
                    onPress={onSavePrevious}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginTop: 12,
        letterSpacing: 1,
    },
    cardsWrapper: {
        gap: 16,
    },
    cardContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    iconContainerPrimary: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(218, 165, 32, 0.1)', // harvestGold low opacity
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    titlePrimary: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.theme.softWhite,
        lineHeight: 20,
    },
});
