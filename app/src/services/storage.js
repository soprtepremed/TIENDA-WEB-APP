const KEYS = {
    EVENTS: 'premed_events',
    HISTORY: 'premed_history',
    USER: 'premed_user'
};

export const storage = {
    getEvents: () => {
        const data = localStorage.getItem(KEYS.EVENTS);
        return data ? JSON.parse(data) : [];
    },

    saveEvents: (events) => {
        localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
    },

    getHistory: () => {
        const data = localStorage.getItem(KEYS.HISTORY);
        return data ? JSON.parse(data) : [];
    },

    saveHistory: (history) => {
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    },

    getUser: () => {
        return localStorage.getItem(KEYS.USER);
    },

    setUser: (user) => {
        localStorage.setItem(KEYS.USER, user);
    }
};
