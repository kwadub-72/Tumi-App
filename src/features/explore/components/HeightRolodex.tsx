import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';

interface HeightRolodexProps {
    minFt?: number;
    maxFt?: number;
    selectedFt: number;
    selectedIn: number;
    onSelect: (ft: number, inch: number) => void;
}

const ITEM_HEIGHT = 50;

export default function HeightRolodex({ minFt = 4, maxFt = 7, selectedFt, selectedIn, onSelect }: HeightRolodexProps) {
    const ftListRef = useRef<FlatList>(null);
    const inListRef = useRef<FlatList>(null);

    const feetOptions = Array.from({ length: maxFt - minFt + 1 }, (_, i) => minFt + i);
    const inchesOptions = Array.from({ length: 12 }, (_, i) => i);

    // Initial scroll setup logic (omitted for brevity, can be added if needed to jump on open)

    const renderFtItem = ({ item, index }: { item: number; index: number }) => {
        const isSelected = item === selectedFt;
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                onPress={() => {
                    onSelect(item, selectedIn);
                    ftListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                }}
            >
                <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{item}'</Text>
            </TouchableOpacity>
        );
    };

    const renderInItem = ({ item, index }: { item: number; index: number }) => {
        const isSelected = item === selectedIn;
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                onPress={() => {
                    onSelect(selectedFt, item);
                    inListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                }}
            >
                <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{item}"</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.column}>
                <Text style={styles.colHeader}>Feet</Text>
                <FlatList
                    ref={ftListRef}
                    data={feetOptions}
                    renderItem={renderFtItem}
                    keyExtractor={item => `ft-${item}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 100 }}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                />
            </View>
            <View style={styles.divider} />
            <View style={styles.column}>
                <Text style={styles.colHeader}>Inches</Text>
                <FlatList
                    ref={inListRef}
                    data={inchesOptions}
                    renderItem={renderInItem}
                    keyExtractor={item => `in-${item}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 100 }}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 250,
        backgroundColor: '#1E251E',
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    column: {
        flex: 1,
        alignItems: 'center',
    },
    colHeader: {
        color: '#8FA88F',
        marginTop: 10,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        backgroundColor: '#2F3A27',
        marginVertical: 20,
    },
    item: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    selectedItem: {
        backgroundColor: '#2F3A27',
        borderRadius: 10,
        width: '80%',
    },
    itemText: {
        fontSize: 20,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },
    selectedItemText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 24,
    }
});
