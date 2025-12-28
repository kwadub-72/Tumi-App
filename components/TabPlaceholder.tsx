import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

export default function TabPlaceholder() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Content Coming Soon</Text>
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
    text: {
        color: Colors.text,
        fontSize: 20,
    },
});
