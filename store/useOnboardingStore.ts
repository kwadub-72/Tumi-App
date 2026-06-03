import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { decode } from 'base64-arraybuffer';

interface OnboardingState {
    handle: string;
    name: string;
    email: string;
    password: string;
    dob: string; // YYYY-MM-DD
    height_cm: number | null;
    weight_lbs: number | null;
    sex: string | null;
    unitSystem: 'imperial' | 'metric';
    rawHeight: any; // Can hold a cm number, or { feet: number, inches: number }
    rawWeight: string; // Decimal string
    liftingExperience: string | null; // e.g., 'Advanced', 'General'
    activityLevel: string | null; // 'Sedentary' | 'Lightly active' | 'Active' | 'Very active'
    activity: string;
    is_private: boolean;
    selectedMapIds: string[];
    selectedTribeIds: string[];
    followedUserIds: string[];
    protein: number | null;
    carbs: number | null;
    fats: number | null;
    calories: number | null;
    bio: string;
    avatarUri: string | null;
    avatarBase64: string | null;

    // Setters
    setHandle: (handle: string) => void;
    setName: (name: string) => void;
    setEmail: (email: string) => void;
    setPassword: (password: string) => void;
    setDob: (dob: string) => void;
    setHeightCm: (height_cm: number | null) => void;
    setWeightLbs: (weight_lbs: number | null) => void;
    setSex: (sex: string | null) => void;
    setUnitSystem: (unitSystem: 'imperial' | 'metric') => void;
    setRawHeight: (rawHeight: any) => void;
    setRawWeight: (rawWeight: string) => void;
    setLiftingExperience: (liftingExperience: string | null) => void;
    setActivityLevel: (activityLevel: string | null) => void;
    setActivity: (activity: string) => void;
    setIsPrivate: (is_private: boolean) => void;
    setSelectedMapIds: (selectedMapIds: string[]) => void;
    setSelectedTribeIds: (selectedTribeIds: string[]) => void;
    setFollowedUserIds: (followedUserIds: string[]) => void;
    setMacros: (macros: { protein: number; carbs: number; fats: number; calories: number }) => void;
    setBio: (bio: string) => void;
    setAvatarUri: (uri: string | null) => void;
    setAvatarBase64: (base64: string | null) => void;

    // Actions
    generateAndSetMacros: (experience: string, activity: string) => void;
    submitOnboarding: (optionalUserId?: string) => Promise<{ success: boolean; error: Error | null; requiresEmailConfirmation?: boolean }>;
    reset: () => void;
}

const initialState = {
    handle: '',
    name: '',
    email: '',
    password: '',
    dob: '',
    height_cm: null,
    weight_lbs: null,
    sex: null,
    unitSystem: 'imperial' as const,
    rawHeight: null,
    rawWeight: '',
    liftingExperience: null,
    activityLevel: null,
    activity: 'moderate', // default
    is_private: false,
    selectedMapIds: [],
    selectedTribeIds: [],
    followedUserIds: [],
    protein: null,
    carbs: null,
    fats: null,
    calories: null,
    bio: '',
    avatarUri: null,
    avatarBase64: null,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    ...initialState,

    setHandle: (handle) => set({ handle }),
    setName: (name) => set({ name }),
    setEmail: (email) => set({ email }),
    setPassword: (password) => set({ password }),
    setDob: (dob) => set({ dob }),
    setHeightCm: (height_cm) => set({ height_cm }),
    setWeightLbs: (weight_lbs) => set({ weight_lbs }),
    setSex: (sex) => set({ sex }),
    setUnitSystem: (unitSystem) => set({ unitSystem }),
    setRawHeight: (rawHeight) => set({ rawHeight }),
    setRawWeight: (rawWeight) => set({ rawWeight }),
    setLiftingExperience: (liftingExperience) => set({ liftingExperience }),
    setActivityLevel: (activityLevel) => set({ activityLevel }),
    setActivity: (activity) => set({ activity }),
    setIsPrivate: (is_private) => set({ is_private }),
    setSelectedMapIds: (selectedMapIds) => set({ selectedMapIds }),
    setSelectedTribeIds: (selectedTribeIds) => set({ selectedTribeIds }),
    setFollowedUserIds: (followedUserIds) => set({ followedUserIds }),
    setMacros: (macros) => set({ ...macros }),
    setBio: (bio) => set({ bio }),
    setAvatarUri: (avatarUri) => set({ avatarUri }),
    setAvatarBase64: (avatarBase64) => set({ avatarBase64 }),

    generateAndSetMacros: (experience: string, activity: string) => {
        const state = get();

        // Diagnostic Injection
        console.log("RAW EXTRACT:", { rawDob: get().dob, rawWeight: get().rawWeight, rawHeight: get().rawHeight });

        // 1. Nuclear Age Parser
        const rawDob = get().dob || '';
        let age = 25; // Default safety fallback
        
        // A. Attempt standard Date parsing
        const parsedDate = new Date(rawDob);
        if (!isNaN(parsedDate.getTime())) {
            age = new Date().getFullYear() - parsedDate.getFullYear();
        } else {
            // B. Fallback: Regex to extract the first 4-digit year format found
            const yearMatch = rawDob.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                age = new Date().getFullYear() - parseInt(yearMatch[0], 10);
            }
        }
        
        // C. Biological Safeguard: Prevent absurd biological ages from breaking the RMR math
        if (age < 12 || age > 100 || isNaN(age)) {
            age = 25;
        }

        // 2. Weight (kg)
        let rawW = parseFloat(state.rawWeight as any) || parseFloat(state.weight_lbs as any) || 0;
        if (rawW === 0) console.error("CRITICAL: Weight is missing from store!");
        const weightKg = state.unitSystem === 'imperial' ? rawW / 2.20462 : rawW;

        // 3. Height (cm)
        let heightCm = 0;
        if (state.unitSystem === 'imperial') {
            const ft = parseFloat(state.rawHeight?.feet) || 0;
            const inc = parseFloat(state.rawHeight?.inches) || 0;
            heightCm = (ft * 30.48) + (inc * 2.54);
        } else {
            heightCm = parseFloat(state.rawHeight) || parseFloat(state.height_cm as any) || 0;
        }

        // 4. RMR
        const rmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (state.sex === 'Female' ? -161 : 5);

        // 5. Multiplier Logic
        let multiplier = 1.2; // Fallback
        const isAdv = experience.includes('Advanced');
        const isCas = experience.includes('General') || experience.includes('Casual');
        const isSed = activity.includes('Sedentary');
        const isLight = activity.includes('Lightly');
        const isAct = activity === 'Active' || activity.includes('Active:'); // Avoid Very Active collision
        const isVery = activity.includes('Very active');

        if (state.sex === 'Male') {
            if (isAdv && isSed) multiplier = 1.62; else if (isAdv && isLight) multiplier = 1.7; else if (isAdv && isAct) multiplier = 2.0; else if (isAdv && isVery) multiplier = 2.5;
            else if (isCas && isSed) multiplier = 1.15; else if (isCas && isLight) multiplier = 1.45; else if (isCas && isAct) multiplier = 1.75; else if (isCas && isVery) multiplier = 2.0;
        } else {
            if (isAdv && isSed) multiplier = 1.458; else if (isAdv && isLight) multiplier = 1.53; else if (isAdv && isAct) multiplier = 1.8; else if (isAdv && isVery) multiplier = 2.25;
            else if (isCas && isSed) multiplier = 1.035; else if (isCas && isLight) multiplier = 1.305; else if (isCas && isAct) multiplier = 1.575; else if (isCas && isVery) multiplier = 1.845;
        }

        // 6. Macros
        const tdee = rmr * multiplier;
        const protein = 2.2 * weightKg;
        const fats = 0.7 * weightKg;
        const carbs = Math.max(0, (tdee - (fats * 9) - (protein * 4)) / 4);

        // 7. Diagnostic Logging
        console.log({ age, weightKg, heightCm, sex: state.sex, experience, activity, rmr, multiplier, tdee });

        // 8. Commit
        set({ protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats), calories: Math.round(tdee) });
    },

    submitOnboarding: async (optionalUserId?: string) => {
        const state = get();
        let finalUserId = optionalUserId;
        let authData: any = null;

        try {
            // 1. If email and password are provided, perform client sign-up
            if (state.email && state.password) {
                const { data, error: authError } = await supabase.auth.signUp({
                    email: state.email,
                    password: state.password,
                    options: {
                        data: {
                            handle: state.handle,
                            name: state.name,
                            bio: state.bio,
                            is_private: state.is_private,
                            avatar_url: state.avatarUri,
                        }
                    }
                });
                authData = data;

                if (authError) {
                    return { success: false, error: new Error(authError.message) };
                }

                if (!authData.user?.id) {
                    return { success: false, error: new Error('Sign up succeeded, but no user ID was returned.') };
                }

                finalUserId = authData.user.id;
            }

            if (!finalUserId) {
                return { success: false, error: new Error('User ID is required to submit onboarding data.') };
            }

            // Dynamically calculate weight_lbs from rawWeight
            let calculatedWeightLbs: number | null = null;
            if (state.rawWeight) {
                const parsedWeight = parseFloat(state.rawWeight);
                if (!isNaN(parsedWeight)) {
                    if (state.unitSystem === 'metric') {
                        calculatedWeightLbs = parsedWeight * 2.20462;
                    } else {
                        calculatedWeightLbs = parsedWeight;
                    }
                }
            }

            // Dynamically calculate height_cm from rawHeight
            let calculatedHeightCm: number | null = null;
            if (state.rawHeight !== null && state.rawHeight !== undefined) {
                if (state.unitSystem === 'metric') {
                    const parsedHeight = parseFloat(state.rawHeight);
                    if (!isNaN(parsedHeight)) {
                        calculatedHeightCm = parsedHeight;
                    }
                } else if (typeof state.rawHeight === 'object') {
                    const feet = parseFloat(state.rawHeight.feet || 0);
                    const inches = parseFloat(state.rawHeight.inches || 0);
                    calculatedHeightCm = (feet * 30.48) + (inches * 2.54);
                } else {
                    const parsedHeight = parseFloat(state.rawHeight);
                    if (!isNaN(parsedHeight)) {
                        calculatedHeightCm = parsedHeight;
                    }
                }
            }

            const finalHeightCm = calculatedHeightCm ?? state.height_cm;
            const finalWeightLbs = calculatedWeightLbs ?? state.weight_lbs;

            // 1.5. Wire the Supabase Storage Upload for Avatar image
            let finalAvatarUrl = null;
            const hasSession = authData?.session || (await supabase.auth.getSession()).data.session;
            if (hasSession && state.avatarBase64 && state.avatarUri) {
                try {
                    const arrayBuffer = decode(state.avatarBase64);
                    const fileExt = state.avatarUri.split('.').pop() || 'jpeg';
                    const fileName = `${finalUserId}-${Date.now()}.${fileExt}`;
                    const filePath = `${finalUserId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, arrayBuffer, {
                            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                            upsert: true
                        });

                    if (!uploadError) {
                        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                        finalAvatarUrl = publicUrlData.publicUrl;
                    } else {
                        console.error('Avatar upload failed storage error:', uploadError);
                    }
                } catch (err) {
                    console.error('Avatar upload failed exception:', err);
                    // Proceed anyway so the user isn't hard-blocked by an image upload failure
                }
            }

            // 1.8. Bulletproof DOB Formatter
            let finalDob = null;
            if (state.dob) {
                const rawDob = typeof state.dob === 'string' ? state.dob.trim() : String(state.dob);
                if (rawDob !== '' && rawDob !== 'null' && rawDob !== 'undefined') {
                    const d = new Date(rawDob);
                    if (!isNaN(d.getTime())) {
                        finalDob = d.toISOString().split('T')[0];
                    }
                }
            }

            // 2. Format precise JSON payload
            const payload = {
                user_id: finalUserId,
                handle: state.handle,
                name: state.name,
                height_cm: finalHeightCm ? Math.round(Number(finalHeightCm)) : null,
                weight_lbs: finalWeightLbs ? Math.round(Number(finalWeightLbs)) : null,
                sex: state.sex,
                lifting_experience: state.liftingExperience,
                activity: state.activity,
                is_private: state.is_private,
                selected_map_ids: state.selectedMapIds,
                selected_tribe_ids: state.selectedTribeIds,
                followed_user_ids: state.followedUserIds,
                protein: state.protein ? Math.round(Number(state.protein)) : null,
                carbs: state.carbs ? Math.round(Number(state.carbs)) : null,
                fats: state.fats ? Math.round(Number(state.fats)) : null,
                calories: state.calories ? Math.round(Number(state.calories)) : null,
                dob: finalDob,
                bio: state.bio,
                avatar_url: finalAvatarUrl,
            };

            // 3. Call database RPC transaction to commit user onboarding relational tables
            const { error: rpcError } = await supabase.rpc('finalize_user_onboarding', {
                payload,
            });

            if (rpcError) {
                return { success: false, error: new Error(rpcError.message) };
            }

            // Insert initial weight entry into the weights table for Day 1
            if (payload.weight_lbs) {
                const todayStr = new Date().toISOString().split('T')[0];
                const { error: weightError } = await supabase
                    .from('weights')
                    .upsert({
                        user_id: finalUserId,
                        weight: payload.weight_lbs,
                        date: todayStr
                    }, { onConflict: 'user_id,date' });

                if (weightError) {
                    console.error('Failed to insert initial weight entry during onboarding:', weightError);
                }
            }

            // Check if session exists (it will be null if email confirmation is pending)
            const requiresEmailConfirmation = authData ? !authData.session : false;

            // Clean up transient store after successful submission only if no confirmation is required.
            // If confirmation is required, we preserve the store state (email/password) to allow auto-login verification.
            if (!requiresEmailConfirmation) {
                set(initialState);
            }
            return { success: true, error: null, requiresEmailConfirmation };
        } catch (err) {
            return { 
                success: false, 
                error: err instanceof Error ? err : new Error('Unknown error during onboarding submission'),
                requiresEmailConfirmation: false
            };
        }
    },

    reset: () => set(initialState),
}));
