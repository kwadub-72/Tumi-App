#!/usr/bin/env node
/**
 * Tumi App — Supabase Seed Script
 * Run: node scripts/seed.mjs
 *
 * Creates 11 auth users + profiles, follows, tribes, tribe_members,
 * and 12 posts per seed account (120 total).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uizxntbizmtdascebjqb.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpenhudGJpem10ZGFzY2VianFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTExNTAsImV4cCI6MjA5MDUyNzE1MH0.7w3YkRfOtn52QyiHJGfwijowp08laskdl83fRkJzhFA', {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ─── User definitions ─────────────────────────────────────────────────────────

const USERS = [
    {
        email: 'kwadub72@gmail.com',
        password: 'Tribe62',
        handle: '@kwadub',
        name: 'Kwaku Adubofour',
        avatar_url: 'https://i.pravatar.cc/150?u=kwadub',
        status: 'natural',
        activity: 'Bodybuilder (Cut)',
        activity_icon: 'hammer',
        height: "6'3",
        weight_lbs: 203,
        body_fat_pct: '8%',
        macro_targets: { p: 250, c: 200, f: 60, calories: 2380 },
        training_target: 'Lean is law.',
    },
    // ── 10 seed accounts ──────────────────────────────────────────────
    {
        email: 'jordan.smith@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@jsmith',
        name: 'Jordan Smith',
        avatar_url: 'https://i.pravatar.cc/150?u=1',
        status: 'natural',
        activity: 'Powerlifting',
        activity_icon: 'weight-lifter',
        height: "5'11",
        weight_lbs: 215,
        body_fat_pct: '12%',
        macro_targets: { p: 220, c: 380, f: 80, calories: 3160 },
        training_target: 'Total world domination.',
    },
    {
        email: 'alex.rivera@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@arivera',
        name: 'Alex Rivera',
        avatar_url: 'https://i.pravatar.cc/150?u=2',
        status: 'enhanced',
        activity: 'Bodybuilder (Bulk)',
        activity_icon: 'hammer',
        height: "6'1",
        weight_lbs: 230,
        body_fat_pct: '10%',
        macro_targets: { p: 280, c: 450, f: 100, calories: 3820 },
        training_target: 'Size over everything.',
        is_private: true,
    },
    {
        email: 'casey.jones@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@cjones',
        name: 'Casey Jones',
        avatar_url: 'https://i.pravatar.cc/150?u=3',
        status: 'natural',
        activity: 'Hybrid Athlete',
        activity_icon: 'infinity',
        height: "5'9",
        weight_lbs: 178,
        body_fat_pct: '9%',
        macro_targets: { p: 195, c: 310, f: 70, calories: 2690 },
        training_target: 'Strong AND fast.',
        is_private: true,
    },
    {
        email: 'riley.cooper@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@rcooper',
        name: 'Riley Cooper',
        avatar_url: 'https://i.pravatar.cc/150?u=4',
        status: 'none',
        activity: 'Distance Runner',
        activity_icon: 'run-fast',
        height: "5'7",
        weight_lbs: 148,
        body_fat_pct: '7%',
        macro_targets: { p: 160, c: 420, f: 55, calories: 2855 },
        training_target: 'Sub-3 marathon.',
    },
    {
        email: 'quinn.taylor@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@qtaylor',
        name: 'Quinn Taylor',
        avatar_url: 'https://i.pravatar.cc/150?u=5',
        status: 'natural',
        activity: 'Bodybuilder (Cut)',
        activity_icon: 'hammer',
        height: "5'10",
        weight_lbs: 185,
        body_fat_pct: '10%',
        macro_targets: { p: 225, c: 180, f: 55, calories: 2155 },
        training_target: 'Stage ready.',
    },
    {
        email: 'morgan.bailey@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@mbailey',
        name: 'Morgan Bailey',
        avatar_url: 'https://i.pravatar.cc/150?u=6',
        status: 'natural',
        activity: 'Glute Growth',
        activity_icon: 'cake-variant',
        height: "5'6",
        weight_lbs: 145,
        body_fat_pct: '18%',
        macro_targets: { p: 165, c: 280, f: 65, calories: 2405 },
        training_target: 'Built, not small.',
    },
    {
        email: 'skyler.white@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@swhite',
        name: 'Skyler White',
        avatar_url: 'https://i.pravatar.cc/150?u=7',
        status: 'enhanced',
        activity: 'Bodybuilder (Bulk)',
        activity_icon: 'hammer',
        height: "6'0",
        weight_lbs: 245,
        body_fat_pct: '13%',
        macro_targets: { p: 300, c: 500, f: 110, calories: 4270 },
        training_target: '300 lbs lean.',
        is_private: true,
    },
    {
        email: 'peyton.reed@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@preed',
        name: 'Peyton Reed',
        avatar_url: 'https://i.pravatar.cc/150?u=8',
        status: 'none',
        activity: 'Functional',
        activity_icon: 'kettlebell',
        height: "5'8",
        weight_lbs: 165,
        body_fat_pct: '14%',
        macro_targets: { p: 175, c: 260, f: 65, calories: 2345 },
        training_target: 'Fit for life.',
    },
    {
        email: 'parker.scott@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@pscott',
        name: 'Parker Scott',
        avatar_url: 'https://i.pravatar.cc/150?u=9',
        status: 'natural',
        activity: 'Combat Athlete (MMA / Boxing / BJJ / Wrestling)',
        activity_icon: 'karate',
        height: "5'11",
        weight_lbs: 170,
        body_fat_pct: '8%',
        macro_targets: { p: 200, c: 300, f: 60, calories: 2620 },
        training_target: 'Compete at 170.',
    },
    {
        email: 'avery.miller@tumiapp.dev',
        password: 'TestPass123!',
        handle: '@amiller',
        name: 'Avery Miller',
        avatar_url: 'https://i.pravatar.cc/150?u=10',
        status: 'natural',
        activity: 'Bodybuilder (Bulk)',
        activity_icon: 'hammer',
        height: "5'9",
        weight_lbs: 195,
        body_fat_pct: '11%',
        macro_targets: { p: 240, c: 400, f: 85, calories: 3385 },
        training_target: 'Mass or nothing.',
    },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function daysAgo(n, hoursOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(d.getHours() - hoursOffset);
    return d.toISOString();
}

// ─── Post generators ──────────────────────────────────────────────────────────

function mealPost(authorId, daysBack, hoursBack) {
    const meals = [
        {
            type: 'Breakfast',
            title: 'Morning Stack',
            payload: {
                meal: {
                    id: crypto.randomUUID(), type: 'Breakfast', title: 'Morning Stack',
                    calories: 780, macros: { p: 55, c: 95, f: 18 },
                    ingredients: [
                        { id: crypto.randomUUID(), name: 'Egg Whites', amount: '6 large', cals: 102, macros: { p: 21, c: 1, f: 0 } },
                        { id: crypto.randomUUID(), name: 'Oatmeal', amount: '1.5 cups dry', cals: 450, macros: { p: 15, c: 81, f: 7 } },
                        { id: crypto.randomUUID(), name: 'Banana', amount: '1 medium', cals: 105, macros: { p: 1, c: 27, f: 0 } },
                        { id: crypto.randomUUID(), name: 'Whey Protein', amount: '1 scoop', cals: 123, macros: { p: 25, c: 3, f: 2 } },
                    ]
                }
            }
        },
        {
            type: 'Lunch',
            title: 'Meal Prep Classic',
            payload: {
                meal: {
                    id: crypto.randomUUID(), type: 'Lunch', title: 'Meal Prep Classic',
                    calories: 920, macros: { p: 72, c: 110, f: 20 },
                    ingredients: [
                        { id: crypto.randomUUID(), name: 'Chicken Breast', amount: '8 oz', cals: 335, macros: { p: 63, c: 0, f: 7 } },
                        { id: crypto.randomUUID(), name: 'Brown Rice', amount: '2 cups cooked', cals: 432, macros: { p: 9, c: 90, f: 3 } },
                        { id: crypto.randomUUID(), name: 'Broccoli', amount: '1 cup', cals: 55, macros: { p: 4, c: 11, f: 1 } },
                        { id: crypto.randomUUID(), name: 'Olive Oil', amount: '1 tbsp', cals: 119, macros: { p: 0, c: 0, f: 14 } },
                    ]
                }
            }
        },
        {
            type: 'Dinner',
            title: 'High Protein Dinner',
            payload: {
                meal: {
                    id: crypto.randomUUID(), type: 'Dinner', title: 'High Protein Dinner',
                    calories: 845, macros: { p: 65, c: 70, f: 28 },
                    ingredients: [
                        { id: crypto.randomUUID(), name: 'Salmon', amount: '6 oz', cals: 354, macros: { p: 38, c: 0, f: 22 } },
                        { id: crypto.randomUUID(), name: 'Sweet Potato', amount: '1 large', cals: 162, macros: { p: 4, c: 37, f: 0 } },
                        { id: crypto.randomUUID(), name: 'Asparagus', amount: '1 cup', cals: 40, macros: { p: 4, c: 7, f: 0 } },
                        { id: crypto.randomUUID(), name: 'Greek Yogurt', amount: '170g', cals: 100, macros: { p: 17, c: 6, f: 0 } },
                    ]
                }
            }
        },
    ];
    const m = meals[Math.floor(Math.random() * meals.length)];
    return {
        author_id: authorId,
        post_type: 'meal',
        payload: m.payload,
        caption: null,
        created_at: daysAgo(daysBack, hoursBack),
    };
}

function workoutPost(authorId, daysBack, hoursBack) {
    const workouts = [
        {
            title: 'Push Day',
            payload: {
                workout: {
                    id: crypto.randomUUID(), title: 'Push Day', duration: 75,
                    timestamp: Date.now() - daysBack * 86400000,
                    exercises: [
                        { id: crypto.randomUUID(), title: 'Bench Press', type: 'Strength', muscleGroup: 'Chest', sets: [{ id: crypto.randomUUID(), reps: 5, weight: 245, completed: true }, { id: crypto.randomUUID(), reps: 5, weight: 245, completed: true }, { id: crypto.randomUUID(), reps: 4, weight: 245, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Incline Dumbbell Press', type: 'Strength', muscleGroup: 'Chest', sets: [{ id: crypto.randomUUID(), reps: 10, weight: 85, completed: true }, { id: crypto.randomUUID(), reps: 10, weight: 85, completed: true }, { id: crypto.randomUUID(), reps: 9, weight: 85, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Tricep Pushdown', type: 'Strength', muscleGroup: 'Triceps', sets: [{ id: crypto.randomUUID(), reps: 15, weight: 60, completed: true }, { id: crypto.randomUUID(), reps: 15, weight: 60, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Lateral Raise', type: 'Strength', muscleGroup: 'Shoulders', sets: [{ id: crypto.randomUUID(), reps: 20, weight: 20, completed: true }, { id: crypto.randomUUID(), reps: 18, weight: 20, completed: true }] },
                    ]
                }
            }
        },
        {
            title: 'Pull Day',
            payload: {
                workout: {
                    id: crypto.randomUUID(), title: 'Pull Day', duration: 70,
                    timestamp: Date.now() - daysBack * 86400000,
                    exercises: [
                        { id: crypto.randomUUID(), title: 'Deadlift', type: 'Strength', muscleGroup: 'Back', sets: [{ id: crypto.randomUUID(), reps: 3, weight: 405, completed: true }, { id: crypto.randomUUID(), reps: 3, weight: 405, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Barbell Row', type: 'Strength', muscleGroup: 'Back', sets: [{ id: crypto.randomUUID(), reps: 8, weight: 185, completed: true }, { id: crypto.randomUUID(), reps: 8, weight: 185, completed: true }, { id: crypto.randomUUID(), reps: 7, weight: 185, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Lat Pulldown', type: 'Strength', muscleGroup: 'Back', sets: [{ id: crypto.randomUUID(), reps: 12, weight: 170, completed: true }, { id: crypto.randomUUID(), reps: 12, weight: 170, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Face Pull', type: 'Strength', muscleGroup: 'Rear Delts', sets: [{ id: crypto.randomUUID(), reps: 20, weight: 50, completed: true }, { id: crypto.randomUUID(), reps: 20, weight: 50, completed: true }] },
                    ]
                }
            }
        },
        {
            title: 'Leg Day',
            payload: {
                workout: {
                    id: crypto.randomUUID(), title: 'Leg Day', duration: 80,
                    timestamp: Date.now() - daysBack * 86400000,
                    exercises: [
                        { id: crypto.randomUUID(), title: 'Squat', type: 'Strength', muscleGroup: 'Quads', sets: [{ id: crypto.randomUUID(), reps: 6, weight: 315, completed: true }, { id: crypto.randomUUID(), reps: 6, weight: 315, completed: true }, { id: crypto.randomUUID(), reps: 5, weight: 315, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Romanian Deadlift', type: 'Strength', muscleGroup: 'Hamstrings', sets: [{ id: crypto.randomUUID(), reps: 10, weight: 225, completed: true }, { id: crypto.randomUUID(), reps: 10, weight: 225, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Leg Press', type: 'Strength', muscleGroup: 'Quads', sets: [{ id: crypto.randomUUID(), reps: 15, weight: 450, completed: true }, { id: crypto.randomUUID(), reps: 12, weight: 450, completed: true }] },
                        { id: crypto.randomUUID(), title: 'Calf Raise', type: 'Strength', muscleGroup: 'Calves', sets: [{ id: crypto.randomUUID(), reps: 20, weight: 200, completed: true }, { id: crypto.randomUUID(), reps: 20, weight: 200, completed: true }] },
                    ]
                }
            }
        },
    ];
    const w = workouts[Math.floor(Math.random() * workouts.length)];
    return {
        author_id: authorId,
        post_type: 'workout',
        payload: w.payload,
        caption: null,
        created_at: daysAgo(daysBack, hoursBack),
    };
}

function macroUpdatePost(authorId, daysBack, hoursBack) {
    const updates = [
        {
            caption: 'Dropping cals for the final push to stage.',
            payload: {
                macroUpdate: {
                    id: crypto.randomUUID(),
                    caption: 'Dropping cals for the final push to stage.',
                    timestamp: Date.now() - daysBack * 86400000,
                    oldDate: '02/15/2026',
                    oldTargets: { calories: 2800, p: 220, c: 330, f: 75 },
                    newTargets: { calories: 2400, p: 230, c: 250, f: 65 },
                    trainingTarget: 'Cutting Phase'
                }
            }
        },
        {
            caption: 'Time to grow. Bumping up the carbs.',
            payload: {
                macroUpdate: {
                    id: crypto.randomUUID(),
                    caption: 'Time to grow. Bumping up the carbs.',
                    timestamp: Date.now() - daysBack * 86400000,
                    oldDate: '01/10/2026',
                    oldTargets: { calories: 3000, p: 230, c: 350, f: 80 },
                    newTargets: { calories: 3500, p: 250, c: 450, f: 90 },
                    trainingTarget: 'Lean Bulk'
                }
            }
        },
        {
            caption: 'Maintenance mode while I recovery from this elbow.',
            payload: {
                macroUpdate: {
                    id: crypto.randomUUID(),
                    caption: 'Maintenance mode while I recovery from this elbow.',
                    timestamp: Date.now() - daysBack * 86400000,
                    oldDate: '03/01/2026',
                    oldTargets: { calories: 3200, p: 240, c: 400, f: 85 },
                    newTargets: { calories: 2900, p: 240, c: 340, f: 80 },
                    trainingTarget: 'Maintenance'
                }
            }
        },
    ];
    const u = updates[Math.floor(Math.random() * updates.length)];
    return {
        author_id: authorId,
        post_type: 'macro_update',
        payload: u.payload,
        caption: u.caption,
        created_at: daysAgo(daysBack, hoursBack),
    };
}

function snapshotPost(authorId, daysBack, hoursBack) {
    const snapshots = [
        {
            caption: 'Nearly dialed in for the day.',
            payload: {
                snapshot: {
                    id: crypto.randomUUID(),
                    caption: 'Nearly dialed in for the day.',
                    timestamp: Date.now() - daysBack * 86400000,
                    targets: { calories: 2800, p: 220, c: 320, f: 75 },
                    consumed: { calories: 2650, p: 210, c: 305, f: 68 }
                }
            }
        },
        {
            caption: 'Smashed macros today, feeling great.',
            payload: {
                snapshot: {
                    id: crypto.randomUUID(),
                    caption: 'Smashed macros today, feeling great.',
                    timestamp: Date.now() - daysBack * 86400000,
                    targets: { calories: 3200, p: 250, c: 400, f: 80 },
                    consumed: { calories: 3210, p: 255, c: 398, f: 82 }
                }
            }
        },
        {
            caption: 'Went over on fats tonight. Pizza happened.',
            payload: {
                snapshot: {
                    id: crypto.randomUUID(),
                    caption: 'Went over on fats tonight. Pizza happened.',
                    timestamp: Date.now() - daysBack * 86400000,
                    targets: { calories: 2500, p: 220, c: 260, f: 65 },
                    consumed: { calories: 2890, p: 195, c: 355, f: 110 }
                }
            }
        },
    ];
    const s = snapshots[Math.floor(Math.random() * snapshots.length)];
    return {
        author_id: authorId,
        post_type: 'snapshot',
        payload: s.payload,
        caption: s.caption,
        created_at: daysAgo(daysBack, hoursBack),
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱  Starting Tumi seed...\n');

    // 1. Create auth users + profiles
    const profileIds = {};
    for (const u of USERS) {
        console.log(`  Creating auth user: ${u.handle}`);
        const { data: authData, error: authErr } = await supabase.auth.signUp({
            email: u.email,
            password: u.password,
            options: {
                data: {
                    handle: u.handle,
                    name: u.name
                }
            }
        });

        if (authErr && authErr.message.includes('already registered')) {
            // Already registered, we need to sign in to get the ID
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                email: u.email,
                password: u.password
            });
            if (signInErr) {
               console.error(`    ❌ Failed: ${signInErr.message}`);
               continue;
            }
            profileIds[u.handle] = signInData.user.id;
            console.log(`    ↳ already exists (${signInData.user.id})`);
        } else if (authErr) {
            console.error(`    ❌ Failed: ${authErr.message}`);
            continue;
        } else if (authData?.user) {
            profileIds[u.handle] = authData.user.id;
            console.log(`    ↳ created (${authData.user.id})`);
        } else {
             console.error(`    ❌ Failed: No user returned`);
             continue;
        }

        // Upsert profile
        const profileId = profileIds[u.handle];
        const { error: profErr } = await supabase.from('profiles').upsert({
            id: profileId,
            handle: u.handle,
            name: u.name,
            avatar_url: u.avatar_url,
            status: u.status,
            activity: u.activity,
            activity_icon: u.activity_icon,
            height: u.height,
            weight_lbs: u.weight_lbs,
            body_fat_pct: u.body_fat_pct,
            is_private: u.is_private || false,
            macro_targets: u.macro_targets,
            training_target: u.training_target,
        });
        if (profErr) console.error(`    ❌ Profile error: ${profErr.message}`);
    }

    console.log('\n✅  Profiles done.\n');

    // 2. Create tribes
    console.log('🏕️   Creating tribes...');
    const chiefId = profileIds['@jsmith'];

    const TRIBES = [
        { name: 'Harvard Alum League', avatar_url: 'https://i.pravatar.cc/150?u=100', theme_color: '#9FB89F', tribe_type: 'accountability', privacy: 'public', description: 'For the alums and the grinders.', tags: ['natural', 'active'], chief_id: chiefId },
        { name: 'Iron Brotherhood', avatar_url: 'https://i.pravatar.cc/150?u=101', theme_color: '#3E2A4A', tribe_type: 'head-to-head', privacy: 'private', description: 'Strength athletes only.', tags: ['natural'], chief_id: profileIds['@arivera'] },
        { name: 'Team Flex', avatar_url: 'https://i.pravatar.cc/150?u=102', theme_color: '#E6A8A8', tribe_type: 'head-to-head', privacy: 'public', description: 'Getting big every day.', tags: ['active'], chief_id: profileIds['@swhite'] },
        { name: 'The Cut Squad', avatar_url: 'https://i.pravatar.cc/150?u=103', theme_color: '#2D3A26', tribe_type: 'tribe-vs-tribe', privacy: 'public', description: 'Who can get the leanest?', tags: ['natural', 'active'], chief_id: profileIds['@qtaylor'] },
    ];

    const tribeIds = {};
    for (const t of TRIBES) {
        const { data, error } = await supabase.from('tribes').insert(t).select('id').single();
        if (error) { console.error(`  ❌ Tribe error: ${error.message}`); continue; }
        tribeIds[t.name] = data.id;
        console.log(`  ✓ ${t.name} (${data.id})`);
    }

    // 3. Add tribe members
    console.log('\n👥  Adding tribe members...');
    const seedHandles = Object.keys(profileIds).filter(h => h !== '@kwadub');
    // Team Flex: all 10 seed users
    for (const h of seedHandles) {
        await supabase.from('tribe_members').upsert({ tribe_id: tribeIds['Team Flex'], user_id: profileIds[h], role: profileIds[h] === profileIds['@swhite'] ? 'chief' : 'member' });
    }
    // Cut Squad: kwadub + cut-focused users
    const cutSquad = ['@kwadub', '@qtaylor', '@jsmith', '@cjones', '@preed'];
    for (const h of cutSquad) {
        if (profileIds[h]) await supabase.from('tribe_members').upsert({ tribe_id: tribeIds['The Cut Squad'], user_id: profileIds[h], role: profileIds[h] === profileIds['@qtaylor'] ? 'chief' : 'member' });
    }
    console.log('  ✓ Team Flex + Cut Squad populated');

    // 4. Follows: @kwadub → all 10 seed users; all 10 seed users → each other
    console.log('\n📡  Creating follows...');
    const followRows = [];

    // kwadub follows all 10
    for (const h of seedHandles) {
        followRows.push({ follower_id: profileIds['@kwadub'], following_id: profileIds[h] });
    }

    // all 10 seed users follow each other (full mesh)
    for (let i = 0; i < seedHandles.length; i++) {
        for (let j = 0; j < seedHandles.length; j++) {
            if (i !== j) {
                followRows.push({ follower_id: profileIds[seedHandles[i]], following_id: profileIds[seedHandles[j]] });
            }
        }
    }

    // Insert in chunks of 100
    for (let i = 0; i < followRows.length; i += 100) {
        const { error } = await supabase.from('follows').upsert(followRows.slice(i, i + 100));
        if (error) console.error(`  ❌ Follow error: ${error.message}`);
    }
    console.log(`  ✓ ${followRows.length} follow relationships created`);

    // 5. Posts: 12 per seed account (3 meal, 3 workout, 3 macro_update, 3 snapshot)
    console.log('\n📝  Creating posts...');
    const allPosts = [];
    let dayOffset = 0;

    for (const handle of seedHandles) {
        const authorId = profileIds[handle];
        dayOffset = 0;

        // Spread 12 posts over 7 days naturally
        for (let i = 0; i < 3; i++) {
            allPosts.push(mealPost(authorId, dayOffset % 7, Math.floor(Math.random() * 14) + 6));
            dayOffset++;
        }
        for (let i = 0; i < 3; i++) {
            allPosts.push(workoutPost(authorId, dayOffset % 7, Math.floor(Math.random() * 14) + 6));
            dayOffset++;
        }
        for (let i = 0; i < 3; i++) {
            allPosts.push(macroUpdatePost(authorId, dayOffset % 7, Math.floor(Math.random() * 14) + 6));
            dayOffset++;
        }
        for (let i = 0; i < 3; i++) {
            allPosts.push(snapshotPost(authorId, dayOffset % 7, Math.floor(Math.random() * 14) + 6));
            dayOffset++;
        }
    }

    // Insert posts in batches
    for (let i = 0; i < allPosts.length; i += 20) {
        const batch = allPosts.slice(i, i + 20);
        const { error } = await supabase.from('posts').insert(batch);
        if (error) console.error(`  ❌ Post batch error: ${error.message}`);
    }
    console.log(`  ✓ ${allPosts.length} posts created`);

    // 6. Seed some likes, comments, and bookmarks on posts
    console.log('\n❤️   Seeding social interactions...');
    const { data: allPostRows } = await supabase.from('posts').select('id').limit(200);
    if (allPostRows && allPostRows.length > 0) {
        const postIds = allPostRows.map(p => p.id);
        const allUserIds = Object.values(profileIds);

        // Likes: each user likes ~60% of posts randomly
        const likeRows = [];
        for (const postId of postIds) {
            for (const userId of allUserIds) {
                if (Math.random() > 0.4) {
                    likeRows.push({ post_id: postId, user_id: userId });
                }
            }
        }
        for (let i = 0; i < likeRows.length; i += 100) {
            await supabase.from('likes').upsert(likeRows.slice(i, i + 100));
        }
        console.log(`  ✓ ${likeRows.length} likes seeded`);

        // Comments: 2-5 per post from random users
        const COMMENT_TEXTS = [
            "Let's gooo! Strong work.", "Looking massive, keep it up.", "The consistency is inspiring!",
            "Those macros are dialed in.", "Drop the recipe for that meal!", "Absolute beast mode.",
            "This is pure motivation.", "Making it look easy, but we know the grind.", "Clean gains only.",
            "That workout looked intense.", "Fueling correctly makes all the difference.", "Verified natural gains right here!",
            "The tribe is proud.", "Setting the bar high!", "Great session.",
            "Nutritious and delicious.", "Bulk or cut? Looking solid either way.", "Always putting in that work.",
            "Those numbers are crazy.", "Respect the process.", "How long have you been training?",
            "Goals right here.", "What's your split looking like?", "This is what the grind looks like.",
        ];
        const commentRows = [];
        for (const postId of postIds.slice(0, 60)) { // first 60 posts get comments
            const count = Math.floor(Math.random() * 4) + 2;
            for (let i = 0; i < count; i++) {
                const commenter = allUserIds[Math.floor(Math.random() * allUserIds.length)];
                commentRows.push({
                    post_id: postId,
                    author_id: commenter,
                    body: COMMENT_TEXTS[Math.floor(Math.random() * COMMENT_TEXTS.length)],
                });
            }
        }
        for (let i = 0; i < commentRows.length; i += 50) {
            await supabase.from('comments').insert(commentRows.slice(i, i + 50));
        }
        console.log(`  ✓ ${commentRows.length} comments seeded`);

        // Bookmarks: each user bookmarks ~15% of posts
        const bookmarkRows = [];
        for (const postId of postIds) {
            for (const userId of allUserIds) {
                if (Math.random() > 0.85) {
                    bookmarkRows.push({ post_id: postId, user_id: userId });
                }
            }
        }
        for (let i = 0; i < bookmarkRows.length; i += 100) {
            await supabase.from('post_bookmarks').upsert(bookmarkRows.slice(i, i + 100));
        }
        console.log(`  ✓ ${bookmarkRows.length} bookmarks seeded`);
    }

    console.log('\n🎉  Seed complete!');
    console.log('\n── Summary ─────────────────────────────────────────');
    console.log(`  Users created: ${Object.keys(profileIds).length}`);
    console.log(`  Tribes: ${Object.keys(tribeIds).length}`);
    console.log(`  Posts: ${allPosts.length}`);
    console.log('────────────────────────────────────────────────────');
    console.log('\n  kwadub login:  kwadub72@gmail.com / Tribe62');
    console.log('  Seed logins:   *@tumiapp.dev / TestPass123!\n');
}

main().catch(console.error);
