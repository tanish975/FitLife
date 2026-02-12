import { workoutPlans } from '../data/workoutPlans';

export const getBMICategory = (height, weight) => {
    if (!height || !weight) return 'normal';
    // height in cm to meters
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
};

export const getRecommendedWorkouts = (userProfile, location = 'home') => {
    const workouts = workoutPlans[location];
    if (!workouts) return [];

    const height = userProfile?.height;
    const weight = userProfile?.weight;
    const goal = userProfile?.goal || 'maintain';

    // If no data, return a balanced mix (default 'normal' strategy)
    if (!height || !weight) {
        return [...workouts.cardio.slice(0, 1), ...workouts.strength.slice(0, 2)];
    }

    const bmiCategory = getBMICategory(height, weight);
    let recommended = [];

    if (bmiCategory === 'underweight' || goal === 'gain') {
        // Focus on Strength
        recommended = [...workouts.strength];
    } else if (bmiCategory === 'overweight' || bmiCategory === 'obese' || goal === 'lose') {
        // Focus on Cardio + High Calorie Strength
        recommended = [...workouts.cardio, ...workouts.strength.slice(0, 1)];
    } else {
        // Maintenance / Normal: Balanced
        recommended = [...workouts.cardio.slice(0, 1), ...workouts.strength.slice(0, 2)];
    }

    return recommended;
};

export const getDailyCoachMessage = (userProfile) => {
    const bmiCategory = getBMICategory(userProfile?.height, userProfile?.weight);
    const goal = userProfile?.goal || 'maintain';

    const messages = {
        muscleFocus: [
            "Focus on slow, controlled reps today. Don't rush; building muscle takes time and tension.",
            "Mind-Muscle Connection is key. Visualize the target muscle contracting on every single rep.",
            "Energy levels look good for a heavy session. Try to push for 1 extra rep on your final set.",
            "Building mass requires recovery. Ensure you're hitting your protein target after this session."
        ],
        weightLossFocus: [
            "Consistency beats intensity. Just 20 minutes of movement today is a victory.",
            "Fat loss is a marathon. Keep your heart rate in the 'Fat Burn Zone' (60-70% max) for efficiency.",
            "Small win of the day: choose the workout that challenges you most, then finish it.",
            "Stay hydrated! Often we mistake thirst for hunger. Drink water throughout your session."
        ],
        balancedFocus: [
            "Great day to challenge yourself. Try increasing your reps or reducing rest time slightly.",
            "Focus on your breathing. Inhale on the relaxation, exhale on the effort.",
            "You're in the rhythm. Add a 5-minute mobility flow before you start to protect your joints.",
            "Consistency is your superpower. You've shown up; now give it your best 80% effort."
        ]
    };

    let selection = [];
    if (goal === 'gain' || bmiCategory === 'underweight') {
        selection = messages.muscleFocus;
    } else if (goal === 'lose' || bmiCategory === 'obese') {
        selection = messages.weightLossFocus;
    } else {
        selection = messages.balancedFocus;
    }

    return selection[Math.floor(Math.random() * selection.length)];
};

export const getBMIScaledPlan = (exercise, profile) => {
    const bmiCategory = getBMICategory(profile?.height, profile?.weight);

    let sets = exercise.sets || 3;
    let reps = exercise.reps || 12;
    let rest = "60s";

    if (bmiCategory === 'obese') {
        // Lower reps, more sets for safety and endurance building
        reps = Math.round(reps * 0.7);
        sets = Math.max(2, sets - 1);
        rest = "90s";
    } else if (bmiCategory === 'underweight') {
        // Higher intensity per set, focus on strength
        reps = Math.min(8, reps);
        sets = Math.max(3, sets);
        rest = "2 min";
    } else if (profile?.goal === 'lose') {
        // Higher volume
        reps = Math.round(reps * 1.2);
        rest = "45s";
    }

    return { reps, sets, rest, bmiCategory };
};

const EXEC_TIPS = {
    'Push-ups': ["Keep your core tight", "Don't flare your elbows", "Go all the way down until chest nearly touches floor"],
    'Squats': ["Keep weight on your heels", "Back straight, chest up", "Knees should not go past toes"],
    'Planks': ["Keep body in a straight line", "Squeeze your glutes", "Don't let your hips sag"],
    'Burpees': ["Explode through the jump", "Land softly", "Full range push-up at the bottom"],
    'Jumping Jacks': ["Stay light on your feet", "Full arm circles", "Maintain steady rhythm"],
    'High Knees': ["Drive knees to hip height", "Pump arms for momentum", "Stay on balls of your feet"],
    'Mountain Climbers': ["Keep hips low", "Bring knee toward chest as far as possible", "Stabilize shoulders"],
    'Standard Bench Press': ["Feet flat on floor", "Shoulder blades squeezed together", "Control the bar on the way down"],
    'Deadlifts': ["Keep the bar close to your shins", "Lift with legs, not back", "Pull your shoulders back at the top"],
    'Shadow Boxing': ["Snap your punches", "Keep your chin down", "Stay moving on your toes"],
};

export const getFormTips = (name) => {
    // Find matching tips or return default
    const key = Object.keys(EXEC_TIPS).find(k => name.includes(k));
    return EXEC_TIPS[key] || ["Maintain a slow, controlled tempo", "Breathe out on the effort", "Stop if you feel sharp pain"];
};

