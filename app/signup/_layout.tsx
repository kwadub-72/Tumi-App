import { Stack } from 'expo-router';

export default function SignupLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="focus" />
            <Stack.Screen name="maintenance-strategy" />
            <Stack.Screen name="manual-macros" />
            <Stack.Screen name="body-metrics" />
            <Stack.Screen name="tribe-macros" />
            <Stack.Screen name="confirm-macros" />
            <Stack.Screen name="update-plan" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="welcome" />
        </Stack>
    );
}
