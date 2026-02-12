// Helper to simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for local storage operations
const storage = {
    get: (key) => {
        const val = JSON.parse(localStorage.getItem(key) || '[]');
        console.log(`[Storage GET] ${key}:`, val);
        return val;
    },
    set: (key, value) => {
        console.log(`[Storage SET] ${key}:`, value);
        localStorage.setItem(key, JSON.stringify(value));
    },
    generateId: () => Math.random().toString(36).substr(2, 9)
};

export const base44 = {
    auth: {
        me: async () => {
            await delay(300);
            const profiles = storage.get('user_profiles');
            if (profiles.length > 0) {
                return { full_name: profiles[0].full_name };
            }
            return { full_name: 'Guest User' };
        }
    },
    entities: {
        UserProfile: {
            list: async () => {
                await delay(300);
                return storage.get('user_profiles');
            },
            create: async (data) => {
                await delay(500);
                // Ensure only one profile exists for simplicity in this personal app
                const newProfile = { id: storage.generateId(), ...data, created_at: new Date().toISOString() };
                storage.set('user_profiles', [newProfile]);
                return newProfile;
            },
            update: async (id, data) => {
                await delay(500);
                const profiles = storage.get('user_profiles');
                const index = profiles.findIndex(p => p.id === id);
                if (index === -1) throw new Error('Profile not found');

                const updatedProfile = { ...profiles[index], ...data, updated_at: new Date().toISOString() };
                profiles[index] = updatedProfile;
                storage.set('user_profiles', profiles);
                return updatedProfile;
            }
        },
        CalorieEntry: {
            list: async (sort) => {
                await delay(300);
                let entries = storage.get('calorie_entries');
                // Simple sorting implementation
                if (sort === '-created_at') {
                    entries.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
                }
                return entries;
            },
            create: async (data) => {
                await delay(300);
                const entries = storage.get('calorie_entries');
                const newEntry = {
                    id: storage.generateId(),
                    ...data,
                    created_at: new Date().toISOString()
                };
                entries.push(newEntry);
                storage.set('calorie_entries', entries);
                return newEntry;
            },
            delete: async (id) => {
                await delay(300);
                const entries = storage.get('calorie_entries');
                const filteredEntries = entries.filter(e => e.id !== id);
                storage.set('calorie_entries', filteredEntries);
                return { success: true };
            }
        }
    }
};
