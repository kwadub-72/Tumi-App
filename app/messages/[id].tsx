import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TextInput, 
    TouchableOpacity, 
    SafeAreaView, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
    Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useAuthStore } from '@/store/AuthStore';
import { supabase } from '@/src/shared/services/supabase';
import { SupabaseMessageService, Message } from '@/src/shared/services/SupabaseMessageService';

export default function MessageScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [targetProfile, setTargetProfile] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadData();
        
        // Subscription for real-time messages
        if (!session?.user?.id || !id) return;
        
        const channel = supabase
            .channel(`messages_${session.user.id}_${id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `or(and(sender_id.eq.${session.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${session.user.id}))`
            }, (payload) => {
                const newMessage = payload.new as Message;
                // Only add if we didn't just send it (to avoid duplication if optimistic UI is used, though here we'll just rely on DB)
                setMessages(prev => {
                    if (prev.find(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            })
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, session?.user?.id]);

    const loadData = async () => {
        if (!id || !session?.user?.id) return;
        setLoading(true);
        try {
            // Get target profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, handle, avatar_url')
                .eq('id', id)
                .single();
            if (profile) setTargetProfile(profile);

            // Fetch messages
            const msgs = await SupabaseMessageService.getConversation(session.user.id, id);
            setMessages(msgs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !session?.user?.id || !id || sending) return;
        
        const text = inputText.trim();
        setInputText('');
        setSending(true);
        
        const newMsg = await SupabaseMessageService.sendMessage(session.user.id, id, text);
        if (newMsg) {
            // Already handled by subscription, but we can do optimistic updating
            setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
        setSending(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    
                    {targetProfile && (
                        <TouchableOpacity style={styles.headerProfileContainer} onPress={() => router.push({ pathname: '/user/[handle]', params: { handle: targetProfile.handle } } as any)}>
                            <Image 
                                source={targetProfile.avatar_url ? { uri: targetProfile.avatar_url } : { uri: 'https://i.pravatar.cc/150?u=default' }} 
                                style={styles.avatar} 
                            />
                            <View>
                                <Text style={styles.headerName}>{targetProfile.name}</Text>
                                <Text style={styles.headerHandle}>{targetProfile.handle}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    <View style={{ width: 28 }} />
                </View>

                {/* Chat Area */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isMe = item.sender_id === session?.user?.id;
                        return (
                            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                                    {item.content}
                                </Text>
                            </View>
                        );
                    }}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Message..."
                        placeholderTextColor="#999"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
                        onPress={handleSend}
                        disabled={!inputText.trim() || sending}
                    >
                        <Ionicons name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        backgroundColor: Colors.background,
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
    headerProfileContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    headerHandle: {
        fontSize: 12,
        color: '#666',
    },
    listContent: {
        padding: 15,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#E8E8E8',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
    },
    myMessageText: {
        color: 'white',
    },
    theirMessageText: {
        color: 'black',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        minHeight: 40,
        maxHeight: 120,
        fontSize: 16,
        color: Colors.primary,
    },
    sendButton: {
        backgroundColor: Colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        marginBottom: 2,
    }
});
