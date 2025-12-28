import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedItem from '../../src/features/feed/components/FeedItem'; // Reusing existing FeedItem as it matches the card requirement
import { FeedPost } from '../../src/shared/models/types';
import { Colors } from '../../src/shared/theme/Colors';

// Reuse the mock data structure but ensure it matches the "Feed" aesthetic
const FEED_DATA: FeedPost[] = [
    {
        id: '1',
        user: {
            id: 'u1', // Added ID
            name: 'Kwaku',
            handle: '@kwadub',
            avatar: require('../../assets/images/kwadub.jpg'),
            verified: true,
        },
        timeAgo: '10 mins ago',
        meal: {
            id: 'm1', // Added ID
            title: 'Cheatiest of cheat meals, pre-lift lol, very full',
            calories: 1000,
            macros: { p: 54, c: 80, f: 20 },
            ingredients: [
                { id: 'i1', name: 'Rice', amount: '10 oz', cals: 500, macros: { p: 54, c: 80, f: 20 } },
                { id: 'i2', name: 'Chicken', amount: '10 oz', cals: 500, macros: { p: 54, c: 80, f: 20 } },
                { id: 'i3', name: 'Chipotle Sauce', amount: '10 oz', cals: 500, macros: { p: 54, c: 80, f: 20 } },
            ]
        },
        stats: { likes: 700, shares: 49, comments: 11, saves: 11 },
        mediaUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000',
        mediaType: 'image',
    },
    {
        id: '2',
        user: {
            id: 'u2',
            name: 'HD',
            handle: '@hd2x',
            avatar: require('../../assets/images/hd2x.jpg'),
            verified: true,
        },
        timeAgo: '10 mins ago',
        meal: {
            id: 'm2', // Added ID
            title: 'Cheatiest of cheat meals, pre-lift lol, very full',
            calories: 1000,
            macros: { p: 54, c: 80, f: 20 },
            ingredients: [
                { id: 'i4', name: 'Rice', amount: '10 oz', cals: 500, macros: { p: 54, c: 80, f: 20 } },
                { id: 'i5', name: 'Chicken', amount: '10 oz', cals: 500, macros: { p: 54, c: 80, f: 20 } },
                { id: 'i6', name: 'Chipotle Sauce', amount: '10 oz', cals: 500, macros: { p: 54, c: 80, f: 20 } },
            ]
        },
        stats: { likes: 700, shares: 49, comments: 11, saves: 11 }
    }
];

import { useEffect, useState } from 'react';
import CommentSheet from '../../components/CommentSheet';
import HammerModal from '../../components/HammerModal';
import VerifiedModal from '../../components/VerifiedModal';
import { PostStore } from '../../store/PostStore';

export default function HomeScreen() {
    const [posts, setPosts] = useState<FeedPost[]>([]);

    useEffect(() => {
        const init = async () => {
            const stored = await PostStore.loadPosts();
            setPosts([...stored, ...FEED_DATA]);
        };
        init();

        return PostStore.subscribe((newPosts: FeedPost[]) => {
            setPosts([...newPosts, ...FEED_DATA]);
        });
    }, []);

    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePostId, setActivePostId] = useState<string | null>(null);

    const toggleLike = (postId: string) => {
        setPosts(current => current.map(post => {
            if (post.id === postId) {
                const isLiked = !post.isLiked;
                return {
                    ...post,
                    isLiked,
                    stats: {
                        ...post.stats,
                        likes: isLiked ? post.stats.likes + 1 : post.stats.likes - 1
                    }
                };
            }
            return post;
        }));
    };

    const toggleShare = (postId: string) => {
        setPosts(current => current.map(post => {
            if (post.id === postId) {
                const isShared = !post.isShared;
                return {
                    ...post,
                    isShared,
                    stats: {
                        ...post.stats,
                        shares: isShared ? post.stats.shares + 1 : post.stats.shares - 1
                    }
                };
            }
            return post;
        }));
    };

    const toggleSave = (postId: string) => {
        setPosts(current => current.map(post => {
            if (post.id === postId) {
                const isSaved = !post.isSaved;
                return {
                    ...post,
                    isSaved,
                    stats: {
                        ...post.stats,
                        saves: isSaved ? post.stats.saves + 1 : post.stats.saves - 1
                    }
                };
            }
            return post;
        }));
    };

    const handleCommentPosted = () => {
        if (!activePostId) return;
        setPosts(current => current.map(post => {
            if (post.id === activePostId) {
                return {
                    ...post,
                    hasCommented: true,
                    stats: {
                        ...post.stats,
                        comments: post.stats.comments + 1
                    }
                };
            }
            return post;
        }));
    };

    const handleCommentDeleted = (hasMyCommentsLeft: boolean) => {
        if (!activePostId) return;
        setPosts(current => current.map(post => {
            if (post.id === activePostId) {
                return {
                    ...post,
                    hasCommented: hasMyCommentsLeft,
                    stats: {
                        ...post.stats,
                        comments: Math.max(0, post.stats.comments - 1)
                    }
                };
            }
            return post;
        }));
    };

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
            <CommentSheet
                visible={isCommentSheetVisible}
                onClose={() => setCommentSheetVisible(false)}
                onCommentPosted={handleCommentPosted}
                onCommentDeleted={handleCommentDeleted}
            />
            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/40' }} // User avatar placeholder
                    style={styles.headerAvatar}
                />
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Home</Text>
                </View>
                <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            </View>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FeedItem
                        post={item}
                        onPressVerified={() => setVerifiedModalVisible(true)}
                        onPressHammer={() => setHammerModalVisible(true)}
                        onPressComment={() => {
                            setActivePostId(item.id);
                            setCommentSheetVisible(true);
                        }}
                        onPressLike={() => toggleLike(item.id)}
                        onPressShare={() => toggleShare(item.id)}
                        onPressSave={() => toggleSave(item.id)}
                    />
                )}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Pure black as requested
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    list: {
        paddingHorizontal: 8,
        paddingVertical: 16,
    },
});
