import type { ExerciseItem, ExerciseTarget, MuscleGroup } from './types';

type Group = Exclude<MuscleGroup, 'All'>;
type Difficulty = ExerciseItem['difficulty'];
type Options = { seconds?: boolean; caution?: string; aliases?: string[] };

/**
 * Original descriptions, informed by the user's list. Stable IDs are additive;
 * broad legacy groups remain unchanged so older backups/cloud clients can read
 * the entries. Strength energy is deliberately not estimated without a duration.
 */
function movement(id: string, name: string, group: Group, equipment: string, isBodyweight: boolean,
  difficulty: Difficulty, targets: ExerciseTarget[], tip: string, options: Options = {}): ExerciseItem {
  return {
    id: `ex-more-${id}`, name, muscleGroup: group, equipment, isBodyweight, difficulty,
    targetAreas: targets, secondaryMuscles: targets.join(', '), defaultWeightKg: 0,
    caloriesPerSet: 0, energyEstimateUnavailable: group !== 'Cardio', tip,
    ...(options.seconds ? { logUnit: 'seconds' as const } : {}),
    ...(options.caution ? { caution: options.caution } : {}),
    ...(options.aliases ? { aliases: options.aliases } : {}),
  };
}
const body = (id: string, name: string, group: Group, equipment: string, difficulty: Difficulty, targets: ExerciseTarget[], tip: string, options?: Options) =>
  movement(id, name, group, equipment, true, difficulty, targets, tip, options);
const load = (id: string, name: string, group: Group, equipment: string, difficulty: Difficulty, targets: ExerciseTarget[], tip: string, options?: Options) =>
  movement(id, name, group, equipment, false, difficulty, targets, tip, options);

const neckCaution = 'Use very light pressure and keep the head still. Avoid if injured or symptomatic; ask a clinician or qualified coach first.';
const supervisedNeck = 'Specialist movement: use only with qualified supervision. Avoid loaded neck work after an injury or with dizziness, numbness or pain.';
const advancedCaution = 'Advanced: learn the technique with a qualified coach, start light and stop if anything hurts.';

export const EXERCISE_ADDITIONS: ExerciseItem[] = [
  // Neck: hand resistance requires no equipment; machine/harness work does.
  body('neck-front-hold', 'Isometric Neck Flexion', 'Shoulders', 'Bodyweight', 'Beginner', ['Neck','Stabilizers'], 'Sit tall. Place a hand on your forehead and gently resist without moving your head; breathe normally.', {seconds:true,caution:neckCaution,aliases:['manual neck resistance','front neck hold']}),
  body('neck-back-hold', 'Isometric Neck Extension', 'Shoulders', 'Bodyweight', 'Beginner', ['Neck','Stabilizers'], 'Place a hand behind your head and gently resist without moving your neck.', {seconds:true,caution:neckCaution,aliases:['manual neck resistance','back neck hold']}),
  body('neck-side-hold', 'Isometric Lateral Neck Hold', 'Shoulders', 'Bodyweight', 'Beginner', ['Neck','Stabilizers'], 'Place a hand at the side of your head and gently resist; repeat on the other side.', {seconds:true,caution:neckCaution,aliases:['lateral neck flexion','manual neck resistance']}),
  load('neck-flexion-machine', 'Neck Flexion Machine', 'Shoulders', 'Neck Machine', 'Advanced', ['Neck','Stabilizers'], 'Adjust the machine to fit and use only a light, controlled range.', {caution:supervisedNeck}),
  load('neck-extension-harness', 'Neck Harness Extension', 'Shoulders', 'Neck Harness', 'Advanced', ['Neck','Stabilizers'], 'Use a correctly fitted harness and a very light load under supervision; do not force the range.', {caution:supervisedNeck}),
  load('neck-lateral-machine', 'Lateral Neck Flexion Machine', 'Shoulders', 'Neck Machine', 'Advanced', ['Neck','Stabilizers'], 'Set the pad to fit and move slowly through a small, comfortable range.', {caution:supervisedNeck}),

  // Deltoids, upper/middle/lower trapezius and shoulder stabilizers.
  load('cable-lateral-raise', 'Cable Lateral Raise', 'Shoulders', 'Cable Machine', 'Beginner', ['Shoulders'], 'Raise the arm out to the side within a comfortable range; lower slowly.'),
  load('db-front-raise', 'Dumbbell Front Raise', 'Shoulders', 'Dumbbells', 'Beginner', ['Shoulders'], 'Lift a light weight forward without leaning back; stop at a comfortable height.'),
  load('cable-front-raise', 'Cable Front Raise', 'Shoulders', 'Cable Machine', 'Beginner', ['Shoulders'], 'Use light resistance and raise your arm forward within a comfortable range.'),
  load('reverse-pec-deck', 'Reverse Pec Deck Fly', 'Shoulders', 'Machine', 'Beginner', ['Shoulders','Traps','Back'], 'Set the seat so handles are comfortable; open the arms without shrugging.'),
  load('standing-rear-fly', 'Standing Dumbbell Rear-Delt Fly', 'Shoulders', 'Dumbbells', 'Intermediate', ['Shoulders','Traps','Back'], 'Hinge gently and raise light weights out to the sides without swinging.'),
  load('cable-rear-fly', 'Cable Rear-Delt Fly', 'Shoulders', 'Cable Machine', 'Intermediate', ['Shoulders','Traps','Back'], 'Use light cables and draw the arms outward with a controlled return.'),
  load('barbell-shrug', 'Barbell Shrug', 'Shoulders', 'Barbell', 'Beginner', ['Traps','Neck'], 'Raise shoulders toward the ears, pause briefly and lower. Do not roll the shoulders.'),
  load('dumbbell-shrug', 'Dumbbell Shrug', 'Shoulders', 'Dumbbells', 'Beginner', ['Traps','Neck','Forearms'], 'Keep arms long and lift shoulders straight up, then lower without rolling.'),
  load('upright-row', 'Cable Upright Row', 'Shoulders', 'Cable Machine', 'Intermediate', ['Traps','Shoulders'], 'Pull only to a comfortable height with light resistance; stop if your shoulders pinch.'),
  load('band-face-pull', 'Resistance Band Face Pull', 'Back', 'Resistance Band with Secure Anchor', 'Intermediate', ['Traps','Shoulders','Rotator cuff'], 'Use an anchor rated for the band. Pull toward the face with control, keeping the band away from eyes.'),
  body('shrug-hold', 'Isometric Shrug Hold', 'Shoulders', 'Bodyweight', 'Beginner', ['Traps','Neck'], 'Gently raise and hold the shoulders, breathe, then relax completely.', {seconds:true,aliases:['trap hold']}),
  body('wall-walk', 'Wall Walk', 'Shoulders', 'Wall', 'Advanced', ['Shoulders','Core','Full body'], 'On a non-slip floor, walk feet partway up a solid wall and return with control.', {caution:'Advanced inversion: use a spotter, clear the area and choose a shorter range or pike push-up if unsure.'}),
  body('handstand-pushup', 'Wall-Supported Handstand Push-Up', 'Shoulders', 'Wall', 'Advanced', ['Shoulders','Triceps','Core'], 'Use a clear, non-slip space and trained spotter. Lower only as far as you can control.', {caution:'Advanced inversion: learn with a qualified coach; do not fall onto the head or neck.'}),

  // Chest. Existing standard, incline, wide and wall push-ups remain available.
  load('incline-barbell-press', 'Incline Barbell Bench Press', 'Chest', 'Barbell and Bench', 'Intermediate', ['Chest','Shoulders','Triceps'], 'Set a modest incline, use safeties or a spotter, and lower with control.'),
  load('decline-barbell-press', 'Decline Barbell Bench Press', 'Chest', 'Barbell and Decline Bench', 'Intermediate', ['Chest','Shoulders','Triceps'], 'Secure your position and use a spotter or safeties; press through a comfortable range.'),
  load('flat-db-press', 'Flat Dumbbell Bench Press', 'Chest', 'Dumbbells and Bench', 'Intermediate', ['Chest','Shoulders','Triceps'], 'Keep wrists above elbows and lower with control; use a spotter when appropriate.'),
  load('smith-chest-press', 'Smith Machine Chest Press', 'Chest', 'Smith Machine', 'Intermediate', ['Chest','Shoulders','Triceps'], 'Set safety stops and align the bench before pressing through a comfortable range.'),
  body('decline-pushup', 'Decline Push-Up', 'Chest', 'Sturdy Bench', 'Intermediate', ['Chest','Shoulders','Core'], 'Place feet on a low, stable surface and keep your body aligned; lower slowly.'),
  body('diamond-pushup', 'Diamond Push-Up', 'Chest', 'Bodyweight', 'Intermediate', ['Chest','Triceps'], 'Bring hands closer together only as comfortably as wrists allow; use knees if helpful.'),
  body('close-pushup', 'Close-Grip Push-Up', 'Arms', 'Bodyweight', 'Intermediate', ['Triceps','Chest','Shoulders'], 'Place hands just inside shoulder width and lower with elbows near your sides.'),

  // Lats, rhomboids and lower back. Do not use unsecured doors or makeshift anchors.
  body('chin-up', 'Chin-Up', 'Back', 'Pull-Up Bar', 'Intermediate', ['Back','Biceps','Forearms'], 'Use a secure bar and pull with palms facing you; lower slowly.'),
  body('neutral-pullup', 'Neutral-Grip Pull-Up', 'Back', 'Pull-Up Bar', 'Intermediate', ['Back','Biceps'], 'Use secure parallel grips, pull smoothly and lower without swinging.'),
  load('weighted-pullup', 'Weighted Pull-Up', 'Back', 'Pull-Up Bar and Weight Belt', 'Advanced', ['Back','Biceps','Forearms'], 'Use secure equipment and add weight only after controlled unweighted pull-ups.', {caution:advancedCaution}),
  load('assisted-pullup', 'Assisted Pull-Up Machine', 'Back', 'Assisted Pull-Up Machine', 'Beginner', ['Back','Biceps'], 'Set enough assistance for controlled repetitions and use the handles securely.'),
  load('single-arm-pulldown', 'Single-Arm Cable Lat Pulldown', 'Back', 'Cable Machine', 'Intermediate', ['Back','Biceps'], 'Keep your torso steady and pull one elbow toward your side.'),
  load('t-bar-row', 'T-Bar Row', 'Back', 'T-Bar Row Machine', 'Intermediate', ['Back','Traps','Biceps'], 'Brace comfortably and row toward your torso without jerking.'),
  load('landmine-row', 'Landmine Row', 'Back', 'Landmine and Barbell', 'Intermediate', ['Back','Traps','Biceps'], 'Use a secure landmine attachment, hinge and row without twisting.'),
  load('machine-row', 'Seated Machine Row', 'Back', 'Row Machine', 'Beginner', ['Back','Traps','Biceps'], 'Set the seat and handles to fit; pull without leaning back.'),
  load('chest-supported-row', 'Chest-Supported Dumbbell Row', 'Back', 'Dumbbells and Incline Bench', 'Beginner', ['Back','Traps','Biceps'], 'Rest your chest on the bench and row with a smooth, controlled return.'),
  load('row-to-chest', 'Barbell Row to Chest', 'Back', 'Barbell', 'Intermediate', ['Back','Traps','Shoulders'], 'Use a light load, hinge comfortably and row toward the upper torso without jerking.'),
  load('rack-pull', 'Barbell Rack Pull', 'Back', 'Barbell and Safety Rack', 'Advanced', ['Back','Traps','Hamstrings','Glutes'], 'Set safeties evenly, brace and lift the bar close to your body.', {caution:advancedCaution}),
  body('back-extension', 'Roman Chair Back Extension', 'Back', 'Roman Chair', 'Intermediate', ['Back','Hamstrings','Glutes'], 'Use a correctly adjusted bench and lift only to a comfortable neutral position.'),
  load('jefferson-curl', 'Jefferson Curl', 'Back', 'Light Weight and Stable Platform', 'Advanced', ['Back','Hamstrings'], 'This is a specialized loaded spinal-flexion movement, not a beginner exercise.', {caution:'Only consider with qualified professional supervision; use very light load and stop with pain or symptoms.'}),
  body('superman-pull', 'Prone Superman Pull', 'Back', 'Bodyweight', 'Beginner', ['Back','Traps','Shoulders'], 'Lie face down, lift arms slightly and draw elbows toward your sides without forcing your neck or back.', {aliases:['superman pulls']}),
  body('superman-hold', 'Gentle Superman Hold', 'Back', 'Bodyweight', 'Intermediate', ['Back','Glutes'], 'Lift arms and legs only a little, keep your neck neutral and breathe.', {seconds:true}),
  body('prone-y', 'Prone Y Raise', 'Back', 'Bodyweight', 'Beginner', ['Back','Traps','Shoulders'], 'Lie face down and gently raise arms in a Y; avoid arching your neck.'),
  body('prone-t', 'Prone T Raise', 'Back', 'Bodyweight', 'Beginner', ['Back','Traps','Shoulders'], 'Lift arms slightly out to the sides in a T, then lower smoothly.', {aliases:['prone reverse fly','lying rear delt raise']}),
  load('band-row', 'Resistance Band Row', 'Back', 'Resistance Band with Secure Anchor', 'Beginner', ['Back','Traps','Biceps'], 'Check a purpose-made secure anchor and band for damage; row with control, away from the face.'),
  body('doorframe-row', 'Supported Doorframe Row', 'Back', 'Secure Door Frame', 'Intermediate', ['Back','Biceps'], 'Use only a solid, fixed frame you can grip safely; keep feet planted and lean back slightly.', {caution:'Do not pull on a door, handle, sheet or unsecured frame. Choose a secure bar if unsure.'}),
  load('backpack-row', 'Backpack Row', 'Back', 'Secure Backpack', 'Beginner', ['Back','Biceps','Forearms'], 'Secure the contents and straps, hinge comfortably and pull the bag toward your side.'),

  // Arms and grip.
  load('straight-bar-curl', 'Straight-Bar Biceps Curl', 'Arms', 'Barbell', 'Beginner', ['Biceps','Forearms'], 'Keep elbows near your body and curl without rocking.'),
  load('standing-db-curl', 'Standing Dumbbell Curl', 'Arms', 'Dumbbells', 'Beginner', ['Biceps','Forearms'], 'Curl smoothly while keeping your wrists comfortable and upper arms still.'),
  load('preacher-curl', 'Preacher Curl', 'Arms', 'Preacher Bench and EZ-Bar', 'Intermediate', ['Biceps','Forearms'], 'Use a light load and avoid forcing the elbow straight at the bottom.'),
  load('concentration-curl', 'Dumbbell Concentration Curl', 'Arms', 'Dumbbell and Bench', 'Beginner', ['Biceps','Forearms'], 'Support your upper arm against your inner thigh and curl slowly.'),
  load('cable-curl', 'Cable Biceps Curl', 'Arms', 'Cable Machine', 'Beginner', ['Biceps','Forearms'], 'Keep elbows near your sides and return the cable slowly.'),
  body('towel-curl', 'Self-Resisted Towel Curl', 'Arms', 'Towel', 'Beginner', ['Biceps','Forearms'], 'Stand securely on a towel and curl gently against its resistance; never anchor it to a door.'),
  body('biceps-hold', 'Isometric Biceps Squeeze', 'Arms', 'Bodyweight', 'Beginner', ['Biceps'], 'Bend the elbows, gently contract your biceps without holding your breath, then relax.', {seconds:true}),
  load('jug-curl', 'Water Jug Curl', 'Arms', 'Water Jug', 'Beginner', ['Biceps','Forearms'], 'Use a securely closed jug and lift smoothly; reduce the amount of water if needed.'),
  load('backpack-curl', 'Backpack Curl', 'Arms', 'Secure Backpack', 'Beginner', ['Biceps','Forearms'], 'Secure the contents and hold sturdy straps; curl without swinging.'),
  load('close-grip-bench', 'Close-Grip Bench Press', 'Arms', 'Barbell and Bench', 'Intermediate', ['Triceps','Chest','Shoulders'], 'Use a comfortable grip and a spotter or safeties; keep wrists stacked.'),
  load('ez-skull-crusher', 'EZ-Bar Skull Crusher', 'Arms', 'EZ-Bar and Bench', 'Intermediate', ['Triceps'], 'Use light weight and lower behind the forehead under control; use a spotter.'),
  load('db-overhead-triceps', 'Dumbbell Overhead Triceps Extension', 'Arms', 'Dumbbell', 'Intermediate', ['Triceps','Shoulders'], 'Use a manageable weight and lower behind the head without forcing the shoulders.'),
  body('bench-triceps-dip', 'Bench Triceps Dip', 'Arms', 'Secure Bench', 'Advanced', ['Triceps','Chest','Shoulders'], 'Use a stable bench and a shallow, comfortable range; keep shoulders away from the ears.', {caution:'Skip if this position bothers your shoulders; do not use a rolling chair.'}),
  load('band-triceps-kickback', 'Resistance Band Triceps Kickback', 'Arms', 'Resistance Band', 'Beginner', ['Triceps'], 'Secure the band under your foot and extend the elbow without swinging.'),
  load('bottle-overhead-triceps', 'Water Bottle Overhead Extension', 'Arms', 'Water Bottle', 'Beginner', ['Triceps','Shoulders'], 'Hold a closed bottle securely and move within a comfortable shoulder range.'),
  load('wrist-curl', 'Dumbbell Wrist Curl', 'Arms', 'Dumbbell', 'Beginner', ['Forearms'], 'Support your forearm and move your wrist slowly with a light weight.'),
  load('reverse-wrist-curl', 'Reverse Dumbbell Wrist Curl', 'Arms', 'Dumbbell', 'Beginner', ['Forearms'], 'Support the forearm palm-down and raise the hand gently with a light weight.'),
  load('reverse-curl', 'EZ-Bar Reverse Curl', 'Arms', 'EZ-Bar', 'Beginner', ['Forearms','Biceps'], 'Use a light overhand grip and curl without bending your wrists.'),
  load('wrist-roller', 'Wrist Roller', 'Arms', 'Wrist Roller', 'Intermediate', ['Forearms'], 'Use a very light load, roll with control and keep the area below clear.'),
  load('farmers-carry', 'Dumbbell Farmer Carry', 'Arms', 'Dumbbells', 'Intermediate', ['Forearms','Traps','Core'], 'Walk a clear path with tall posture and controlled breathing.', {seconds:true,aliases:['farmers walk']}),
  body('towel-squeeze', 'Towel Squeeze', 'Arms', 'Towel', 'Beginner', ['Forearms'], 'Squeeze a folded towel gently, then relax your grip.', {seconds:true,aliases:['tennis ball squeeze']}),
  body('towel-wring', 'Towel Wring', 'Arms', 'Towel', 'Beginner', ['Forearms'], 'Wring a towel slowly in both directions without forcing your wrists.'),
  load('grocery-carry', 'Grocery Bag Carry', 'Arms', 'Secure Grocery Bags', 'Beginner', ['Forearms','Traps','Core'], 'Use intact handles and a manageable load; walk a clear path and breathe.', {seconds:true,aliases:['static hold']}),
  body('fingertip-pushup', 'Fingertip Push-Up', 'Arms', 'Bodyweight', 'Advanced', ['Forearms','Chest','Triceps'], 'Only try with trained finger strength and a stable hand position; do not force the fingers.', {caution:'High finger and wrist load. A regular or kneeling push-up is a safer starting option.'}),
  body('wrist-pushup', 'Wrist Push-Up', 'Arms', 'Bodyweight', 'Advanced', ['Forearms','Chest'], 'Use a very small range and stop immediately with wrist pain.', {caution:'High wrist load. Practice gentler wrist mobility or a regular push-up first.'}),

  // Core, with seconds stored explicitly for new timed holds.
  load('ab-machine', 'Abdominal Crunch Machine', 'Core', 'Abdominal Machine', 'Beginner', ['Core'], 'Set the machine to fit and curl smoothly without pulling on your neck.'),
  load('decline-situp', 'Weighted Decline Sit-Up', 'Core', 'Decline Bench and Weight', 'Advanced', ['Core'], 'Secure your feet, use a light weight and avoid pulling your neck.', {caution:advancedCaution}),
  body('crunch', 'Abdominal Crunch', 'Core', 'Bodyweight', 'Beginner', ['Core'], 'Exhale and lift the shoulders a little; keep your neck relaxed.'),
  body('sit-up', 'Sit-Up', 'Core', 'Bodyweight', 'Intermediate', ['Core'], 'Move smoothly without pulling your head; use a smaller crunch if needed.'),
  body('forearm-plank', 'Forearm Plank', 'Core', 'Bodyweight', 'Beginner', ['Core','Shoulders'], 'Keep a comfortable straight line from shoulders to knees or feet; breathe throughout.', {seconds:true}),
  body('side-plank', 'Side Plank', 'Core', 'Bodyweight', 'Intermediate', ['Core','Hip stabilizers','Shoulders'], 'Support your body on one forearm; bend the lower knee for an easier option.', {seconds:true}),
  body('lying-leg-raise', 'Lying Leg Raise', 'Core', 'Bodyweight', 'Intermediate', ['Core'], 'Lower the legs only while your lower back remains comfortable.'),
  body('bicycle-crunch', 'Bicycle Crunch', 'Core', 'Bodyweight', 'Intermediate', ['Core'], 'Alternate slowly and rotate your torso without pulling your neck.'),
  body('flutter-kicks', 'Flutter Kicks', 'Core', 'Bodyweight', 'Intermediate', ['Core'], 'Use small alternating kicks and stop if your lower back feels strained.'),
  body('bodyweight-russian-twist', 'Bodyweight Russian Twist', 'Core', 'Bodyweight', 'Intermediate', ['Core'], 'Sit tall, keep feet down if helpful and rotate gently within a comfortable range.'),
  body('mountain-climber', 'Mountain Climber', 'Core', 'Bodyweight', 'Intermediate', ['Core','Shoulders','Full body'], 'From a plank, bring one knee forward at a time at a manageable pace.'),
  body('v-up', 'V-Up', 'Core', 'Bodyweight', 'Advanced', ['Core'], 'Lift arms and legs with control; bend your knees if needed.', {caution:advancedCaution}),
  body('hollow-hold', 'Hollow Body Hold', 'Core', 'Bodyweight', 'Intermediate', ['Core'], 'Keep the lower back comfortable; bend knees and raise arms less for an easier hold.', {seconds:true}),
  body('reverse-plank', 'Reverse Plank', 'Core', 'Bodyweight', 'Intermediate', ['Core','Glutes','Shoulders'], 'Press through hands and heels with shoulders comfortable; lower if wrists or shoulders hurt.', {seconds:true}),

  // Quads, hamstrings, glutes and lower legs.
  load('front-squat', 'Barbell Front Squat', 'Legs', 'Barbell and Safety Rack', 'Intermediate', ['Quadriceps','Glutes','Core'], 'Use a rack with safeties; keep elbows comfortably lifted and squat under control.'),
  load('hack-squat', 'Hack Squat Machine', 'Legs', 'Hack Squat Machine', 'Intermediate', ['Quadriceps','Glutes'], 'Set the stops and lower only as far as is comfortable.'),
  load('leg-extension', 'Leg Extension', 'Legs', 'Leg Extension Machine', 'Beginner', ['Quadriceps'], 'Adjust the seat and move through a comfortable range without kicking the weight.'),
  load('smith-squat', 'Smith Machine Squat', 'Legs', 'Smith Machine', 'Intermediate', ['Quadriceps','Glutes'], 'Set safety stops and a comfortable foot position before squatting.'),
  body('jump-squat', 'Jump Squat', 'Legs', 'Bodyweight', 'Intermediate', ['Quadriceps','Glutes','Full body'], 'Start with small jumps and land softly; choose a normal squat if jumping is uncomfortable.'),
  body('bulgarian-bodyweight', 'Bodyweight Bulgarian Split Squat', 'Legs', 'Sturdy Bench', 'Intermediate', ['Quadriceps','Glutes','Hip stabilizers'], 'Rest the back foot on a low stable bench and lower only as far as comfortable.'),
  body('sissy-squat', 'Supported Sissy Squat', 'Legs', 'Fixed Support', 'Advanced', ['Quadriceps'], 'Hold a fixed support and use a small controlled range; stop if your knees hurt.', {caution:advancedCaution}),
  body('wall-sit', 'Wall Sit', 'Legs', 'Wall', 'Beginner', ['Quadriceps','Glutes'], 'Lean against a solid wall and hold a comfortable partial squat; breathe normally.', {seconds:true}),
  load('lying-leg-curl', 'Lying Leg Curl', 'Legs', 'Leg Curl Machine', 'Beginner', ['Hamstrings'], 'Adjust the pads and curl smoothly without lifting your hips.'),
  load('barbell-good-morning', 'Barbell Good Morning', 'Legs', 'Barbell and Safety Rack', 'Advanced', ['Hamstrings','Glutes','Back'], 'Use a very light bar, soften knees and hinge without forcing depth.', {caution:advancedCaution}),
  body('glute-ham-raise', 'Glute-Ham Raise', 'Legs', 'Glute-Ham Developer', 'Advanced', ['Hamstrings','Glutes'], 'Adjust the support and move only as far as you can control.', {caution:advancedCaution}),
  body('assisted-nordic', 'Assisted Nordic Hamstring Curl', 'Legs', 'Nordic Bench or Secure Partner', 'Advanced', ['Hamstrings'], 'Use padded knees and assistance; lower a short distance and use hands to help return.', {caution:'Use suitable equipment or a trained partner; do not hook feet under unsecured furniture.'}),
  body('single-leg-hip-thrust', 'Single-Leg Hip Thrust', 'Legs', 'Sturdy Bench', 'Intermediate', ['Glutes','Hamstrings','Hip stabilizers'], 'Rest the upper back on a secure bench and lift hips without twisting.'),
  load('barbell-hip-thrust', 'Barbell Hip Thrust', 'Legs', 'Barbell and Stable Bench', 'Intermediate', ['Glutes','Hamstrings'], 'Secure the bench, pad the bar and lift hips without over-arching.'),
  load('cable-glute-kickback', 'Cable Glute Kickback', 'Legs', 'Cable Machine', 'Beginner', ['Glutes','Hip stabilizers'], 'Keep your torso still and move one leg back without arching your lower back.'),
  load('smith-glute-bridge', 'Smith Machine Glute Bridge', 'Legs', 'Smith Machine', 'Intermediate', ['Glutes','Hamstrings'], 'Set safeties, pad the bar and lift only to a comfortable hip extension.'),
  load('sumo-deadlift', 'Sumo Deadlift', 'Full Body', 'Barbell', 'Advanced', ['Glutes','Hamstrings','Quadriceps','Back'], 'Choose a comfortable stance, brace and push through the floor with the bar close.', {caution:advancedCaution}),
  body('fire-hydrant', 'Fire Hydrant', 'Legs', 'Bodyweight', 'Beginner', ['Glutes','Hip stabilizers'], 'On hands and knees, lift one bent knee sideways without rotating your torso.'),
  body('frog-pump', 'Frog Pump', 'Legs', 'Bodyweight', 'Beginner', ['Glutes'], 'Bring the soles of the feet together and lift the hips gently without over-arching.'),
  load('standing-calf-db', 'Standing Dumbbell Calf Raise', 'Legs', 'Dumbbells', 'Beginner', ['Calves','Forearms'], 'Hold manageable dumbbells, rise onto the toes and lower slowly; use support if needed.'),
  load('standing-calf-barbell', 'Standing Barbell Calf Raise', 'Legs', 'Barbell and Safety Rack', 'Intermediate', ['Calves'], 'Use rack safeties and raise and lower the heels under control.'),
  load('seated-calf-machine', 'Seated Calf Raise Machine', 'Legs', 'Seated Calf Machine', 'Beginner', ['Calves'], 'Adjust the pad and raise and lower the heels slowly.'),
  load('seated-calf-db', 'Seated Dumbbell Calf Raise', 'Legs', 'Dumbbell and Bench', 'Beginner', ['Calves'], 'Sit securely, support the weight above your knee and lift the heel under control.'),
  load('leg-press-calf', 'Leg Press Calf Raise', 'Legs', 'Leg Press Machine', 'Intermediate', ['Calves'], 'Use the safety stops and move the ankles smoothly; avoid locking the knees.'),
  body('single-leg-calf', 'Single-Leg Calf Raise', 'Legs', 'Bodyweight', 'Intermediate', ['Calves'], 'Rise slowly on one foot; use a stable support for balance if needed.'),
  body('step-calf', 'Step Calf Raise', 'Legs', 'Sturdy Step', 'Intermediate', ['Calves'], 'Use a stable step and a handrail; lower the heel only as far as comfortable.'),
  body('toe-hold', 'Isometric Calf Raise Hold', 'Legs', 'Bodyweight', 'Beginner', ['Calves'], 'Rise onto the balls of the feet and hold comfortably; use support for balance if needed.', {seconds:true,aliases:['toe hold']}),
  load('tibialis-machine', 'Tibialis Raise Machine', 'Legs', 'Tibialis Machine', 'Beginner', ['Shins'], 'Set the machine to fit and lift the toes toward the shins slowly.'),
  load('band-dorsiflexion', 'Resistance Band Dorsiflexion', 'Legs', 'Resistance Band with Secure Anchor', 'Beginner', ['Shins'], 'Secure the band with a purpose-made anchor and pull the toes gently toward you.'),
  body('toe-raise', 'Standing Toe Raise', 'Legs', 'Bodyweight', 'Beginner', ['Shins'], 'Keep heels on the floor and lift the forefeet; use support for balance if needed.', {aliases:['tibialis raise']}),
  body('wall-toe-raise', 'Wall-Lean Toe Raise', 'Legs', 'Wall', 'Beginner', ['Shins'], 'Lean lightly against a solid wall and lift the toes while heels stay down.'),
  body('reverse-walk', 'Slow Backward Walking', 'Cardio', 'Bodyweight', 'Beginner', ['Cardio','Shins','Quadriceps'], 'Walk slowly on a clear, level path with room behind you; use support if needed.'),
  body('reverse-treadmill', 'Backward Treadmill Walk', 'Cardio', 'Treadmill', 'Advanced', ['Cardio','Shins','Quadriceps'], 'Use a very slow speed, hold the rails and stop before stepping off.', {caution:'Use supervision and the treadmill safety clip. Choose walking on a clear floor if unsure.'}),

  // Rotator cuff and hip stabilizers.
  load('cable-external-rotation', 'Cable External Rotation', 'Shoulders', 'Cable Machine', 'Beginner', ['Rotator cuff','Shoulders'], 'Keep the elbow close to the side and rotate outward with light resistance.'),
  load('cable-internal-rotation', 'Cable Internal Rotation', 'Shoulders', 'Cable Machine', 'Beginner', ['Rotator cuff','Shoulders'], 'Keep the elbow close to the side and rotate inward with light resistance.'),
  load('band-internal-rotation', 'Band Internal Rotation', 'Shoulders', 'Resistance Band with Secure Anchor', 'Beginner', ['Rotator cuff','Shoulders'], 'Use a secure anchor and gentle resistance; keep the elbow near your side.'),
  load('lying-l-fly', 'Side-Lying Dumbbell L-Fly', 'Shoulders', 'Dumbbell', 'Beginner', ['Rotator cuff','Shoulders'], 'Lie on your side with the elbow close to the body; rotate a very light weight upward.'),
  load('pallof-press', 'Cable Pallof Press', 'Core', 'Cable Machine', 'Beginner', ['Core','Stabilizers'], 'Stand side-on to the cable and press forward without rotating the torso.'),
  load('hip-abduction-machine', 'Seated Hip Abduction', 'Legs', 'Hip Abduction Machine', 'Beginner', ['Glutes','Hip stabilizers'], 'Adjust the machine and move the knees apart in a comfortable range.'),
  load('hip-adduction-machine', 'Seated Hip Adduction', 'Legs', 'Hip Adduction Machine', 'Beginner', ['Hip stabilizers'], 'Adjust the machine and bring the knees together smoothly without forcing the range.'),
  body('clamshell', 'Side-Lying Clamshell', 'Legs', 'Bodyweight', 'Beginner', ['Glutes','Hip stabilizers'], 'Lie on your side with knees bent and lift the top knee without rolling the hips.'),
  body('standing-abduction', 'Standing Leg Abduction', 'Legs', 'Bodyweight', 'Beginner', ['Glutes','Hip stabilizers'], 'Stand tall and move one leg gently to the side; hold a support if needed.'),

  // Outdoor and stationary cardio are minutes, not repetitions.
  body('jogging', 'Running / Jogging', 'Cardio', 'Bodyweight', 'Beginner', ['Cardio','Quadriceps','Calves'], 'Choose a safe route or jog in place at a comfortable pace; alternate with walking as needed.', {aliases:['run','jog']}),
  body('outdoor-cycling', 'Outdoor Cycling', 'Cardio', 'Bicycle and Helmet', 'Beginner', ['Cardio','Quadriceps','Glutes'], 'Wear a helmet, follow local traffic rules and choose a comfortable pace.', {aliases:['bike riding']}),
  body('stationary-cycling', 'Stationary Cycling', 'Cardio', 'Stationary Bike', 'Beginner', ['Cardio','Quadriceps','Glutes'], 'Adjust the seat and pedal at a comfortable resistance and pace.', {aliases:['exercise bike','cycling']}),
];
