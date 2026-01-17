import { FeedPost, User, Comment } from '../models/types';
import { ACTIVITIES } from '../constants/Activities';

const FAKE_NAMES = [
    'Jordan Smith', 'Alex Rivera', 'Casey Jones', 'Riley Cooper', 'Quinn Taylor',
    'Morgan Bailey', 'Skyler White', 'Peyton Reed', 'Parker Scott', 'Avery Miller',
    'Robin Hood', 'Charlie Brown', 'Dakota Blue', 'Emerson Lake', 'Finley Green',
    'Hayden Silver', 'Jamie Gold', 'Kendall Stone', 'Logan Wood', 'Phoenix Fire'
];

const FAKE_HANDLES = [
    '@jsmith', '@arivera', '@cjones', '@rcooper', '@qtaylor',
    '@mbailey', '@swhite', '@preed', '@pscott', '@amiller',
    '@rhood', '@cbrown', '@dblue', '@elake', '@fgreen',
    '@hsilver', '@jgold', '@kstone', '@lwood', '@pfire'
];

const AVATARS = [
    'https://i.pravatar.cc/150?u=1', 'https://i.pravatar.cc/150?u=2', 'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4', 'https://i.pravatar.cc/150?u=5', 'https://i.pravatar.cc/150?u=6',
    'https://i.pravatar.cc/150?u=7', 'https://i.pravatar.cc/150?u=8', 'https://i.pravatar.cc/150?u=9',
    'https://i.pravatar.cc/150?u=10', 'https://i.pravatar.cc/150?u=11', 'https://i.pravatar.cc/150?u=12',
    'https://i.pravatar.cc/150?u=13', 'https://i.pravatar.cc/150?u=14', 'https://i.pravatar.cc/150?u=15',
    'https://i.pravatar.cc/150?u=16', 'https://i.pravatar.cc/150?u=17', 'https://i.pravatar.cc/150?u=18',
    'https://i.pravatar.cc/150?u=19', 'https://i.pravatar.cc/150?u=20'
];

const STATUSES: ('natural' | 'enhanced' | 'none')[] = ['natural', 'enhanced', 'natural', 'none', 'natural'];

const FAKE_ACTIVITY_ICONS = [
    'hammer', 'trophy-variant', 'weight-lifter', 'arm-flex', 'fire', 'leaf', 'biathlon',
    'basketball', 'soccer', 'football', 'baseball', 'hockey-puck', 'lacrosse', 'rugby',
    'volleyball', 'run-fast', 'run', 'bike', 'swim', 'karate', 'shield-account',
    'infinity', 'kettlebell', 'hammer-wrench', 'ring', 'baby-face-outline', 'heart-pulse'
];

const FAKE_COMMENT_TEXTS = [
    "Let's gooo! Strong work.",
    "Looking massive, keep it up.",
    "The consistency is inspiring!",
    "Those macros are dialed in.",
    "Drop the recipe for that meal!",
    "Absolute beast mode.",
    "This is pure motivation.",
    "Making it look easy, but we know the grind.",
    "Clean gains only.",
    "That workout looked intense.",
    "Fueling correctly makes all the difference.",
    "Verified natural gains right here!",
    "The tribe is proud.",
    "Check DM, got a question about your split.",
    "Love the focus.",
    "Setting the bar high!",
    "Great session, seen you working.",
    "Nutritious and delicious.",
    "Bulk or cut? Looking solid either way.",
    "Always putting in that work."
];

export function generateFakeUsers(count: number): User[] {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
        const randActivity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        const heightFt = Math.floor(Math.random() * 2) + 5;
        const heightIn = Math.floor(Math.random() * 12);

        users.push({
            id: `u${i}`,
            name: FAKE_NAMES[i % FAKE_NAMES.length],
            handle: FAKE_HANDLES[i % FAKE_HANDLES.length],
            avatar: AVATARS[i % AVATARS.length],
            status: STATUSES[i % STATUSES.length],
            verified: true,
            activity: randActivity.name,
            activityIcon: randActivity.icon,
            height: `${heightFt}'${heightIn}`,
            weight: Math.floor(Math.random() * 100) + 140,
            bfs: `${Math.floor(Math.random() * 15) + 5}%`,
            tribe: 'Team Flex',
            tribeAvatar: 'https://i.pravatar.cc/150?u=99',
            stats: {
                meals: Math.floor(Math.random() * 800) + 100,
                workouts: Math.floor(Math.random() * 600) + 50,
                updates: Math.floor(Math.random() * 300) + 20
            },
            isFollowing: Math.random() > 0.7
        });
    }
    return users;
}

export function generateFakePosts(count: number): FeedPost[] {
    const posts: FeedPost[] = [];
    const users = generateFakeUsers(20);


    for (let i = 0; i < count; i++) {
        const user = users[i % 20];
        const type = i % 4; // 0: Macro Update, 1: Workout, 2: Meal, 3: Snapshot

        const post: FeedPost = {
            id: `fake_${i}`,
            user,
            timeAgo: `${Math.floor(Math.random() * 23) + 1}h ago`,
            stats: {
                likes: Math.floor(Math.random() * 500) + 10,
                comments: 0,
                shares: Math.floor(Math.random() * 20),
                saves: Math.floor(Math.random() * 100),
            },
            isLiked: Math.random() > 0.5,
            isSaved: Math.random() > 0.8,
            comments: []
        };

        // Generate 3-8 comments per post
        const commentCount = Math.floor(Math.random() * 6) + 3;
        for (let j = 0; j < commentCount; j++) {
            const commenter = users[Math.floor(Math.random() * 20)];
            const comment: Comment = {
                id: `c_${i}_${j}`,
                user: commenter,
                text: FAKE_COMMENT_TEXTS[Math.floor(Math.random() * FAKE_COMMENT_TEXTS.length)],
                timestamp: Date.now() - (Math.random() * 3600000),
                likes: Math.floor(Math.random() * 50),
                isLiked: Math.random() > 0.8
            };
            post.comments!.push(comment);
        }
        post.stats.comments = post.comments!.length;

        if (type === 0) {
            post.macroUpdate = {
                id: `mu_${i}`,
                caption: i % 2 === 0 ? 'Getting lean for summer.' : 'New targets set!',
                timestamp: Date.now() - (i * 3600000),
                oldDate: '12/10/2025',
                oldTargets: { calories: 2500, p: 200, c: 300, f: 60 },
                newTargets: { calories: 2200, p: 180, c: 250, f: 55 },
                trainingTarget: 'Cutting Phase'
            };
        } else if (type === 1) {
            post.workout = {
                id: `w_${i}`,
                title: i % 2 === 0 ? 'Push Day' : 'Leg Day',
                exercises: [
                    { id: 'ex1', title: 'Bench Press', type: 'Strength', sets: [{ id: 's1', reps: 10, weight: 225, completed: true }] },
                    { id: 'ex2', title: 'Lat Pulldown', type: 'Strength', sets: [{ id: 's1', reps: 12, weight: 180, completed: true }] },
                ],
                duration: 75,
                timestamp: Date.now() - (i * 3600000),
            };
        } else if (type === 2) {
            post.meal = {
                id: `m_${i}`,
                title: 'High Protein Post-Workout',
                type: 'Lunch',
                calories: 850,
                macros: { p: 60, c: 100, f: 20 },
                ingredients: [
                    { id: 'i1', name: 'Chicken Breast', amount: '200g', cals: 330, macros: { p: 62, c: 0, f: 7 } },
                    { id: 'i2', name: 'Brown Rice', amount: '2 cups', cals: 430, macros: { p: 10, c: 90, f: 4 } },
                ]
            };
        } else {
            post.snapshot = {
                id: `sn_${i}`,
                timestamp: Date.now() - (i * 3600000),
                caption: "I'm so cooked for the day",
                targets: { calories: 4000, p: 270, c: 500, f: 100 },
                consumed: { calories: 3000, p: 200, c: 400, f: 120 }
            };
        }

        posts.push(post);
    }

    return posts;
}
