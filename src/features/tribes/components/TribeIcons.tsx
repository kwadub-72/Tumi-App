import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { TribeType, TribePrivacy } from '@/src/shared/models/types';
export const CalendarIcon = ({ onPress }: { onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress}>
        <MaterialCommunityIcons name="calendar" size={24} color="white" />
    </TouchableOpacity>
);

// Shield VS -> Head-to-head (Now Trophy)
export const ShieldVSIcon = ({ onPress }: { onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="trophy-outline" size={24} color="white" />
        </View>
    </TouchableOpacity>
);

// Trophy with circles -> Tribe vs Tribe
export const TrophyTribeIcon = ({ onPress }: { onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="trophy-outline" size={24} color="white" />
            <View style={{ flexDirection: 'row', position: 'absolute', bottom: -2, gap: 12 }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'white' }} />
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'white' }} />
            </View>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'white', position: 'absolute', top: 8 }} />
        </View>
    </TouchableOpacity>
);

// Privacy Icons
export const PrivacyIcon = ({ privacy }: { privacy: TribePrivacy }) => {
    const isPublic = privacy === 'public';
    const onPress = () => {
        if (isPublic) Alert.alert('Public', 'Anyone can view this tribe.');
        else Alert.alert('Private', 'Only members can view this tribe.');
    };

    return (
        <TouchableOpacity onPress={onPress}>
            <MaterialCommunityIcons
                name={isPublic ? "earth" : "lock-outline"}
                size={22}
                color="white"
            />
        </TouchableOpacity>
    );
}
