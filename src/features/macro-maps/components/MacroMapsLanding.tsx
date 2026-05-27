import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
                    <MaterialCommunityIcons name={icon} size={28} color={Colors.theme.softWhite} />
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

export function MacroMapsLanding({ onLaunch, onCreate, onStartLive, onSavePrevious }: {
    onLaunch: () => void;
    onCreate: () => void;
    onStartLive: () => void;
    onSavePrevious: () => void;
}) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="map-legend" size={48} color={Colors.theme.harvestGold} />
                <Text style={styles.mainTitle}>Macro Maps</Text>
                <Text style={styles.mainSubtitle}>Navigate your journey with dynamic macro scaling and intelligent check-ins.</Text>
            </View>

            <View style={styles.cardsWrapper}>
                <OptionCard 
                    title="Launch a live map"
                    subtitle="Connect to an active macro engine and auto-scale your daily intake."
                    icon="rocket-launch"
                    isPrimary
                    onPress={onLaunch}
                />
                <OptionCard 
                    title="Start a live journey"
                    subtitle="Create an experiential map and broadcast your real-time adjustments."
                    icon="satellite-uplink"
                    onPress={onStartLive}
                />
                <OptionCard 
                    title="Create a map from scratch"
                    subtitle="Design a structured multi-week plan for yourself or your Tribe."
                    icon="pencil-ruler"
                    onPress={onCreate}
                />
                <OptionCard 
                    title="Save a previous journey"
                    subtitle="Archive a past block of training and nutrition as a historical map."
                    icon="archive-arrow-down"
                    onPress={onSavePrevious}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginTop: 12,
        marginBottom: 8,
    },
    mainSubtitle: {
        fontSize: 15,
        color: Colors.theme.dust,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    cardsWrapper: {
        gap: 16,
    },
    cardContainer: {
        borderRadius: 16,
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    titlePrimary: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.theme.softWhite,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.theme.dust,
        lineHeight: 18,
    },
});
