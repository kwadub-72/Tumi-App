import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tribe } from '@/src/shared/models/types';
import JoinTribeButton from './JoinTribeButton';
import { CalendarIcon, ShieldVSIcon, TrophyTribeIcon, PrivacyIcon } from './TribeIcons';
import TribeInfoModal from './TribeInfoModal';

interface TribeCardProps {
    tribe: Tribe;
    onPress: () => void;
    onPressJoin: () => void;
}

export default function TribeCard({ tribe, onPress, onPressJoin }: TribeCardProps) {
    const isNatural = tribe.tags?.includes('natural');

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        description: '',
        type: 'icon-title' as 'icon-title' | 'pill',
        iconName: 'calendar' as keyof typeof MaterialCommunityIcons.glyphMap,
        iconColor: 'white',
        pillColor: '#4F6352'
    });

    const openModal = (config: Partial<typeof modalConfig>) => {
        setModalConfig({ ...modalConfig, ...config });
        setModalVisible(true);
    };

    const renderTypeIcon = () => {
        switch (tribe.type) {
            case 'accountability':
                return <CalendarIcon onPress={() => openModal({
                    title: 'Accountability',
                    description: 'Tribe focused on keeping members on track.',
                    type: 'icon-title',
                    iconName: 'calendar'
                })} />;
            case 'head-to-head':
                return <ShieldVSIcon onPress={() => openModal({
                    title: 'Head-to-Head',
                    description: 'Tribe members compete against each other.',
                    type: 'icon-title',
                    iconName: 'trophy-outline'
                })} />;
            case 'tribe-vs-tribe':
                return <TrophyTribeIcon onPress={() => openModal({
                    title: 'Tribe vs Tribe',
                    description: 'Compete against other tribes.',
                    type: 'icon-title',
                    iconName: 'trophy-variant-outline'
                })} />;
            default: return null;
        }
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: tribe.themeColor }]}
                onPress={onPress}
                activeOpacity={0.9}
            >
                <Image source={{ uri: tribe.avatar }} style={styles.avatar} />

                <View style={styles.content}>
                    <Text style={styles.name} numberOfLines={2}>{tribe.name}</Text>

                    <View style={styles.iconsRow}>
                        {isNatural && (
                            <View style={{ marginRight: 6 }}>
                                <MaterialCommunityIcons name="leaf" size={20} color="#4ADE80" />
                            </View>
                        )}

                        <TouchableOpacity onPress={() => openModal({
                            title: 'Activity',
                            description: tribe.activity || 'Bodybuilding/Lifting focused.',
                            type: 'icon-title',
                            iconName: (tribe.activityIcon as any) || 'hammer'
                        })}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginRight: 6 }}>
                                <MaterialCommunityIcons name={(tribe.activityIcon as any) || "hammer"} size={20} color="white" />
                                {(!tribe.activityIcon || tribe.activityIcon === 'hammer') && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginTop: -2 }}>+</Text>}
                            </View>
                        </TouchableOpacity>

                        {/* Specific Tribe Type Icon */}
                        <View style={{ marginRight: 6 }}>
                            {renderTypeIcon()}
                        </View>

                        {/* Privacy Icon */}
                        <PrivacyIcon privacy={tribe.privacy} />
                    </View>
                </View>

                <View style={styles.actionContainer}>
                    <JoinTribeButton status={tribe.joinStatus} onPress={onPressJoin} />
                </View>
            </TouchableOpacity>

            <TribeInfoModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 30, // Large rounded corners as per image
        marginBottom: 15,
        alignItems: 'center',
        height: 120, // Constant height roughly
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: '#ccc',
    },
    content: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
        lineHeight: 24,
    },
    iconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    }
});
