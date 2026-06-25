import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
    Keyboard,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { useAuthStore } from '@/store/AuthStore';
import { supabase } from '@/src/shared/services/supabase';
import { SupabaseTribeMessageService, TribeMessage } from '@/src/shared/services/SupabaseTribeMessageService';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';

// ─── Palette (Midnight Gold) ──────────────────────────────────────────────────
const C = {
    bg: '#262525', // Deep Charcoal
    headerBg: '#1A1A1A', // Matte Black
    gold: '#DAA520', // Harvest Gold
    sienna: '#8B4513', // Burnt Sienna
    charcoalGray: '#787878',
    white: '#FFFFFF',
    dust: '#EDE8D5',
};

export default function TribeChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    const currentUserId = session?.user?.id;
    const insets = useSafeAreaInsets();
    const { navigateToProfile } = useProfileNavigation();

    const [messages, setMessages] = useState<TribeMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [tribe, setTribe] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const isLargePublicTribe = tribe?.privacy === 'public' && (tribe?.member_count ?? 0) > 100;
    const isChief = userRole === 'chief' || tribe?.chief_id === currentUserId;
    const canPost = !isLargePublicTribe || isChief;

    useEffect(() => {
        loadTribeData();
        loadMessages(true);

        // Subscription for real-time messages
        if (!id) return;

        const channel = supabase
            .channel(`tribe_messages_${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'tribe_messages',
                filter: `tribe_id=eq.${id}`
            }, async (payload) => {
                const newMessage = payload.new as TribeMessage;
                
                // Fetch sender details as they are not in the payload
                const { data: senderData } = await supabase
                    .from('profiles')
                    .select('handle, name, avatar_url')
                    .eq('id', newMessage.sender_id)
                    .single();
                
                const messageWithSender = {
                    ...newMessage,
                    sender: senderData || undefined
                };

                setMessages(prev => {
                    if (prev.find(m => m.id === newMessage.id)) return prev;
                    return [...prev, messageWithSender];
                });
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            })
            .subscribe();

        // Subscription for tribe changes (member count)
        const tribeChannel = supabase
            .channel(`tribe_changes_${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tribes',
                filter: `id=eq.${id}`
            }, (payload) => {
                setTribe(payload.new);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(tribeChannel);
        };
    }, [id]);

    const loadTribeData = async () => {
        if (!id || !currentUserId) return;
        try {
            const { data: tribeData } = await supabase
                .from('tribes')
                .select('*, chief:profiles!chief_id(id, handle, name, avatar_url)')
                .eq('id', id)
                .single();
            
            if (tribeData) {
                setTribe(tribeData);
                
                // Fetch user role
                const { data: memberData } = await supabase
                    .from('tribe_members')
                    .select('role')
                    .eq('tribe_id', id)
                    .eq('user_id', currentUserId)
                    .single();
                
                if (memberData) {
                    setUserRole(memberData.role);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadMessages = async (initial = false) => {
        if (!id) return;
        if (!initial && !hasMore) return;

        const currentOffset = initial ? 0 : offset;
        const limit = 25;

        const msgs = await SupabaseTribeMessageService.getTribeMessages(id, limit, currentOffset);
        
        if (msgs.length < limit) {
            setHasMore(false);
        }

        if (initial) {
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        } else {
            setMessages(prev => [...msgs, ...prev]);
            setOffset(currentOffset + limit);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !currentUserId || !id || sending || !canPost) return;

        const text = inputText.trim();
        setInputText('');
        setSending(true);

        const newMsg = await SupabaseTribeMessageService.sendTribeMessage(id, currentUserId, text);
        if (newMsg) {
            // Optimistic update or wait for subscription
            // Here we rely on subscription for consistency, but we could add it optimistically
            // To avoid duplication, we check in subscription
        }
        setSending(false);
    };

    const formatMessageTime = useCallback((dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={C.gold} />
            </View>
        );
    }

    if (!currentUserId || !userRole) {
        const isOnboardingLocked = !currentUserId;
        return (
            <View style={[styles.container, styles.centered, { padding: 20 }]}>
                <Ionicons name="lock-closed" size={64} color={C.gold} />
                <Text style={{ marginTop: 20, fontSize: 16, fontWeight: 'bold', color: C.white }}>
                    {isOnboardingLocked ? 'Finish Setup to Chat' : 'Members Only'}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 14, color: C.dust, textAlign: 'center' }}>
                    {isOnboardingLocked 
                        ? 'You must complete your account setup to enter the chat room and connect with your chribe.' 
                        : 'You must join this chribe to view and participate in the chat.'}
                </Text>
                <TouchableOpacity style={{ marginTop: 24, padding: 12 }} onPress={() => router.back()}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.gold }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const title = isLargePublicTribe ? "Chribe Announcements" : "Chribe Chat";

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={C.dust} />
                    </TouchableOpacity>

                    {tribe && (
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>{title}</Text>
                            <Text style={styles.headerSubtitle}>{tribe.name.toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                {/* Chat Area */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onEndReached={() => loadMessages(false)}
                    onEndReachedThreshold={0.1}
                    renderItem={({ item }) => {
                        const isMe = item.sender_id === currentUserId;
                        const isMsgChief = item.sender_id === tribe?.chief_id;
                        
                        return (
                            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                                {!isMe && item.sender && (
                                    <TouchableOpacity 
                                        style={styles.senderContainer}
                                        onPress={() => navigateToProfile({ id: item.sender_id, handle: item.sender.handle })}
                                        activeOpacity={0.7}
                                    >
                                        <Image 
                                            source={item.sender.avatar_url ? { uri: item.sender.avatar_url } : { uri: `https://i.pravatar.cc/150?u=${item.sender_id}` }} 
                                            style={styles.senderAvatar} 
                                        />
                                        <View style={styles.senderInfoContainer}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.senderName}>{item.sender.name}</Text>
                                                {isMsgChief && (
                                                    <MaterialCommunityIcons name="crown" size={14} color={C.gold} style={{ marginLeft: 4 }} />
                                                )}
                                                {/* Natural/Enhanced Status Icon */}
                                                {item.sender.status && item.sender.status !== 'none' && (
                                                    <MaterialCommunityIcons
                                                        name={item.sender.status === 'enhanced' ? "lightning-bolt" : "leaf"}
                                                        size={13}
                                                        color={item.sender.status === 'enhanced' ? C.sienna : "#1BB607"}
                                                        style={{ marginLeft: 4 }}
                                                    />
                                                )}
                                                {/* Activity & Bulk/Cut Symbol Icon */}
                                                {item.sender.activity && (
                                                    <View style={styles.activityContainer}>
                                                        <MaterialCommunityIcons
                                                            name={resolveActivityIcon(item.sender.activity, item.sender.activity_icon) as any}
                                                            size={13}
                                                            color={"white"}
                                                            style={{ marginLeft: 4 }}
                                                        />
                                                        {item.sender.activity.toLowerCase().includes('bulk') && (
                                                            <Text style={styles.activitySymbol}>+</Text>
                                                        )}
                                                        {item.sender.activity.toLowerCase().includes('cut') && (
                                                            <Text style={styles.activitySymbol}>-</Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.senderHandle}>{item.sender.handle}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                                    {item.content}
                                </Text>
                                <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
                                    {formatMessageTime(item.created_at)}
                                </Text>
                            </View>
                        );
                    }}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />

                {/* Input Area */}
                {canPost ? (
                    <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Message your Chribe..."
                            placeholderTextColor={C.charcoalGray}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || sending}
                        >
                            <Ionicons name="send" size={20} color={C.white} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.readOnlyContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                        <Text style={styles.readOnlyText}>Only the Chribe Chief can post messages.</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        minHeight: 56,
        borderBottomWidth: 1,
        borderBottomColor: C.gold,
        backgroundColor: C.headerBg,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        zIndex: 10,
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 50,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: C.gold,
    },
    headerSubtitle: {
        fontSize: 10,
        color: C.sienna,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    listContent: {
        padding: 15,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: C.headerBg,
        borderWidth: 1,
        borderColor: C.gold,
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: C.headerBg,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: C.white,
    },
    theirMessageText: {
        color: C.dust,
    },
    messageTime: {
        fontSize: 9,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myMessageTime: {
        color: 'rgba(237, 232, 213, 0.5)', // Muted Dust
    },
    theirMessageTime: {
        color: 'rgba(120, 120, 120, 0.7)', // Muted Charcoal Gray
    },
    senderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    senderAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: C.gold, // Harvest Gold border!
        marginRight: 8,
    },
    senderInfoContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activitySymbol: {
        color: C.white,
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 1,
        marginTop: -3,
    },
    senderName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: C.dust,
    },
    senderHandle: {
        fontSize: 10,
        color: C.charcoalGray,
        marginTop: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: C.headerBg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(218, 165, 32, 0.2)', // Subtle gold border
    },
    input: {
        flex: 1,
        backgroundColor: '#262525',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        minHeight: 40,
        maxHeight: 120,
        fontSize: 15,
        color: C.white,
    },
    sendButton: {
        backgroundColor: C.gold,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        marginBottom: 2,
    },
    readOnlyContainer: {
        padding: 15,
        backgroundColor: C.headerBg,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(218, 165, 32, 0.2)',
    },
    readOnlyText: {
        color: C.charcoalGray,
        fontSize: 14,
        textAlign: 'center',
    }
});
