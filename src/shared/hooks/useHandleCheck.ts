import { useState, useEffect } from 'react';
import { supabase } from '@/src/shared/services/supabase';

interface UseHandleCheckResult {
    isAvailable: boolean | null;
    isValidating: boolean;
    error: Error | null;
}

/**
 * Debounced hook to check if a handle is available via RPC.
 * Cleans the input (lowercase, no spaces) and pings the database.
 */
export function useHandleCheck(username: string): UseHandleCheckResult {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isValidating, setIsValidating] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Clean the input: lowercase and strip all spaces
        const cleanedHandle = username.toLowerCase().replace(/\s/g, '');

        if (!cleanedHandle) {
            setIsAvailable(null);
            setIsValidating(false);
            setError(null);
            return;
        }

        setIsValidating(true);
        setError(null);

        // Implement 300ms debounce
        const debounceTimeout = setTimeout(async () => {
            try {
                // Ping the RPC to check availability
                const { data, error: rpcError } = await supabase.rpc('check_handle_available', {
                    handle: cleanedHandle,
                });

                if (rpcError) {
                    throw rpcError;
                }

                // Assuming the RPC returns a boolean (true if available)
                setIsAvailable(!!data);
            } catch (err) {
                setIsAvailable(null);
                setError(err instanceof Error ? err : new Error('Failed to validate handle'));
            } finally {
                setIsValidating(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimeout);
    }, [username]);

    return { isAvailable, isValidating, error };
}
