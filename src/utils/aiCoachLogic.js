
export const getAiCoachAdvice = (bmi, goal, age, gender, bodyFat) => {
    if (!bmi) return "Update your vitals above to receive personalized coaching insights.";

    // Determine BMI category
    let category = '';
    if (bmi < 18.5) category = 'underweight';
    else if (bmi < 25) category = 'normal';
    else if (bmi < 30) category = 'overweight';
    else category = 'obese';

    // Base Advice Matrix with multiple variations per scenario
    const adviceMatrix = {
        underweight: {
            lose: [
                "Your BMI indicates you are currently underweight. Further weight loss is not recommended. I suggest focusing on nutrient density and speaking with a nutritionist.",
                "System Alert: Caloric deficit detected while underweight. This can impact your hormonal health. Let's pivot to building a strong foundation instead.",
                "Your health stats suggest you're in a deficit. To protect your bones and muscles, I recommend a recovery phase with focus on high-quality proteins."
            ],
            gain: [
                "Building lean mass is your primary objective. Focus on a caloric surplus (300-500 kcal extra) and progressive resistance training. Don't skip the protein!",
                "Great goal! Since you're beginning from a lower weight, your body is primed for 'newbie gains'. Focus on compound lifts like squats and presses.",
                "To gain safely, prioritize 1.6g to 2.2g of protein per kg of body weight. Nutrient density over empty calories is key for your metabolism."
            ],
            maintain: [
                "Prioritize stabilizing your weight. Focus on healthy fats (avocado, nuts) and consistent meal timing to ensure you're getting enough energy.",
                "Stability is victory. Focus on improving your strength-to-weight ratio. Even at this weight, you can build incredible functional power.",
                "Your body needs a steady energy supply. Try eating 4-5 smaller, calorie-dense meals to maintain your metabolic health without feeling overstuffed."
            ],
            default: "Your BMI is on the lower side. Focus on building strength and ensuring adequate micronutrient intake to support your energy levels."
        },
        normal: {
            lose: [
                "You're in a great spot! To lean out, a small 'mini-cut' (200-300 kcal deficit) combined with high protein and resistance training will keep your muscle while losing fat.",
                "A 'Body Recomposition' phase would work well for you. Focus on fat loss through cardio while maintaining your current strength levels in the gym.",
                "You're already at a healthy weight. If you're looking for more definition, focus on 'Periodization'—alternating weeks of intensity and recovery."
            ],
            gain: [
                "Perfect base for a 'lean bulk'. Aim for a slight surplus and focus on lifting heavier each week. This is the optimal metabolic zone for muscle growth.",
                "Your metabolism is stable. Use this to your advantage by increasing your volume (sets x reps) weekly to trigger maximal muscle hypertrophy.",
                "To optimize growth in this zone, ensure you're getting 7-9 hours of sleep. Your muscles grow while you rest, not while you're lifting!"
            ],
            maintain: [
                "You're in the 'Golden Zone'. Focus on performance goals now—run faster, lift heavier, or improve flexibility. Your body composition is excellent.",
                "Maintenance doesn't mean standing still. It's the perfect time to work on 'Skill Mastery'—learn a handstand, a perfect pull-up, or a new sport.",
                "Consistency is your best friend here. You've reached a healthy peak; now focus on metabolic longevity and heart health with Zone 2 cardio."
            ],
            default: "Balance is your superpower. Maintain your current habits while exploring new fitness challenges like mobility or endurance training."
        },
        overweight: {
            lose: [
                "This is a great time for a focused fat-loss phase. A 500-calorie deficit and 10,000 steps a day will yield visible results. Consistency over perfection!",
                "Your body has plenty of stored energy. Leverage this by performing 'Fasted Cardio' in the morning to kickstart your fat metabolism effectively.",
                "Focus on 'Non-Exercise Activity Thermogenesis' (NEAT). Small habits like taking the stairs and standing more will compound into massive results over time."
            ],
            gain: [
                "Since you're in the overweight category, I recommend a 'Body Recomposition'. Eat at your maintenance calories but train with high intensity. You'll swap fat for muscle.",
                "Lifting heavy while in this zone is excellent for your insulin sensitivity. Focus on big movements—Deadlifts and Squats—to torch calories.",
                "Building muscle will increase your Basal Metabolic Rate (BMR), making future fat loss much easier. Think of muscle as your 'Metabolic Engine'."
            ],
            maintain: [
                "Focus on cardiovascular health. Even if weight stays stable, improving your resting heart rate through Zone 2 cardio will have massive benefits.",
                "Sustainability is key. Instead of a drastic diet, try swaping one processed snack for a whole-food alternative every day this week.",
                "Prioritize sleep. Poor sleep triggers hunger hormones (ghrelin) which can make maintaining your current weight more difficult than it needs to be."
            ],
            default: "Small sustainable changes win. Start by increasing your water intake and ensuring every meal has a solid protein source."
        },
        obese: {
            lose: [
                "Prioritize longevity. Focus on low-impact activities like swimming or walking to protect your joints while you maintain a consistent caloric deficit.",
                "The 'Deep Health' approach: focus on how you feel and move rather than the scale. Losing just 5-10% of weight dramatically improves blood pressure.",
                "Start with 'Hydration First'. Drinking 500ml of water before every meal can naturally reduce your calorie intake by 13% without feeling restricted."
            ],
            gain: [
                "Initially, I recommend focusing on fat loss rather than building mass. As your weight decreases, your joints will thank you, and your muscle-building potential will improve.",
                "Focus on movement quality first. Building a foundation of mobility now will allow you to lift much heavier and safer once you reach your target weight.",
                "Metabolic health is the priority. Focus on resistance training to improve insulin sensitivity, which is a prerequisite for effective muscle building."
            ],
            maintain: [
                "Stability is a great first step. Work on eliminating liquid calories and ultra-processed foods to heal your metabolism.",
                "Focus on 'Inflammation Management'. Including more Omega-3s and antioxidants in your diet will help your body respond better to exercise.",
                "Celebrate the 'Non-Scale Victories'—better energy, fitting into clothes better, and sleeping more soundly. These are the true markers of progress."
            ],
            default: "Every step counts. Focus on the 'Big Wins': better sleep, more water, and daily movement. You've got this!"
        }
    };

    // Randomly select one advice from the array
    const variations = adviceMatrix[category][goal] || [adviceMatrix[category].default];
    const randomIndex = Math.floor(Math.random() * variations.length);
    let advice = variations[randomIndex];

    // Layer 2: Age-Specific Context
    if (age > 50) {
        advice += " Since you are over 50, prioritize joint mobility and adequate protein to prevent muscle loss (sarcopenia).";
    } else if (age < 20) {
        advice += " As a young athlete, focus on building strong foundational movements and don't neglect sleep—it's your best recovery tool.";
    }

    // Layer 3: Extra 'AI' Pro-Tips (Randomly added)
    const proTips = [
        " Pro-tip: Track your fiber intake; it's the secret to feeling full on fewer calories.",
        " Coach Note: Try 'Mindful Eating'—turning off screens while you eat can naturally prevent overeating.",
        " Strategy: Cold showers or ice baths can help with muscle recovery and metabolic boost.",
        " Insight: Your body weight can fluctuate 1-2kg daily due to water; focus on the weekly average!",
        " Remember: Motivation is what gets you started, but discipline is what keeps you going."
    ];

    // 40% chance to add a pro-tip for more variety
    if (Math.random() > 0.6) {
        advice += proTips[Math.floor(Math.random() * proTips.length)];
    }

    // Layer 2: Age-Specific Context
    if (age > 50) {
        advice += " Since you are over 50, prioritize joint mobility and adequate protein to prevent muscle loss (sarcopenia).";
    } else if (age < 20) {
        advice += " As a young athlete, focus on building strong foundational movements and don't neglect sleep—it's your best recovery tool.";
    }

    // Layer 3: Gender/Body Fat Nuance
    if (bodyFat) {
        if (gender === 'male' && bodyFat > 25 && category === 'normal') {
            advice += " Note: Your body fat is slightly high for a 'normal' BMI. Focus more on heavy lifting and less on steady-state cardio to improve your composition.";
        } else if (gender === 'female' && bodyFat > 32 && category === 'normal') {
            advice += " Note: For better metabolic health, consider increasing resistance training to shift your muscle-to-fat ratio.";
        }
    }

    return advice;
};
