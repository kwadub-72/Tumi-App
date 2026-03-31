import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#4F6352'; // Dark Green Background
const DARK_GREEN = '#2F3A27';

export default function SignupWelcome() {
    const router = useRouter();
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleEnter = () => {
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <TabonoLogo size={120} color="black" />

                <Text style={styles.title}>Welcome to{'\n'}Tribe</Text>

                <TouchableOpacity style={styles.enterButton} onPress={handleEnter}>
                    <Text style={styles.enterText}>Enter</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
    },
    title: {
        fontSize: 48,
        color: CREAM_COLOR,
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: 50,
    },
    enterButton: {
        backgroundColor: DARK_GREEN,
        paddingVertical: 15,
        paddingHorizontal: 60,
        borderRadius: 30,
        marginTop: 40,
    },
    enterText: {
        color: CREAM_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
