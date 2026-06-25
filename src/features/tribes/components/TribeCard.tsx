import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { DiscoveryTribe } from '@/src/features/explore/types';
import TribeInfoModal from './TribeInfoModal';
import { ACTIVITIES, resolveActivityIcon } from '@/src/shared/constants/Activities';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { useUserTribeStore } from '@/src/store/UserTribeStore';

// ─── Midnight Gold Palette ─────────────────────────────────────────────────────
const GOLD = '#DAA520';            // Harvest Gold
const GOLD_DIM = 'rgba(218,165,32,0.55)';
const CARD_BG = '#1E1E1E';         // near-black card
const TEXT_DIM = '#A89060';        // muted gold for metadata
const TEXT_LIGHT = '#EDE8D5';      // dust for icons

// ─── Focus type icon map ───────────────────────────────────────────────────────
const FOCUS_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    'accountability': 'calendar-check',
    'head-to-head':   'trophy-outline',
    'tribe-vs-tribe': 'sword-cross',
};

const FOCUS_LABEL: Record<string, string> = {
    'accountability': 'Accountability',
    'head-to-head':   'Head-to-Head',
    'tribe-vs-tribe': 'Tribe Battle',
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface TribeCardProps {
    tribe: DiscoveryTribe;
    onPress: () => void;
    onPressJoin: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TribeCard({ tribe, onPress, onPressJoin }: TribeCardProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        description: string;
        type: 'icon-title' | 'pill';
        iconName: keyof typeof MaterialCommunityIcons.glyphMap;
        iconColor: string;
        pillColor: string;
        modifier?: string;
    }>({
        title: '',
        description: '',
        type: 'icon-title',
        iconName: 'calendar',
        iconColor: GOLD,
        pillColor: GOLD,
    });

    const openModal = (config: Partial<typeof modalConfig>) => {
        setModalConfig(prev => ({ ...prev, ...config }));
        setModalVisible(true);
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const activityIconName = resolveActivityIcon(tribe.activityType, tribe.activityIcon);
    const isBulk = tribe.activityType?.toLowerCase().includes('bulk');
    const isCut  = tribe.activityType?.toLowerCase().includes('cut');

    const focusIconName = FOCUS_ICON[tribe.focusType] ?? 'calendar-check';
    const focusLabel    = FOCUS_LABEL[tribe.focusType] ?? 'Accountability';
    const isPrivate     = tribe.privacy === 'private';

    // naturalStatus: null = not specified, true = natural, false = enhanced
    const hasNaturalStatus = tribe.naturalStatus !== null && tribe.naturalStatus !== undefined;

    const storeIsMember = useUserTribeStore(state => state.isMember(tribe.id));
    const storeIsRequested = useUserTribeStore(state => state.isRequested(tribe.id));

    // Strictly rely on the reactive store.
    const isMember  = storeIsMember;
    const isPending = storeIsRequested;

    const joinBg    = isMember  ? GOLD  : isPending ? '#5A5A5A' : 'transparent';
    const joinBorder= isMember  ? GOLD  : isPending ? '#5A5A5A' : GOLD;
    const joinIcon  = isMember  ? 'check-circle' : isPending ? 'clock-outline' : 'plus-circle-outline';
    const joinColor = isMember  ? '#1A1A1A' : isPending ? '#CCC' : GOLD;

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                onPress={onPress}
                activeOpacity={0.88}
            >
                {/* ── Avatar ───────────────────────────────────────────────── */}
                <View style={styles.avatarWrapper}>
                    {tribe.avatarUrl ? (
                        <Image
                            source={{ uri: tribe.avatarUrl }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <TabonoLogo size={30} color={GOLD_DIM} />
                        </View>
                    )}
                </View>

                {/* ── Content ──────────────────────────────────────────────── */}
                <View style={styles.content}>
                    {/* Tribe name */}
                    <Text style={styles.name} numberOfLines={1}>
                        {tribe.name}
                    </Text>

                    {/* Member count */}
                    <Text style={styles.memberCount}>
                        {tribe.memberCount} {tribe.memberCount === 1 ? 'member' : 'members'}
                    </Text>

                    {/* ── Icon row (conditional, left-aligned) ───────────── */}
                    <View style={styles.iconsRow}>
                        {/* Natural/Enhanced status — only rendered when explicitly set */}
                        {hasNaturalStatus && (
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => openModal({
                                    title: tribe.naturalStatus ? 'Natural' : 'Enhanced',
                                    description: tribe.naturalStatus
                                        ? 'This tribe does not permit performance-enhancing substances.'
                                        : 'This tribe is open to enhanced athletes.',
                                    iconName: tribe.naturalStatus ? 'leaf' : 'lightning-bolt',
                                    iconColor: tribe.naturalStatus ? '#1BB607' : GOLD,
                                })}
                            >
                                <MaterialCommunityIcons
                                    name={tribe.naturalStatus ? 'leaf' : 'lightning-bolt'}
                                    size={20}
                                    color={tribe.naturalStatus ? '#1BB607' : GOLD}
                                />
                            </TouchableOpacity>
                        )}

                        {/* Activity type icon */}
                        {tribe.activityType && (
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => openModal({
                                    title: tribe.activityType,
                                    description: '',
                                    iconName: activityIconName as keyof typeof MaterialCommunityIcons.glyphMap,
                                    iconColor: TEXT_LIGHT,
                                    modifier: isBulk ? '+' : isCut ? '–' : undefined,
                                })}
                            >
                                <View style={styles.activityIconWrapper}>
                                    <MaterialCommunityIcons
                                        name={activityIconName as any}
                                        size={20}
                                        color={TEXT_LIGHT}
                                    />
                                    {isBulk && (
                                        <Text style={styles.activitySymbol}>+</Text>
                                    )}
                                    {isCut && (
                                        <Text style={styles.activitySymbol}>–</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Focus type icon */}
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openModal({
                                title: focusLabel,
                                description: FOCUS_DESCRIPTIONS[tribe.focusType] ?? '',
                                iconName: focusIconName,
                                iconColor: TEXT_LIGHT,
                            })}
                        >
                            <MaterialCommunityIcons
                                name={focusIconName}
                                size={20}
                                color={TEXT_LIGHT}
                            />
                        </TouchableOpacity>

                        {/* Privacy icon */}
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openModal({
                                title: isPrivate ? 'Private' : 'Public',
                                description: isPrivate
                                    ? 'You must request to join this tribe.'
                                    : 'Anyone can join this tribe.',
                                iconName: isPrivate ? 'lock-outline' : 'earth',
                                iconColor: TEXT_LIGHT,
                            })}
                        >
                            <MaterialCommunityIcons
                                name={isPrivate ? 'lock-outline' : 'earth'}
                                size={20}
                                color={TEXT_LIGHT}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Join button ───────────────────────────────────────────── */}
                <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: joinBg, borderColor: joinBorder }]}
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent the parent card from catching this tap
                        if (onPressJoin) onPressJoin();
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Make it easier to tap
                >
                    <MaterialCommunityIcons name={joinIcon as any} size={22} color={joinColor} />
                </TouchableOpacity>
            </TouchableOpacity>

            <TribeInfoModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />
        </>
    );
}

// ─── Focus descriptions ────────────────────────────────────────────────────────
const FOCUS_DESCRIPTIONS: Record<string, string> = {
    'accountability': 'Members hold each other accountable to their fitness goals.',
    'head-to-head':   'Tribe members compete directly against one another.',
    'tribe-vs-tribe': 'Your tribe battles other tribes for supremacy.',
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_BG,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(218,165,32,0.18)',
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    avatarWrapper: {
        marginRight: 14,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1.5,
        borderColor: GOLD,
        backgroundColor: '#2A2A2A',
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: '800',
        color: GOLD,
        marginBottom: 2,
        letterSpacing: 0.2,
    },
    memberCount: {
        fontSize: 12,
        color: TEXT_LIGHT,
        fontWeight: '500',
        marginBottom: 8,
    },
    iconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBtn: {
        // No extra padding — gap handles spacing between icons
    },
    activityIconWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    activitySymbol: {
        color: TEXT_LIGHT,
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -2,
    },
    joinBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
