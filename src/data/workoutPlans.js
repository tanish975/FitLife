export const workoutPlans = {
    home: {
        cardio: [
            {
                id: 1, name: 'Jumping Jacks', description: 'Full body cardio warm-up', duration: '3 min', sets: 3, calories: 50, difficulty: 'easy', exercises: [
                    { id: 'jj1', name: 'Regular Jumping Jacks', reps: 30, sets: 3, duration: '1 min', muscle: 'Full Body', pose: 'jumping' },
                    { id: 'jj2', name: 'Cross Jacks', reps: 20, sets: 3, duration: '1 min', muscle: 'Full Body', pose: 'jumping' },
                    { id: 'jj3', name: 'Star Jumps', reps: 15, sets: 3, duration: '1 min', muscle: 'Full Body', pose: 'jumping' },
                ]
            },
            {
                id: 2, name: 'High Knees', description: 'Boost heart rate & burn fat', duration: '5 min', sets: 4, calories: 80, difficulty: 'medium', exercises: [
                    { id: 'hk1', name: 'Basic High Knees', reps: 40, sets: 4, duration: '45 sec', muscle: 'Legs', pose: 'run' },
                    { id: 'hk2', name: 'Twist High Knees', reps: 30, sets: 4, duration: '45 sec', muscle: 'Core', pose: 'run' },
                    { id: 'hk3', name: 'Sprint High Knees', reps: 20, sets: 4, duration: '30 sec', muscle: 'Legs', pose: 'run' },
                ]
            },
            {
                id: 3, name: 'Burpees', description: 'Ultimate fat burning exercise', duration: '8 min', sets: 4, calories: 120, difficulty: 'hard', exercises: [
                    { id: 'b1', name: 'Standard Burpees', reps: 10, sets: 4, duration: '2 min', muscle: 'Full Body', pose: 'pushup' },
                    { id: 'b2', name: 'Jump Burpees', reps: 8, sets: 4, duration: '2 min', muscle: 'Full Body', pose: 'pushup' },
                    { id: 'b3', name: 'Burpee Push-ups', reps: 6, sets: 4, duration: '2 min', muscle: 'Full Body', pose: 'pushup' },
                ]
            },
            {
                id: 12, name: 'Mountain Climbers', description: 'High intensity core cardio', duration: '10 min', sets: 4, calories: 100, difficulty: 'hard', exercises: [
                    { id: 'mc1', name: 'Classic Climbers', reps: 50, sets: 4, duration: '1 min', muscle: 'Core', pose: 'plank' },
                    { id: 'mc2', name: 'Cross-Body Climbers', reps: 40, sets: 4, duration: '1 min', muscle: 'Obliques', pose: 'plank' },
                    { id: 'mc3', name: 'Spider Climbers', reps: 30, sets: 4, duration: '1 min', muscle: 'Core', pose: 'plank' },
                ]
            },
            {
                id: 101, name: 'HIIT Fire', description: 'Quick high intensity interval training', duration: '15 min', sets: 3, calories: 150, difficulty: 'hard', exercises: [
                    { id: 'hi1', name: 'Burpee Tucks', reps: 12, sets: 3, duration: '1 min', muscle: 'Full Body', pose: 'pushup' },
                    { id: 'hi2', name: 'Scurrying Climbers', reps: 40, sets: 3, duration: '1 min', muscle: 'Cardio', pose: 'plank' },
                    { id: 'hi3', name: 'Power Jacks', reps: 25, sets: 3, duration: '1 min', muscle: 'Legs', pose: 'jumping' },
                ]
            },
            {
                id: 201, name: 'Shadow Boxing', description: 'Boxer movement and coordination', duration: '20 min', sets: 5, calories: 180, difficulty: 'medium', exercises: [
                    { id: 'sb1', name: 'Jab-Cross Combo', reps: 50, sets: 5, duration: '2 min', muscle: 'Shoulders/Arms', pose: 'standing' },
                    { id: 'sb2', name: 'Hook-Uppercut', reps: 40, sets: 5, duration: '2 min', muscle: 'Core/Arms', pose: 'standing' },
                    { id: 'sb3', name: 'Duck & Weave', reps: 30, sets: 5, duration: '2 min', muscle: 'Legs/Core', pose: 'squat' },
                    { id: 'sb4', name: 'Freestyle Round', reps: 1, sets: 5, duration: '3 min', muscle: 'Full Body', pose: 'run' },
                ]
            },
            {
                id: 202, name: 'Tabata Burn', description: '20s intense work, 10s rest', duration: '12 min', sets: 8, calories: 140, difficulty: 'hard', exercises: [
                    { id: 'tb1', name: 'Butt Kicks', reps: 40, sets: 8, duration: '20 sec', muscle: 'Legs', pose: 'run' },
                    { id: 'tb2', name: 'Skaters', reps: 30, sets: 8, duration: '20 sec', muscle: 'Full Body', pose: 'lunge' },
                    { id: 'tb3', name: 'Plank Jacks', reps: 25, sets: 8, duration: '20 sec', muscle: 'Core', pose: 'plank' },
                ]
            },
            {
                id: 401, name: 'Apartment Cardio', description: 'Low impact, no jumping', duration: '15 min', sets: 3, calories: 100, difficulty: 'easy', exercises: [
                    { id: 'ac1', name: 'March in Place', reps: 1, sets: 3, duration: '2 min', muscle: 'Full Body', pose: 'standing' },
                    { id: 'ac2', name: 'Squat to Reach', reps: 15, sets: 3, duration: '2 min', muscle: 'Legs/Shoulders', pose: 'squat' },
                    { id: 'ac3', name: 'Standing Elbow-Knee', reps: 20, sets: 3, duration: '2 min', muscle: 'Core', pose: 'standing' },
                    { id: 'ac4', name: 'Lateral Step Reaches', reps: 20, sets: 3, duration: '2 min', muscle: 'Full Body', pose: 'standing' },
                ]
            },
            {
                id: 402, name: 'Explosive Power', description: 'Plyometric training at home', duration: '18 min', sets: 4, calories: 160, difficulty: 'hard', exercises: [
                    { id: 'ep1', name: 'Box Jumps (Step)', reps: 12, sets: 4, duration: '2 min', muscle: 'Legs', pose: 'jumping' },
                    { id: 'ep2', name: 'Plyo Push-ups', reps: 8, sets: 4, duration: '2 min', muscle: 'Chest/Arms', pose: 'pushup' },
                    { id: 'ep3', name: 'Broad Jumps', reps: 10, sets: 4, duration: '2 min', muscle: 'Lower Body', pose: 'jumping' },
                    { id: 'ep4', name: 'Tuck Jumps', reps: 12, sets: 4, duration: '2 min', muscle: 'Core/Legs', pose: 'jumping' },
                ]
            }
        ],

        strength: [
            {
                id: 4, name: 'Push-ups', description: 'Essential chest development', duration: '10 min', sets: 4, calories: 100, difficulty: 'medium', exercises: [
                    { id: 'pu1', name: 'Standard Push-ups', reps: 15, sets: 4, duration: '2 min', muscle: 'Chest', pose: 'pushup' },
                    { id: 'pu2', name: 'Wide Push-ups', reps: 12, sets: 4, duration: '2 min', muscle: 'Chest', pose: 'pushup' },
                    { id: 'pu3', name: 'Diamond Push-ups', reps: 10, sets: 4, duration: '2 min', muscle: 'Triceps', pose: 'pushup' },
                    { id: 'pu4', name: 'Decline Push-ups', reps: 8, sets: 4, duration: '2 min', muscle: 'Upper Chest', pose: 'pushup' },
                ]
            },
            {
                id: 5, name: 'Squats', description: 'The king of leg exercises', duration: '12 min', sets: 4, calories: 90, difficulty: 'easy', exercises: [
                    { id: 'sq1', name: 'Basic Squats', reps: 20, sets: 4, duration: '2 min', muscle: 'Legs', pose: 'squat' },
                    { id: 'sq2', name: 'Jump Squats', reps: 15, sets: 4, duration: '2 min', muscle: 'Legs', pose: 'squat' },
                    { id: 'sq3', name: 'Sumo Squats', reps: 15, sets: 4, duration: '2 min', muscle: 'Inner Thighs', pose: 'squat' },
                    { id: 'sq4', name: 'Pulse Squats', reps: 20, sets: 4, duration: '2 min', muscle: 'Quads', pose: 'squat' },
                ]
            },
            {
                id: 6, name: 'Planks', description: 'Maximum core endurance', duration: '8 min', sets: 3, calories: 60, difficulty: 'medium', exercises: [
                    { id: 'pl1', name: 'Standard Plank', reps: 1, sets: 3, duration: '60 sec', muscle: 'Core', pose: 'plank' },
                    { id: 'pl2', name: 'Side Plank Left', reps: 1, sets: 3, duration: '30 sec', muscle: 'Obliques', pose: 'plank' },
                    { id: 'pl3', name: 'Side Plank Right', reps: 1, sets: 3, duration: '30 sec', muscle: 'Obliques', pose: 'plank' },
                    { id: 'pl4', name: 'Plank Shoulder Taps', reps: 20, sets: 3, duration: '45 sec', muscle: 'Core', pose: 'plank' },
                ]
            },
            {
                id: 13, name: 'Abs & Core', description: 'Aesthetic ab definitions', duration: '15 min', sets: 3, calories: 90, difficulty: 'medium', exercises: [
                    { id: 'ab1', name: 'Crunches', reps: 20, sets: 3, duration: '45 sec', muscle: 'Upper Abs', pose: 'situp' },
                    { id: 'ab2', name: 'Leg Raises', reps: 15, sets: 3, duration: '45 sec', muscle: 'Lower Abs', pose: 'situp' },
                    { id: 'ab3', name: 'Russian Twists', reps: 30, sets: 3, duration: '60 sec', muscle: 'Obliques', pose: 'situp' },
                    { id: 'ab4', name: 'Bicycle Crunches', reps: 20, sets: 3, duration: '60 sec', muscle: 'Core', pose: 'situp' },
                ]
            },
            {
                id: 16, name: 'Morning Yoga', description: 'Total body flow', duration: '20 min', sets: 1, calories: 50, difficulty: 'easy', exercises: [
                    { id: 'yo1', name: 'Downward Dog', reps: 1, sets: 1, duration: '1 min', muscle: 'Full Body', pose: 'stretch' },
                    { id: 'yo2', name: 'Warrior I', reps: 1, sets: 1, duration: '1 min', muscle: 'Legs', pose: 'lunge' },
                    { id: 'yo3', name: 'Cobra Pose', reps: 1, sets: 1, duration: '1 min', muscle: 'Back', pose: 'stretch' },
                    { id: 'yo4', name: 'Child\'s Pose', reps: 1, sets: 1, duration: '2 min', muscle: 'Back', pose: 'sitting' },
                ]
            },
            {
                id: 102, name: 'Core Sculpt', description: 'Advanced core mechanics', duration: '12 min', sets: 3, calories: 75, difficulty: 'medium', exercises: [
                    { id: 'cs1', name: 'Hollow Body Hold', reps: 1, sets: 3, duration: '45 sec', muscle: 'Core', pose: 'plank' },
                    { id: 'cs2', name: 'Flutter Kicks', reps: 40, sets: 3, duration: '1 min', muscle: 'Lower Abs', pose: 'situp' },
                    { id: 'cs3', name: 'Plank Twists', reps: 20, sets: 3, duration: '1 min', muscle: 'Core', pose: 'plank' },
                ]
            },
            {
                id: 203, name: 'Lower Body Blast', description: 'Target glutes and quads', duration: '25 min', sets: 4, calories: 150, difficulty: 'medium', exercises: [
                    { id: 'lb1', name: 'Bulgarian Split Squat', reps: 12, sets: 4, duration: '3 min', muscle: 'Glutes/Quads', pose: 'lunge' },
                    { id: 'lb2', name: 'Glute Bridges', reps: 20, sets: 4, duration: '2 min', muscle: 'Glutes', pose: 'situp' },
                    { id: 'lb3', name: 'Fire Hydrants', reps: 15, sets: 4, duration: '2 min', muscle: 'Abductors', pose: 'plank' },
                    { id: 'lb4', name: 'Calf Raises (Single Leg)', reps: 15, sets: 4, duration: '2 min', muscle: 'Calves', pose: 'standing' },
                ]
            },
            {
                id: 204, name: 'Upper Tone', description: 'Chest and tricep focus', duration: '20 min', sets: 3, calories: 110, difficulty: 'easy', exercises: [
                    { id: 'ut1', name: 'Pike Push-ups', reps: 10, sets: 3, duration: '2 min', muscle: 'Shoulders', pose: 'pushup' },
                    { id: 'ut2', name: 'Tricep Dips', reps: 15, sets: 3, duration: '2 min', muscle: 'Triceps', pose: 'sitting' },
                    { id: 'ut3', name: 'Incline Push-ups', reps: 15, sets: 3, duration: '2 min', muscle: 'Lower Chest', pose: 'pushup' },
                    { id: 'ut4', name: 'Plank Reaches', reps: 20, sets: 3, duration: '2 min', muscle: 'Shoulders/Core', pose: 'plank' },
                ]
            },
            {
                id: 403, name: 'Full Body Mobility', description: 'Joint health and flexibility', duration: '15 min', sets: 2, calories: 60, difficulty: 'easy', exercises: [
                    { id: 'fm1', name: 'Cat-Cow', reps: 10, sets: 2, duration: '2 min', muscle: 'Spine/Back', pose: 'plank' },
                    { id: 'fm2', name: 'World\'s Greatest Stretch', reps: 10, sets: 2, duration: '2 min', muscle: 'Hips/Thoracic', pose: 'lunge' },
                    { id: 'fm3', name: '90/90 Hip Switches', reps: 12, sets: 2, duration: '2 min', muscle: 'Hips', pose: 'sitting' },
                    { id: 'fm4', name: 'Shoulder Dislocates', reps: 15, sets: 2, duration: '2 min', muscle: 'Shoulders', pose: 'standing' },
                ]
            },
            {
                id: 404, name: 'Pilates Core', description: 'Controlled core engagement', duration: '22 min', sets: 3, calories: 120, difficulty: 'medium', exercises: [
                    { id: 'pc1', name: 'The Hundred', reps: 1, sets: 3, duration: '2 min', muscle: 'Abs', pose: 'situp' },
                    { id: 'pc2', name: 'Leg Circles', reps: 15, sets: 3, duration: '2 min', muscle: 'Core/Hips', pose: 'situp' },
                    { id: 'pc3', name: 'Swimming', reps: 20, sets: 3, duration: '2 min', muscle: 'Back/Glutes', pose: 'plank' },
                    { id: 'pc4', name: 'Single Leg Stretch', reps: 20, sets: 3, duration: '2 min', muscle: 'Lower Abs', pose: 'situp' },
                ]
            }
        ]
    },
    gym: {
        cardio: [
            {
                id: 7, name: 'Treadmill', description: 'Running based cardio', duration: '20 min', sets: 1, calories: 200, difficulty: 'easy', exercises: [
                    { id: 'tm1', name: 'Warm-up Walk', reps: 1, sets: 1, duration: '5 min', muscle: 'Legs', pose: 'run' },
                    { id: 'tm2', name: 'Jogging', reps: 1, sets: 1, duration: '10 min', muscle: 'Full Body', pose: 'run' },
                    { id: 'tm3', name: 'Sprint Intervals', reps: 5, sets: 1, duration: '5 min', muscle: 'Full Body', pose: 'run' },
                ]
            },
            {
                id: 8, name: 'Cycling', description: 'Stationary bike session', duration: '25 min', sets: 1, calories: 250, difficulty: 'medium', exercises: [
                    { id: 'cy1', name: 'Warm-up Cycling', reps: 1, sets: 1, duration: '5 min', muscle: 'Legs', pose: 'run' },
                    { id: 'cy2', name: 'Moderate Pace', reps: 1, sets: 1, duration: '15 min', muscle: 'Legs', pose: 'run' },
                    { id: 'cy3', name: 'High Intensity Intervals', reps: 5, sets: 1, duration: '5 min', muscle: 'Legs', pose: 'run' },
                ]
            },
            {
                id: 14, name: 'Elliptical', description: 'Total body trainer', duration: '30 min', sets: 1, calories: 300, difficulty: 'easy', exercises: [
                    { id: 'el1', name: 'Warm-up', reps: 1, sets: 1, duration: '5 min', muscle: 'Full Body', pose: 'run' },
                    { id: 'el2', name: 'Steady State', reps: 1, sets: 1, duration: '20 min', muscle: 'Full Body', pose: 'run' },
                    { id: 'el3', name: 'Cooldown', reps: 1, sets: 1, duration: '5 min', muscle: 'Full Body', pose: 'run' },
                ]
            },
            {
                id: 103, name: 'Rowing Master', description: 'Rowing machine power', duration: '15 min', sets: 1, calories: 180, difficulty: 'medium', exercises: [
                    { id: 'rm1', name: 'Easy Row', reps: 1, sets: 1, duration: '5 min', muscle: 'Full Body', pose: 'sitting' },
                    { id: 'rm2', name: 'Power Strokes', reps: 1, sets: 1, duration: '5 min', muscle: 'Back/Legs', pose: 'sitting' },
                    { id: 'rm3', name: 'Sprint Finisher', reps: 1, sets: 1, duration: '5 min', muscle: 'Heart', pose: 'sitting' },
                ]
            },
            {
                id: 301, name: 'Stair Climber', description: 'Climb for higher burn', duration: '20 min', sets: 1, calories: 240, difficulty: 'hard', exercises: [
                    { id: 'sc1', name: 'Manual Step', reps: 1, sets: 1, duration: '10 min', muscle: 'Legs/Glutes', pose: 'climb' },
                    { id: 'sc2', name: 'Skip a Step', reps: 1, sets: 1, duration: '5 min', muscle: 'Glutes', pose: 'climb' },
                    { id: 'sc3', name: 'Side Step Left', reps: 1, sets: 1, duration: '2.5 min', muscle: 'Abductors', pose: 'climb' },
                    { id: 'sc4', name: 'Side Step Right', reps: 1, sets: 1, duration: '2.5 min', muscle: 'Abductors', pose: 'climb' },
                ]
            },
            {
                id: 501, name: 'Assault Bike Sprint', description: 'Max effort interval training', duration: '10 min', sets: 10, calories: 200, difficulty: 'hard', exercises: [
                    { id: 'abks1', name: 'Max Effort Sprint', reps: 1, sets: 10, duration: '30 sec', muscle: 'Full Body', pose: 'run' },
                    { id: 'abks2', name: 'Active Recovery', reps: 1, sets: 10, duration: '30 sec', muscle: 'Legs', pose: 'run' },
                ]
            },
            {
                id: 502, name: 'Box Jumps & Burpees', description: 'Cross training circuit', duration: '15 min', sets: 5, calories: 220, difficulty: 'hard', exercises: [
                    { id: 'bjb1', name: 'Box Jumps', reps: 15, sets: 5, duration: '2 min', muscle: 'Legs', pose: 'jumping' },
                    { id: 'bjb2', name: 'Bar Facing Burpees', reps: 12, sets: 5, duration: '2 min', muscle: 'Full Body', pose: 'pushup' },
                    { id: 'bjb3', name: 'Kettlebell Swings', reps: 20, sets: 5, duration: '2 min', muscle: 'Posterior Chain', pose: 'standing' },
                ]
            }
        ],

        strength: [
            {
                id: 9, name: 'Bench Press', description: 'Chest and tricep builder', duration: '15 min', sets: 4, calories: 120, difficulty: 'medium', exercises: [
                    { id: 'bp1', name: 'Warm-up Set', reps: 15, sets: 1, duration: '2 min', muscle: 'Chest', pose: 'pushup' },
                    { id: 'bp2', name: 'Working Sets', reps: 10, sets: 4, duration: '3 min', muscle: 'Chest', pose: 'pushup' },
                    { id: 'bp3', name: 'Close Grip', reps: 10, sets: 3, duration: '3 min', muscle: 'Triceps', pose: 'pushup' },
                ]
            },
            {
                id: 10, name: 'Deadlifts', description: 'Heavy lifting pull session', duration: '20 min', sets: 4, calories: 150, difficulty: 'hard', exercises: [
                    { id: 'dl1', name: 'Warm-up Light', reps: 12, sets: 2, duration: '3 min', muscle: 'Back', pose: 'squat' },
                    { id: 'dl2', name: 'Working Sets', reps: 8, sets: 4, duration: '4 min', muscle: 'Full Body', pose: 'squat' },
                    { id: 'dl3', name: 'Romanian Deadlifts', reps: 10, sets: 3, duration: '3 min', muscle: 'Hamstrings', pose: 'squat' },
                ]
            },
            {
                id: 11, name: 'Lat Pulldowns', description: 'Back width focus', duration: '12 min', sets: 4, calories: 80, difficulty: 'easy', exercises: [
                    { id: 'lp1', name: 'Wide Grip', reps: 12, sets: 4, duration: '3 min', muscle: 'Back', pose: 'standing' },
                    { id: 'lp2', name: 'Close Grip', reps: 12, sets: 3, duration: '3 min', muscle: 'Back', pose: 'standing' },
                    { id: 'lp3', name: 'Reverse Grip', reps: 10, sets: 3, duration: '3 min', muscle: 'Biceps', pose: 'standing' },
                ]
            },
            {
                id: 15, name: 'Shoulder Press', description: 'Overhead strength work', duration: '15 min', sets: 4, calories: 95, difficulty: 'medium', exercises: [
                    { id: 'sp1', name: 'Dumbbell Press', reps: 12, sets: 4, duration: '3 min', muscle: 'Shoulders', pose: 'standing' },
                    { id: 'sp2', name: 'Lateral Raises', reps: 15, sets: 3, duration: '2 min', muscle: 'Side Delts', pose: 'standing' },
                    { id: 'sp3', name: 'Front Raises', reps: 12, sets: 3, duration: '2 min', muscle: 'Front Delts', pose: 'standing' },
                    { id: 'sp4', name: 'Face Pulls', reps: 15, sets: 3, duration: '2 min', muscle: 'Rear Delts', pose: 'standing' },
                ]
            },
            {
                id: 17, name: 'Leg Day Crush', description: 'Lower body destruction', duration: '40 min', sets: 4, calories: 300, difficulty: 'hard', exercises: [
                    { id: 'ld1', name: 'Leg Press', reps: 12, sets: 4, duration: '3 min', muscle: 'Quads', pose: 'sitting' },
                    { id: 'ld2', name: 'Walking Lunges', reps: 20, sets: 3, duration: '4 min', muscle: 'Legs', pose: 'lunge' },
                    { id: 'ld3', name: 'Leg Extensions', reps: 15, sets: 3, duration: '3 min', muscle: 'Quads', pose: 'sitting' },
                    { id: 'ld4', name: 'Calf Raises', reps: 20, sets: 4, duration: '2 min', muscle: 'Calves', pose: 'standing' },
                ]
            },
            {
                id: 104, name: 'Arm Armageddon', description: 'Bicep/Tricep focused', duration: '30 min', sets: 3, calories: 150, difficulty: 'medium', exercises: [
                    { id: 'aa1', name: 'Barbell Curls', reps: 12, sets: 3, duration: '3 min', muscle: 'Biceps', pose: 'standing' },
                    { id: 'aa2', name: 'Tricep Pushdowns', reps: 15, sets: 3, duration: '3 min', muscle: 'Triceps', pose: 'standing' },
                    { id: 'aa3', name: 'Hammer Curls', reps: 12, sets: 3, duration: '3 min', muscle: 'Biceps', pose: 'standing' },
                    { id: 'aa4', name: 'Skull Crushers', reps: 10, sets: 3, duration: '3 min', muscle: 'Triceps', pose: 'pushup' },
                ]
            },
            {
                id: 302, name: 'Back & Bis Power', description: 'Complete pull day', duration: '45 min', sets: 4, calories: 250, difficulty: 'hard', exercises: [
                    { id: 'bb1', name: 'Barbell Rows', reps: 10, sets: 4, duration: '4 min', muscle: 'Back', pose: 'squat' },
                    { id: 'bb2', name: 'Pull-ups', reps: 8, sets: 3, duration: '3 min', muscle: 'Lats', pose: 'standing' },
                    { id: 'bb3', name: 'Preacher Curls', reps: 12, sets: 3, duration: '3 min', muscle: 'Biceps', pose: 'sitting' },
                    { id: 'bb4', name: 'Face Pulls', reps: 15, sets: 4, duration: '2 min', muscle: 'Rear Delts', pose: 'standing' },
                ]
            },
            {
                id: 303, name: 'Chest & Tris Sculpt', description: 'Total push day split', duration: '40 min', sets: 4, calories: 220, difficulty: 'medium', exercises: [
                    { id: 'ct1', name: 'Incline DB Press', reps: 12, sets: 4, duration: '3 min', muscle: 'Upper Chest', pose: 'pushup' },
                    { id: 'ct2', name: 'Cable Flyes', reps: 15, sets: 3, duration: '3 min', muscle: 'Chest', pose: 'standing' },
                    { id: 'ct3', name: 'Overhead Extension', reps: 12, sets: 4, duration: '3 min', muscle: 'Triceps', pose: 'standing' },
                    { id: 'ct4', name: 'Dips', reps: 12, sets: 3, duration: '3 min', muscle: 'Chest/Tris', pose: 'standing' },
                ]
            },
            {
                id: 304, name: 'Strength Foundations', description: 'Heavy compound focus', duration: '60 min', sets: 5, calories: 350, difficulty: 'hard', exercises: [
                    { id: 'sf1', name: 'Back Squat', reps: 5, sets: 5, duration: '5 min', muscle: 'Legs/Glutes', pose: 'squat' },
                    { id: 'sf2', name: 'Bench Press', reps: 5, sets: 5, duration: '5 min', muscle: 'Chest', pose: 'pushup' },
                    { id: 'sf3', name: 'Conventional Deadlift', reps: 3, sets: 5, duration: '5 min', muscle: 'Full Body', pose: 'squat' },
                ]
            },
            {
                id: 503, name: 'Leg Day Hypertrophy', description: 'Muscle growth focus', duration: '50 min', sets: 4, calories: 320, difficulty: 'hard', exercises: [
                    { id: 'ldh1', name: 'Hack Squats', reps: 12, sets: 4, duration: '4 min', muscle: 'Quads', pose: 'squat' },
                    { id: 'ldh2', name: 'Leg Curls', reps: 15, sets: 4, duration: '3 min', muscle: 'Hamstrings', pose: 'sitting' },
                    { id: 'ldh3', name: 'Leg Extensions', reps: 20, sets: 4, duration: '3 min', muscle: 'Quads', pose: 'sitting' },
                    { id: 'ldh4', name: 'Seated Calf Raises', reps: 20, sets: 4, duration: '3 min', muscle: 'Calves', pose: 'sitting' },
                ]
            },
            {
                id: 504, name: 'Shoulder Power', description: 'Massive shoulder growth', duration: '35 min', sets: 4, calories: 180, difficulty: 'medium', exercises: [
                    { id: 'spw1', name: 'Military Press', reps: 8, sets: 4, duration: '4 min', muscle: 'Shoulders', pose: 'standing' },
                    { id: 'spw2', name: 'Arnold Press', reps: 12, sets: 3, duration: '3 min', muscle: 'Shoulders', pose: 'sitting' },
                    { id: 'spw3', name: 'Lateral Raises', reps: 20, sets: 4, duration: '3 min', muscle: 'Side Delts', pose: 'standing' },
                    { id: 'spw4', name: 'Upright Rows', reps: 12, sets: 3, duration: '3 min', muscle: 'Rear Delts', pose: 'standing' },
                ]
            }
        ]
    }
};
