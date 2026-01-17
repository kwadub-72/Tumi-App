import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

export default function TribeView() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tribe Activity</Text>
            <Text style={styles.subtitle}>Select a tribe to see updates</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textDark,
    },
    subtitle: {
        color: Colors.textDim,
        marginTop: 10,
    }
});
