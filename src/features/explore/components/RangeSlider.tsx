import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, PanResponder, Text, Dimensions } from 'react-native';

interface RangeSliderProps {
    min: number;
    max: number;
    initialMin: number;
    initialMax: number;
    onValuesChange: (min: number, max: number) => void;
    onStartDragging?: () => void;
    onEndDragging?: () => void;
}

export default function RangeSlider({ min, max, initialMin, initialMax, onValuesChange, onStartDragging, onEndDragging }: RangeSliderProps) {
    const [containerWidth, setContainerWidth] = useState(0);

    // We keep local state for rapid UI updates, but sync with props if needed
    const [minValue, setMinValue] = useState(initialMin);
    const [maxValue, setMaxValue] = useState(initialMax);

    const startMin = useRef(initialMin);
    const startMax = useRef(initialMax);

    useEffect(() => {
        setMinValue(initialMin);
        setMaxValue(initialMax);
    }, [initialMin, initialMax]);

    const valueToPosition = (value: number) => {
        if (containerWidth === 0) return 0;
        return ((value - min) / (max - min)) * containerWidth;
    };

    const positionToValue = (pos: number) => {
        if (containerWidth === 0) return min;
        const ratio = Math.max(0, Math.min(1, pos / containerWidth));
        const val = min + ratio * (max - min);
        return Math.round(val);
    };

    const panResponderMin = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,
            onPanResponderGrant: () => {
                startMin.current = minValue;
                onStartDragging?.();
            },
            onPanResponderMove: (_, gestureState) => {
                if (containerWidth === 0) return;
                const startPos = ((startMin.current - min) / (max - min)) * containerWidth;
                const newPos = startPos + gestureState.dx;
                let newVal = positionToValue(newPos);

                // Constraint: min <= newVal < maxValue
                newVal = Math.max(min, Math.min(newVal, maxValue - 1));

                if (newVal !== minValue) {
                    setMinValue(newVal);
                }
            },
            onPanResponderRelease: () => {
                onValuesChange(minValue, maxValue);
                onEndDragging?.();
            },
            onPanResponderTerminate: () => {
                onEndDragging?.();
            }
        })
    ).current;

    const panResponderMax = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,
            onPanResponderGrant: () => {
                startMax.current = maxValue;
                onStartDragging?.();
            },
            onPanResponderMove: (_, gestureState) => {
                if (containerWidth === 0) return;
                const startPos = ((startMax.current - min) / (max - min)) * containerWidth;
                const newPos = startPos + gestureState.dx;
                let newVal = positionToValue(newPos);

                // Constraint: minValue < newVal <= max
                newVal = Math.max(minValue + 1, Math.min(newVal, max));

                if (newVal !== maxValue) {
                    setMaxValue(newVal);
                }
            },
            onPanResponderRelease: () => {
                onValuesChange(minValue, maxValue);
                onEndDragging?.();
            },
            onPanResponderTerminate: () => {
                onEndDragging?.();
            }
        })
    ).current;

    return (
        <View style={styles.container}>
            <View style={styles.labels}>
                <Text style={styles.label}>Body fat</Text>
                <View style={styles.valueBox}>
                    <Text style={styles.valueText}>{minValue}-{maxValue}%</Text>
                </View>
            </View>
            <View
                style={styles.trackContainer}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {/* Background Track */}
                <View style={styles.trackBackground} />

                {/* Active Track */}
                <View
                    style={[
                        styles.trackActive,
                        {
                            left: `${((minValue - min) / (max - min)) * 100}%`,
                            width: `${((maxValue - minValue) / (max - min)) * 100}%`
                        }
                    ]}
                    pointerEvents="none"
                />

                {/* Min Thumb */}
                <View
                    style={[
                        styles.thumb,
                        { left: `${((minValue - min) / (max - min)) * 100}%`, marginLeft: -12 }
                    ]}
                    hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                    {...panResponderMin.panHandlers}
                />

                {/* Max Thumb */}
                <View
                    style={[
                        styles.thumb,
                        { left: `${((maxValue - min) / (max - min)) * 100}%`, marginLeft: -12 }
                    ]}
                    hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                    {...panResponderMax.panHandlers}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        marginTop: 5,
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2F3A27',
    },
    valueBox: {
        backgroundColor: '#F5F5DC',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#2F3A27',
    },
    valueText: {
        fontWeight: 'bold',
        color: '#2F3A27',
    },
    trackContainer: {
        height: 30,
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    trackBackground: {
        height: 4,
        backgroundColor: 'rgba(47, 58, 39, 0.2)', // Faded green
        borderRadius: 2,
        position: 'absolute',
        left: 0,
        right: 0,
    },
    trackActive: {
        height: 4,
        backgroundColor: '#F5F5DC',
        borderRadius: 2,
        position: 'absolute',
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F5F5DC',
        position: 'absolute',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    }
});
