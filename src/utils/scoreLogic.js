
export const calculateHealthScore = (profile, calorieEntries, completedWorkouts) => {
    // 0-100 Score based on 3 pillars:
    // 1. Consistency (Streak) - 30%
    // 2. Diet Adherence - 40%
    // 3. Activity Level - 30%

    // Mock data for MVP (since we don't have full history yet)
    // In Phase 2, this will read real history.

    let score = 70; // Base score

    // 1. Diet Impact
    if (calorieEntries && calorieEntries.length > 0) {
        // Boost for logging
        score += 10;
    }

    // 2. Activity Impact
    // This assumes we pass a simple count or boolean for today
    if (completedWorkouts && completedWorkouts.length > 0) {
        score += 15;
    }

    // 3. Profile Completion Bonus
    if (profile?.height && profile?.weight && profile?.goal) {
        score += 5;
    }

    // Cap at 100
    return Math.min(score, 100);
};

export const getStreakData = () => {
    // Mock for Phase 1
    return {
        current: 3,
        best: 12,
        protected: true // "Smart Streak Protection" active
    };
};
