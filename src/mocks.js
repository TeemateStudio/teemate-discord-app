/** @type {import('./types.js').Game[]} */
export const games = [
    { 
        label: 'Valorant', 
        value: 'valorant', 
        modes: [
            { label: 'Ranked', value: 'val-ranked' },
            { label: 'Unranked', value: 'val_unranked' }
        ]
    },
    { 
        label: 'Rocket League', 
        value: 'rocketleague',
        modes: [
            { label: 'Ranked', value: 'rl-ranked' },
            { label: 'Unranked', value: 'rl-unranked' }
        ]
    },
    { 
        label: 'League of Legends', 
        value: 'lol',
        modes: [
            { label: 'Ranked', value: 'lol-ranked' },
            { label: 'Unranked', value: 'lol-unranked' }
        ]
    }
];