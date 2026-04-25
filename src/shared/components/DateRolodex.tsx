import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface DateRolodexProps {
    selectedDate: Date;
    onSelect: (date: Date) => void;
}

const ITEM_HEIGHT = 60;
const CONTAINER_HEIGHT = 300;
const OFFSET_PAD = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 120

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DateRolodex({ selectedDate, onSelect }: DateRolodexProps) {
    const monthListRef = useRef<FlatList>(null);
    const dayListRef = useRef<FlatList>(null);
    const yearListRef = useRef<FlatList>(null);

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 100;
    const maxYear = currentYear;

    const yearsOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
    const monthsOptions = Array.from({ length: 12 }, (_, i) => i);

    // Get days in selected month/year
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const daysOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const isTapping = useRef(false);

    // Initial scroll
    useEffect(() => {
        const timeout = setTimeout(() => {
            scrollToDate(selectedDate, false);
        }, 150);
        return () => clearTimeout(timeout);
    }, []);

    const scrollToDate = (date: Date, animated: boolean) => {
        const monthIdx = date.getMonth();
        const dayIdx = date.getDate() - 1;
        const yearIdx = yearsOptions.indexOf(date.getFullYear());

        if (monthIdx !== -1) monthListRef.current?.scrollToOffset({ offset: monthIdx * ITEM_HEIGHT, animated });
        if (dayIdx !== -1) dayListRef.current?.scrollToOffset({ offset: dayIdx * ITEM_HEIGHT, animated });
        if (yearIdx !== -1) yearListRef.current?.scrollToOffset({ offset: yearIdx * ITEM_HEIGHT, animated });
    };

    const handleSelectMonth = (month: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(month);
        const newDaysInMonth = new Date(newDate.getFullYear(), month + 1, 0).getDate();
        if (newDate.getDate() > newDaysInMonth) {
            newDate.setDate(newDaysInMonth);
        }
        onSelect(newDate);
    };

    const handleSelectDay = (day: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(day);
        onSelect(newDate);
    };

    const handleSelectYear = (year: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(year);
        const newDaysInMonth = new Date(year, newDate.getMonth() + 1, 0).getDate();
        if (newDate.getDate() > newDaysInMonth) {
            newDate.setDate(newDaysInMonth);
        }
        onSelect(newDate);
    };

    const onScrollEnd = (type: 'month' | 'day' | 'year') => (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isTapping.current) return;
        
        const index = Math.round(ev.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        
        if (type === 'month') {
            const val = monthsOptions[index];
            if (val !== undefined && val !== selectedDate.getMonth()) handleSelectMonth(val);
        } else if (type === 'day') {
            const val = daysOptions[index];
            if (val !== undefined && val !== selectedDate.getDate()) handleSelectDay(val);
        } else if (type === 'year') {
            const val = yearsOptions[index];
            if (val !== undefined && val !== selectedDate.getFullYear()) handleSelectYear(val);
        }
    };

    const renderItem = (type: 'month' | 'day' | 'year') => ({ item, index }: { item: number; index: number }) => {
        let isSelected = false;
        let label = '';
        let onPress = () => {
            isTapping.current = true;
            if (type === 'month') {
                handleSelectMonth(item);
                monthListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
            } else if (type === 'day') {
                handleSelectDay(item);
                dayListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
            } else {
                handleSelectYear(item);
                yearListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
            }
            setTimeout(() => { isTapping.current = false; }, 500);
        };

        if (type === 'month') {
            isSelected = item === selectedDate.getMonth();
            label = MONTHS[item];
        } else if (type === 'day') {
            isSelected = item === selectedDate.getDate();
            label = item.toString();
        } else {
            isSelected = item === selectedDate.getFullYear();
            label = item.toString();
        }

        return (
            <TouchableOpacity
                style={styles.item}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.bubble, isSelected && styles.selectedBubble]}>
                    <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const Spacer = () => <View style={{ height: OFFSET_PAD }} />;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.headerCol}><Text style={styles.colHeader}>Mon</Text></View>
                <View style={styles.headerCol}><Text style={styles.colHeader}>Day</Text></View>
                <View style={styles.headerCol}><Text style={styles.colHeader}>Year</Text></View>
            </View>

            <View style={styles.pickerBody}>
                <View style={styles.column}>
                    <FlatList
                        ref={monthListRef}
                        data={monthsOptions}
                        renderItem={renderItem('month')}
                        keyExtractor={item => `mo-${item}`}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={ITEM_HEIGHT}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        ListHeaderComponent={Spacer}
                        ListFooterComponent={Spacer}
                        getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                        onMomentumScrollEnd={onScrollEnd('month')}
                        onScrollBeginDrag={() => { isTapping.current = false; }}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.column}>
                    <FlatList
                        ref={dayListRef}
                        data={daysOptions}
                        renderItem={renderItem('day')}
                        keyExtractor={item => `da-${item}`}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={ITEM_HEIGHT}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        ListHeaderComponent={Spacer}
                        ListFooterComponent={Spacer}
                        getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                        onMomentumScrollEnd={onScrollEnd('day')}
                        onScrollBeginDrag={() => { isTapping.current = false; }}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.column}>
                    <FlatList
                        ref={yearListRef}
                        data={yearsOptions}
                        renderItem={renderItem('year')}
                        keyExtractor={item => `yr-${item}`}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={ITEM_HEIGHT}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        ListHeaderComponent={Spacer}
                        ListFooterComponent={Spacer}
                        getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                        onMomentumScrollEnd={onScrollEnd('year')}
                        onScrollBeginDrag={() => { isTapping.current = false; }}
                    />
                </View>
            </View>
        </View>
    );
}

const CREAM_COLOR = '#EAE8D9';
const CONTAINER_BG = '#4A5D4E';
const DARK_TEXT = '#3B4D40';

const styles = StyleSheet.create({
    container: {
        height: CONTAINER_HEIGHT,
        backgroundColor: CONTAINER_BG,
        borderRadius: 25,
        width: '100%',
        paddingTop: 15,
        paddingBottom: 5,
    },
    headerRow: {
        flexDirection: 'row',
        paddingHorizontal: 5,
        marginBottom: 10,
    },
    headerCol: {
        flex: 1,
        alignItems: 'center',
    },
    pickerBody: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 15,
    },
    column: {
        flex: 1,
        alignItems: 'center',
    },
    colHeader: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 'bold',
        fontSize: 16,
    },
    divider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginVertical: 50,
    },
    item: {
        height: ITEM_HEIGHT,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubble: {
        height: 40,
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    selectedBubble: {
        backgroundColor: CREAM_COLOR,
    },
    itemText: {
        fontSize: 22,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    selectedItemText: {
        color: DARK_TEXT,
        fontWeight: 'bold',
        fontSize: 22,
    }
});
