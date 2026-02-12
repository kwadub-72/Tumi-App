import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TribeProfileScreen from '@/src/features/tribes/screens/TribeProfileScreen';

export default function TribeProfilePage() {
    const { id } = useLocalSearchParams();
    const tribeId = Array.isArray(id) ? id[0] : id;
    return <TribeProfileScreen tribeId={tribeId || ''} />;
}
