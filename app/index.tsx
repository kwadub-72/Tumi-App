import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Colors based on user description/images
const BG_COLOR = '#3E5245'; // Dark Sage/Green from Image 1 impression
const CREAM_COLOR = '#EAE8D9'; // "Image 3" color (approx)
const TEXT_COLOR = '#F5F5DC'; // Beige text

const TabonoLogo = ({ size = 200, color = CREAM_COLOR }: { size?: number, color?: string }) => {
    // Tabono symbol consists of 4 paddle-like shapes joined at the center.
    // Approximated with 4 rotated petals.
    const petalPath = "M0 0 C 25 -25, 50 -60, 0 -90 C -50 -60, -25 -25, 0 0";

    return (
        <Svg width={size} height={size} viewBox="0 0 200 200">
            <G transform="translate(100, 100)">
                {[0, 90, 180, 270].map((rotation, i) => (
                    <G key={i} transform={`rotate(${rotation})`}>
                        <Path
                            d={petalPath}
                            fill={color}
                        />
                    </G>
                ))}
            </G>
        </Svg>
    );
};

export default function WelcomeScreen() {
    const router = useRouter();

    const handleLogin = () => {
        // Navigate to the main app (Feed)
        router.replace('/(tabs)');
    };

    const handleCreateAccount = () => {
        // Just log for now as per instructions "but when he presses log-in, it should take him to the feed screen"
        // Create account action not specified.
        console.log("Create Account pressed");
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <TabonoLogo size={width * 0.5} color={CREAM_COLOR} />
                    <Text style={styles.title}>Tribe</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
                        <Text style={styles.buttonText}>Create an account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Log in</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#435D4C', // Matches the greenish background in Image 1
    },
    content: {
        flex: 1,
        justifyContent: 'center', // Center vertically
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 80, // Space between logo and buttons
        gap: 20,
    },
    title: {
        fontSize: 64,
        fontWeight: '400', // Thin/Regular font weight as shown
        color: '#EAE8D9', // Matching logo color or specific text color
        letterSpacing: 2,
        fontFamily: 'System',
        marginTop: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 20,
        position: 'absolute',
        bottom: 80, // Position buttons at bottom
    },
    button: {
        backgroundColor: '#EAE8D9', // Cream button
        paddingVertical: 18,
        borderRadius: 30, // Pill shape
        alignItems: 'center',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButton: {
        // Login button style identical to Create Account in Image 1
    },
    buttonText: {
        color: '#2F3A27', // Dark green text
        fontSize: 18,
        fontWeight: '600',
    }
});
