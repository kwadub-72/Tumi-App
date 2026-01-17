import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, FlatList } from 'react-native';

interface ActivityOption {
    name: string;
    icon: string;
}

interface RolodexProps {
    options: ActivityOption[];
    selected: string;
    onSelect: (val: string) => void;
}

const ITEM_HEIGHT = 50;

export default function RolodexPicker({ options, selected, onSelect }: RolodexProps) {
    const flatListRef = useRef<FlatList>(null);
    const data = [{ name: 'All', icon: '' }, ...options];

    useEffect(() => {
        // Initial scroll to position if possible, maybe delayed
    }, []);

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isSelected = item.name === selected;
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                onPress={() => {
                    onSelect(item.name);
                    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                }}
            >
                <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{item.name}</Text>
                {item.icon ? (
                    <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={isSelected ? '#F5F5DC' : 'rgba(255,255,255,0.5)'}
                        style={{ marginLeft: 10 }}
                    />
                ) : (
                    <Text style={{ width: 20 }} /> // Spacer
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.selectionOverlay} pointerEvents="none" />
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.name}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 100 }} // Padding to center items
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onMomentumScrollEnd={(ev) => {
                    const index = Math.round(ev.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (data[index]) {
                        onSelect(data[index].name);
                    }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 250,
        backgroundColor: '#1E251E', // Dark background like keyboard
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    selectionOverlay: {
        position: 'absolute',
        top: 100 + (ITEM_HEIGHT - 40) / 2, // Vertically center based on padding
        left: 20,
        right: 20,
        height: 40,
        backgroundColor: '#2F3A27',
        borderRadius: 10,
        zIndex: 0,
        // Wait, standard overlay usually sits behind. 
        // But FlatList is on top. 
        // I will use item styling for selection instead, overlay is just visual guide if needed.
        // Actually, let's remove overlay from Z-index if I style items directly.
        // But requested image shows a "highlight bar". 
        // Let's rely on item background color for simplicity.
        display: 'none'
    },
    item: {
        height: ITEM_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    selectedItem: {
        backgroundColor: '#2F3A27', // Highlight color
        marginHorizontal: 15,
        borderRadius: 10,
    },
    itemText: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },
    selectedItemText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
    }
});
