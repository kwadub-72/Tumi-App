import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface ActivityOption {
    name: string;
    icon: string;
    displayName?: string;
    modifier?: '+' | '-';
}

interface RolodexProps {
    options: ActivityOption[];
    selected: string;
    onSelect: (val: string) => void;
    showAll?: boolean;
}

const ITEM_HEIGHT = 70; // Increased to accommodate two lines of text better
const CONTAINER_HEIGHT = 290;
const OFFSET_PAD = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 110

export default function RolodexPicker({ options, selected, onSelect, showAll = true }: RolodexProps) {
    const flatListRef = useRef<FlatList>(null);
    const data = showAll ? [{ name: 'All', icon: '' }, ...options] : options;
    const isTapping = useRef(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const index = data.findIndex(d => d.name === selected);
            if (index !== -1) {
                flatListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
            }
        }, 150);
        return () => clearTimeout(timeout);
    }, []);

    const onScrollEnd = (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isTapping.current) return;
        const index = Math.round(ev.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        if (data[index] && data[index].name !== selected) {
            onSelect(data[index].name);
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isSelected = item.name === selected;
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                activeOpacity={0.7}
                onPress={() => {
                    isTapping.current = true;
                    onSelect(item.name);
                    flatListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
                    setTimeout(() => { isTapping.current = false; }, 500);
                }}
            >
                <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{item.displayName || item.name}</Text>
                {item.icon ? (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name={item.icon}
                            size={20}
                            color={isSelected ? '#F5F5DC' : 'rgba(255,255,255,0.5)'}
                        />
                        {item.modifier && (
                            <MaterialCommunityIcons
                                name={item.modifier === '+' ? 'plus' : 'minus'}
                                size={20}
                                color={isSelected ? '#F5F5DC' : 'rgba(255,255,255,0.5)'}
                            />
                        )}
                    </View>
                ) : (
                    <View style={{ width: 20 }} />
                )}
            </TouchableOpacity>
        );
    };

    const Spacer = () => <View style={{ height: OFFSET_PAD }} />;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.name}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                ListHeaderComponent={Spacer}
                ListFooterComponent={Spacer}
                getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onMomentumScrollEnd={onScrollEnd}
                onScrollBeginDrag={() => { isTapping.current = false; }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: CONTAINER_HEIGHT,
        backgroundColor: '#1E251E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    item: {
        height: ITEM_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
    },
    selectedItem: {
        backgroundColor: '#2F3A27',
        marginHorizontal: 15,
        borderRadius: 15,
    },
    itemText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
        maxWidth: '80%', // Forces early wrapping to keep icon closer
        textAlign: 'center', // Centers wrapped multi-line text cleanly
    },
    selectedItemText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    }
});
