import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { FeedPost, Comment } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { PostStore } from '@/store/PostStore';
import { generateFakePosts } from '@/src/shared/utils/FakeDataGenerator';
import { useUserStore } from '@/store/UserStore';
import HammerModal from '@/components/HammerModal';
import PostOptionsModal from '@/components/PostOptionsModal';

type NavTab = 'Following' | 'Diary' | 'Tribe';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const userInfo = useUserStore();
    const [post, setPost] = useState<FeedPost | null>(null);

    const [currentTab, setCurrentTab] = useState<NavTab>('Following');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleTabPress = (tab: NavTab) => {
        router.replace({ pathname: '/(tabs)', params: { tab } });
    };

    const handleToggleSelect = (itemId: string, type: string) => {
        if (type === 'macro') {
            // For macros, only one can be selected, and it acts as a toggle
            setSelectedItems(prev => {
                if (prev.includes(itemId)) return [];
                return [itemId];
            });
            return;
        }

        setSelectedItems(prev => {
            if (prev.includes(itemId)) return prev.filter(i => i !== itemId);
            return [...prev, itemId];
        });
    };

    useEffect(() => {
        const loadPost = async () => {
            const posts = await PostStore.loadPosts();
            let found = posts.find((p: FeedPost) => p.id === id);

            if (!found && typeof id === 'string' && id.startsWith('fake_')) {
                // If it's a fake post, we need to find it in the generated set
                const fakePosts = generateFakePosts(50);
                found = fakePosts.find(p => p.id === id);
            }

            if (found) {
                // Sync self posts
                if (found.user.handle === userInfo.handle) {
                    found = {
                        ...found,
                        user: {
                            ...found.user,
                            name: userInfo.name,
                            avatar: userInfo.avatar,
                            status: userInfo.status
                        }
                    };
                }
                setPost(found);
            }
        };
        loadPost();
    }, [id, userInfo.handle, userInfo.name, userInfo.avatar, userInfo.status]);

    const toggleLike = async () => {
        if (!post) return;
        await PostStore.toggleLike(post.id);
        setPost(prev => {
            if (!prev) return null;
            const isLiked = !prev.isLiked;
            return {
                ...prev,
                isLiked,
                stats: {
                    ...prev.stats,
                    likes: isLiked ? prev.stats.likes + 1 : Math.max(0, prev.stats.likes - 1)
                }
            };
        });
    };

    const renderComment = ({ item, index }: { item: Comment, index: number }) => (
        <View key={item.id} style={styles.commentRowWrapper}>
            <View style={styles.commentItem}>
                <Image
                    source={typeof item.user.avatar === 'string' ? { uri: item.user.avatar } : item.user.avatar}
                    style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeaderLine}>
                        <Text style={styles.commentName}>{item.user.name}</Text>
                        {item.user.status && (item.user.status !== 'none') && (
                            <MaterialCommunityIcons
                                name={item.user.status === 'enhanced' ? "lightning-bolt" : "leaf"}
                                size={14}
                                color={item.user.status === 'enhanced' ? "#FFD700" : Colors.success}
                            />
                        )}
                        {item.user.activityIcon && (
                            <MaterialCommunityIcons
                                name={item.user.activityIcon as any}
                                size={14}
                                color='white'
                            />
                        )}
                    </View>
                    <View style={styles.commentHandleRow}>
                        <Text style={styles.commentHandle}>{item.user.handle}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                </View>

                <View style={styles.commentActions}>
                    <TouchableOpacity>
                        <Ionicons name={item.isLiked ? "heart" : "heart-outline"} size={20} color={"white"} />
                    </TouchableOpacity>
                    <Text style={styles.commentLikes}>{item.likes}</Text>
                    <Text style={styles.commentTime}>Just now</Text>
                </View>
            </View>
        </View>
    );

    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [hammerData, setHammerData] = useState({ name: '', icon: '' });

    if (!post) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Post not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>

                <View style={styles.topNavWrapper}>
                    <View style={styles.tabsContainer}>
                        {(['Following', 'Diary', 'Tribe'] as NavTab[]).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tabButton,
                                    currentTab === tab && styles.tabButtonActive
                                ]}
                                onPress={() => handleTabPress(tab)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    currentTab === tab && styles.tabTextActive
                                ]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.dateButton} onPress={() => router.replace('/')}>
                        <Text style={styles.dateButtonText}>{formattedDate}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ width: 44 }} />
            </View>

            <PostOptionsModal
                visible={isOptionsModalVisible}
                onClose={() => setOptionsModalVisible(false)}
                onSelectItems={() => {
                    setOptionsModalVisible(false);
                    setIsSelectMode(true);
                }}
            />

            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={hammerData.name}
                activityIcon={hammerData.icon}
            />
            <FlatList
                data={[]}
                keyExtractor={(item) => 'dummy'}
                renderItem={() => null}
                ListHeaderComponent={(
                    <View style={styles.postContainer}>
                        <FeedItem
                            post={post}
                            isDetailView={true}
                            isSelectMode={isSelectMode}
                            selectedItems={selectedItems}
                            onToggleSelect={handleToggleSelect}
                            onPressOptions={() => {
                                if (isSelectMode) {
                                    setIsSelectMode(false);
                                } else {
                                    setOptionsModalVisible(true);
                                }
                            }}
                            onPressLike={toggleLike}
                            onPressHammer={() => {
                                setHammerData({
                                    name: post.user.handle === userInfo.handle ? userInfo.activity : (post.user as any).activity || 'Bodybuilder (Bulk)',
                                    icon: post.user.handle === userInfo.handle ? userInfo.activityIcon : post.user.activityIcon || 'hammer'
                                });
                                setHammerModalVisible(true);
                            }}
                        />
                        {post.comments && post.comments.length > 0 && (
                            <View style={styles.commentsWrapper}>
                                <Text style={styles.commentsHeaderText}>Comments</Text>
                                {post.comments.map((item, index) => renderComment({ item, index }))}
                            </View>
                        )}
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 10,
        marginBottom: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        marginTop: 5,
    },
    topNavWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.topNavBackground,
        borderRadius: 25,
        padding: 5,
        alignSelf: 'stretch', // take available space 
        marginHorizontal: 10,
        justifyContent: 'space-between',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabButtonActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6E7A66', // Sage dark muted
    },
    tabTextActive: {
        color: 'white',
    },
    dateButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 15,
        marginTop: 10,
    },
    dateButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    postContainer: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(79, 99, 82, 0.2)',
        marginVertical: 15,
    },
    listContent: {
        paddingBottom: 40,
    },
    commentRowWrapper: {
        marginBottom: 8,
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'flex-start',
    },
    commentAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: 'rgba(0,0,0,0.1)', // Placeholder
    },
    commentContent: {
        flex: 1,
    },
    commentHeaderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 2,
    },
    commentName: {
        fontWeight: 'bold',
        fontSize: 14,
        color: 'white',
        marginRight: 4,
    },
    commentHandleRow: {
        marginBottom: 4,
    },
    commentHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    commentText: {
        fontSize: 14,
        color: 'white',
        lineHeight: 18,
    },
    commentActions: {
        alignItems: 'center',
        marginLeft: 10,
    },
    commentLikes: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    commentTime: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    commentsWrapper: {
        backgroundColor: '#A4B69D', // Matching post card color
        borderRadius: 45,
        padding: 20,
        marginBottom: 20,
        marginTop: -10, // Pull it up slightly underneath the card
    },
    commentsHeaderText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    }
});
