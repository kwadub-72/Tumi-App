import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface HeightRolodexProps {
    minFt?: number;
    maxFt?: number;
    selectedFt: number;
    selectedIn: number;
    onSelect: (ft: number, inch: number) => void;
}

const ITEM_HEIGHT = 50;
const CONTAINER_HEIGHT = 250;
const OFFSET_PAD = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 100

export default function HeightRolodex({ minFt = 1, maxFt = 9, selectedFt, selectedIn, onSelect }: HeightRolodexProps) {
    const ftListRef = useRef<FlatList>(null);
    const inListRef = useRef<FlatList>(null);
    const isTappingFt = useRef(false);
    const isTappingIn = useRef(false);

    const feetOptions = Array.from({ length: maxFt - minFt + 1 }, (_, i) => minFt + i);
    const inchesOptions = Array.from({ length: 12 }, (_, i) => i);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const ftIndex = feetOptions.indexOf(selectedFt);
            if (ftIndex !== -1) {
                ftListRef.current?.scrollToOffset({ offset: ftIndex * ITEM_HEIGHT, animated: false });
            }
            const inIndex = inchesOptions.indexOf(selectedIn);
            if (inIndex !== -1) {
                inListRef.current?.scrollToOffset({ offset: inIndex * ITEM_HEIGHT, animated: false });
            }
        }, 150);
        return () => clearTimeout(timeout);
    }, []);

    const onFtScrollEnd = (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isTappingFt.current) return;
        const index = Math.round(ev.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        if (feetOptions[index] !== undefined && feetOptions[index] !== selectedFt) {
            onSelect(feetOptions[index], selectedIn);
        }
    };

    const onInScrollEnd = (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isTappingIn.current) return;
        const index = Math.round(ev.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        if (inchesOptions[index] !== undefined && inchesOptions[index] !== selectedIn) {
            onSelect(selectedFt, inchesOptions[index]);
        }
    };

    const renderFtItem = ({ item, index }: { item: number; index: number }) => {
        const isSelected = item === selectedFt;
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                onPress={() => {
                    isTappingFt.current = true;
                    onSelect(item, selectedIn);
                    ftListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
                    setTimeout(() => { isTappingFt.current = false; }, 500);
                }}
            >
                <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{item}&apos;</Text>
            </TouchableOpacity>
        );
    };

    const renderInItem = ({ item, index }: { item: number; index: number }) => {
        const isSelected = item === selectedIn;
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                onPress={() => {
                    isTappingIn.current = true;
                    onSelect(selectedFt, item);
                    inListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
                    setTimeout(() => { isTappingIn.current = false; }, 500);
                }}
            >
                <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{item}&quot;</Text>
            </TouchableOpacity>
        );
    };

    const Spacer = () => <View style={{ height: OFFSET_PAD }} />;

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
                    snapToInterval={ITEM_HEIGHT}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    ListHeaderComponent={Spacer}
                    ListFooterComponent={Spacer}
                    getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                    onMomentumScrollEnd={onFtScrollEnd}
                    onScrollBeginDrag={() => { isTappingFt.current = false; }}
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
                    snapToInterval={ITEM_HEIGHT}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    ListHeaderComponent={Spacer}
                    ListFooterComponent={Spacer}
                    getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                    onMomentumScrollEnd={onInScrollEnd}
                    onScrollBeginDrag={() => { isTappingIn.current = false; }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: CONTAINER_HEIGHT,
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
