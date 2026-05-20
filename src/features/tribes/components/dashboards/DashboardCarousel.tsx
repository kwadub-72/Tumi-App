import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, StyleProp, ViewStyle } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardCarouselProps {
    children: React.ReactNode | React.ReactNode[];
    initialIndex?: number;
    itemWidth?: number;
    containerStyle?: StyleProp<ViewStyle>;
    scrollViewStyle?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
}

export const DashboardCarousel: React.FC<DashboardCarouselProps> = ({ 
    children, 
    initialIndex = 0, 
    itemWidth,
    containerStyle,
    scrollViewStyle,
    contentContainerStyle
}) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const childrenArray = React.Children.toArray(children);
    
    const resolvedItemWidth = itemWidth !== undefined ? itemWidth : SCREEN_WIDTH - 40;
    const initialScrollIndex = Math.min(Math.max(0, initialIndex), childrenArray.length - 1) + 1;
    const [activeIndex, setActiveIndex] = useState(initialScrollIndex);

    // Jump to the first real item initially
    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: initialScrollIndex * resolvedItemWidth, animated: false });
        }
    }, [resolvedItemWidth, initialScrollIndex]);

    // If only 1 child, no carousel needed.
    if (!childrenArray || childrenArray.length <= 1) {
        return <View style={containerStyle}>{childrenArray}</View>;
    }

    // To simulate infinite scroll, prepend the last item and append the first item.
    const firstItem = childrenArray[0];
    const lastItem = childrenArray[childrenArray.length - 1];
    const extendedChildren = [lastItem, ...childrenArray, firstItem];

    const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const xOffset = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(xOffset / resolvedItemWidth);

        if (newIndex === 0) {
            // Scrolled to the fake last item at the beginning, immediately jump to real last item
            scrollViewRef.current?.scrollTo({ x: childrenArray.length * resolvedItemWidth, animated: false });
            setActiveIndex(childrenArray.length);
        } else if (newIndex === extendedChildren.length - 1) {
            // Scrolled to the fake first item at the end, immediately jump to real first item
            scrollViewRef.current?.scrollTo({ x: resolvedItemWidth, animated: false });
            setActiveIndex(1);
        } else {
            setActiveIndex(newIndex);
        }
    };

    return (
        <View style={[styles.carouselContainer, containerStyle]}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                // To prevent seeing the jump glitch, we might want to use scrollEventThrottle and intercept earlier,
                // but for simple cases onMomentumScrollEnd is fine.
                snapToInterval={resolvedItemWidth}
                decelerationRate="fast"
                style={[{ width: resolvedItemWidth }, scrollViewStyle]}
                contentContainerStyle={contentContainerStyle}
            >
                {extendedChildren.map((child, index) => (
                    <View key={index} style={{ width: resolvedItemWidth, height: '100%' }}>
                        {child}
                    </View>
                ))}
            </ScrollView>

            {/* Pagination Dots (optional but good for UX) */}
            <View style={styles.pagination}>
                {childrenArray.map((_, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.dot,
                            { opacity: (activeIndex === idx + 1 || (activeIndex === 0 && idx === childrenArray.length - 1) || (activeIndex === extendedChildren.length - 1 && idx === 0)) ? 1 : 0.4 }
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    carouselContainer: {
        marginBottom: 20,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'white',
    }
});
