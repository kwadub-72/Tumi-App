import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TribeMembersScreen from '@/src/features/tribes/screens/TribeMembersScreen';

export default function TribeMembersPage() {
    const { id } = useLocalSearchParams();
    const tribeId = Array.isArray(id) ? id[0] : id;
    return <TribeMembersScreen tribeId={tribeId || ''} />;
}
