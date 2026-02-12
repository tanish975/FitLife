
export const calculateBMR = (profile) => {
    if (!profile?.height || !profile?.weight || !profile?.age || !profile?.gender) return 2000;

    // Mifflin-St Jeor Equation
    if (profile.gender === 'male') {
        return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    }
    return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
};

export const getTargetCalories = (profile) => {
    const bmr = calculateBMR(profile);
    // TDEE estimation (Sedentary default for safety, can be upgraded later)
    const tdee = bmr * 1.55;

    if (profile?.goal === 'lose') return Math.round(tdee - 500);
    if (profile?.goal === 'gain') return Math.round(tdee + 500);
    return Math.round(tdee);
};

export const getDietStatus = (consumed, target) => {
    const percentage = (consumed / target) * 100;
    const remaining = Math.max(0, target - consumed);
    const excess = Math.max(0, consumed - target);

    let status = 'on-track'; // 'under', 'on-track', 'over'

    if (percentage < 80) status = 'under';
    else if (percentage > 110) status = 'over';

    return {
        percentage,
        remaining,
        excess,
        status
    };
};

export const getWeeklyStats = (calorieEntries) => {
    if (!calorieEntries || calorieEntries.length === 0) return { totalWeekly: 0, avgDaily: 0 };

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyEntries = calorieEntries.filter(e => new Date(e.date) >= weekAgo);
    const totalWeekly = weeklyEntries.reduce((sum, e) => sum + e.calories, 0);

    // Count distinct days with entries to get a real average
    const distinctDays = new Set(weeklyEntries.map(e => e.date)).size;
    const avgDaily = distinctDays > 0 ? totalWeekly / distinctDays : 0;

    return { totalWeekly, avgDaily };
};

export const getCalorieChartData = (calorieEntries) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];

    // Get last 7 days including today
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];

        const dayTotal = calorieEntries
            .filter(e => e.date === dateStr)
            .reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

        data.push({
            day: dayName,
            calories: dayTotal,
            fullDate: dateStr
        });
    }

    return data;
};
