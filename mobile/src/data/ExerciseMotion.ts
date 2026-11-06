import type { ExerciseItem } from './types';

/**
 * Original, deliberately curated 2D teaching illustrations. A demo is mapped
 * only to the specific movement it represents; unknown IDs never receive an
 * approximate substitute. This is an educational preview, not expert review.
 */
export type Point = readonly [number,number];
export type Pose = {
  head:Point; shoulder:Point; hip:Point;
  elbow:Point; hand:Point; elbowBack:Point; handBack:Point;
  knee:Point; ankle:Point; toe:Point; kneeBack:Point; ankleBack:Point; toeBack:Point;
};
export type Prop = 'none'|'wall'|'bench'|'dumbbell'|'band'|'barbell'|'backbar'|'goblet'|'chair'|'pressbench';
export type MotionDemo = {
  exerciseId:string; frames:readonly Pose[]; prop:Prop; start:string; action:string;
  hold?:boolean; cyclic?:boolean; face?:'left'|'right'; avatar:'A'|'B';
};
const p=(v:Pose)=>v;
const mod=(base:Pose, v:Partial<Pose>):Pose=>({...base,...v});
const stand=p({head:[151,35],shoulder:[151,54],hip:[151,106],elbow:[153,79],hand:[156,105],elbowBack:[146,80],handBack:[148,106],knee:[153,145],ankle:[153,181],toe:[169,183],kneeBack:[145,145],ankleBack:[145,181],toeBack:[159,183]});
const squatStart=mod(stand,{elbow:[175,64],hand:[197,69],elbowBack:[170,70],handBack:[192,75]});
const squatDown=mod(squatStart,{head:[159,66],shoulder:[154,85],hip:[137,133],elbow:[177,92],hand:[199,97],elbowBack:[173,98],handBack:[193,103],knee:[167,148],ankle:[153,181],toe:[169,183],kneeBack:[159,148],ankleBack:[145,181],toeBack:[159,183]});
const chestArms=(base:Pose):Pose=>mod(base,{elbow:[base.shoulder[0]+17,base.shoulder[1]+22],hand:[base.shoulder[0]+16,base.shoulder[1]+8],elbowBack:[base.shoulder[0]+10,base.shoulder[1]+24],handBack:[base.shoulder[0]+11,base.shoulder[1]+10]});
const backArms=(base:Pose):Pose=>mod(base,{elbow:[base.shoulder[0]+16,base.shoulder[1]+19],hand:[base.shoulder[0]+1,base.shoulder[1]-4],elbowBack:[base.shoulder[0]+8,base.shoulder[1]+20],handBack:[base.shoulder[0]-5,base.shoulder[1]-3]});
const hingeDown=mod(stand,{head:[193,69],shoulder:[179,82],hip:[139,111],elbow:[180,109],hand:[180,136],elbowBack:[174,110],handBack:[174,138],knee:[152,146],kneeBack:[144,146]});
const hingeStart=chestArms(stand), hingeEnd=chestArms(hingeDown);
const rdlStart=mod(stand,{elbow:[157,79],hand:[160,107],elbowBack:[151,79],handBack:[154,107]});
const rdlEnd=mod(hingeDown,{elbow:[171,111],hand:[163,141],elbowBack:[165,113],handBack:[157,143]});
const pushStart=p({head:[82,97],shoulder:[101,110],hip:[169,140],elbow:[101,145],hand:[101,180],elbowBack:[106,145],handBack:[106,180],knee:[204,155],ankle:[238,170],toe:[247,181],kneeBack:[208,155],ankleBack:[242,170],toeBack:[251,181]});
const pushDown=mod(pushStart,{head:[72,126],shoulder:[91,137],hip:[164,154],elbow:[71,163],elbowBack:[77,164],knee:[201,162],kneeBack:[205,162]});
const kneePushStart=mod(pushStart,{head:[84,97],shoulder:[103,110],hip:[152,142],elbow:[103,145],hand:[103,180],elbowBack:[109,145],handBack:[109,180],knee:[201,175],kneeBack:[205,175],ankle:[224,160],ankleBack:[228,160],toe:[232,163],toeBack:[236,163]});
const kneePushDown=mod(kneePushStart,{head:[73,121],shoulder:[93,132],hip:[147,153],elbow:[73,158],elbowBack:[79,159]});
const wallStart=p({head:[177,60],shoulder:[170,80],hip:[138,128],elbow:[204,84],hand:[245,90],elbowBack:[198,89],handBack:[245,96],knee:[120,154],ankle:[105,180],toe:[121,183],kneeBack:[113,154],ankleBack:[98,180],toeBack:[114,183]});
const wallEnd=mod(wallStart,{head:[223,66],shoulder:[215,86],hip:[160,132],elbow:[200,108],elbowBack:[194,114],knee:[130,156],kneeBack:[123,156]});
const inclineStart=p({head:[200,58],shoulder:[191,78],hip:[147,129],elbow:[214,99],hand:[240,128],elbowBack:[208,104],handBack:[234,128],knee:[122,155],ankle:[101,179],toe:[116,182],kneeBack:[115,155],ankleBack:[94,179],toeBack:[109,182]});
const inclineEnd=mod(inclineStart,{head:[226,82],shoulder:[215,102],hip:[159,141],elbow:[202,117],elbowBack:[196,122],knee:[129,160],kneeBack:[122,160]});
const bridgeStart=p({head:[76,166],shoulder:[96,162],hip:[148,173],elbow:[111,177],hand:[132,181],elbowBack:[106,177],handBack:[125,181],knee:[185,137],ankle:[205,181],toe:[220,183],kneeBack:[177,137],ankleBack:[198,181],toeBack:[212,183]});
const bridgeEnd=mod(bridgeStart,{hip:[151,143],knee:[182,133],kneeBack:[174,133]});
const calfEnd=mod(stand,{head:[158,21],shoulder:[158,40],hip:[158,92],elbow:[160,65],hand:[163,91],elbowBack:[153,66],handBack:[155,92],knee:[159,131],ankle:[159,166],kneeBack:[151,131],ankleBack:[151,166],toe:[169,183],toeBack:[159,183]});
const toeEnd=mod(stand,{toe:[170,169],toeBack:[160,169]});
const curlTop=mod(stand,{elbow:[153,82],hand:[173,64],elbowBack:[146,83],handBack:[165,67]});
const frontTop=mod(stand,{elbow:[178,55],hand:[207,55],elbowBack:[173,62],handBack:[202,62]});
const lateralStart=p({head:[160,35],shoulder:[151,57],hip:[160,106],elbow:[142,83],hand:[138,108],elbowBack:[178,83],handBack:[182,108],knee:[149,145],ankle:[148,181],toe:[136,183],kneeBack:[171,145],ankleBack:[172,181],toeBack:[184,183]});
const lateralEnd=mod(lateralStart,{elbow:[124,62],hand:[99,68],elbowBack:[196,62],handBack:[221,68]});
const quad=p({head:[73,106],shoulder:[93,120],hip:[160,128],elbow:[97,150],hand:[97,181],elbowBack:[104,150],handBack:[104,181],knee:[168,168],ankle:[193,177],toe:[205,181],kneeBack:[163,168],ankleBack:[188,177],toeBack:[200,181]});
const birdEnd=mod(quad,{elbow:[62,121],hand:[32,121],kneeBack:[194,130],ankleBack:[227,132],toeBack:[238,136]});
const kickEnd=mod(quad,{knee:[199,130],ankle:[200,104],toe:[211,103]});
const deadStart=p({head:[75,164],shoulder:[98,164],hip:[151,165],elbow:[98,137],hand:[99,108],elbowBack:[104,139],handBack:[105,110],knee:[166,128],ankle:[198,128],toe:[207,123],kneeBack:[159,128],ankleBack:[191,128],toeBack:[200,123]});
const deadEnd=mod(deadStart,{elbow:[70,162],hand:[42,162],kneeBack:[187,164],ankleBack:[220,163],toeBack:[230,161]});
const sideStart=p({head:[75,161],shoulder:[98,164],hip:[151,168],elbow:[91,179],hand:[72,179],elbowBack:[115,174],handBack:[137,178],knee:[192,171],ankle:[232,176],toe:[245,178],kneeBack:[192,176],ankleBack:[231,180],toeBack:[244,182]});
const sideEnd=mod(sideStart,{knee:[187,148],ankle:[220,129],toe:[231,124]});
const plank=p({head:[85,119],shoulder:[106,130],hip:[170,150],elbow:[105,179],hand:[136,179],elbowBack:[111,179],handBack:[141,179],knee:[207,163],ankle:[239,174],toe:[248,182],kneeBack:[212,163],ankleBack:[244,174],toeBack:[253,182]});
const marchL=mod(stand,{elbow:[140,90],hand:[132,105],elbowBack:[172,72],handBack:[179,55],knee:[187,117],ankle:[185,153],toe:[198,155]});
const marchR=mod(stand,{elbow:[175,72],hand:[181,55],elbowBack:[137,89],handBack:[128,103],kneeBack:[187,117],ankleBack:[185,153],toeBack:[198,155]});
const splitStart=p({head:[151,41],shoulder:[151,61],hip:[151,111],elbow:[158,82],hand:[164,105],elbowBack:[137,82],handBack:[135,105],knee:[181,145],ankle:[201,181],toe:[216,183],kneeBack:[119,145],ankleBack:[92,177],toeBack:[102,183]});
const splitEnd=mod(splitStart,{head:[152,62],shoulder:[152,82],hip:[151,132],elbow:[165,105],hand:[171,128],elbowBack:[144,105],handBack:[142,128],knee:[193,138],kneeBack:[117,174]});
const crunchStart=p({head:[74,168],shoulder:[96,165],hip:[153,171],elbow:[111,176],hand:[128,178],elbowBack:[107,178],handBack:[122,181],knee:[186,137],ankle:[205,181],toe:[219,183],kneeBack:[179,137],ankleBack:[198,181],toeBack:[212,183]});
const crunchEnd=mod(crunchStart,{head:[91,137],shoulder:[111,148],elbow:[126,160],hand:[144,165],elbowBack:[120,165],handBack:[138,169]});
const rowStart=mod(rdlEnd,{elbow:[181,112],hand:[181,142],elbowBack:[175,114],handBack:[175,144]});
const rowEnd=mod(rowStart,{elbow:[151,100],hand:[151,125],elbowBack:[145,103],handBack:[145,128]});
const seatedStart=p({head:[157,30],shoulder:[148,49],hip:[158,105],elbow:[135,67],hand:[127,49],elbowBack:[179,67],handBack:[187,49],knee:[193,111],ankle:[191,181],toe:[205,183],kneeBack:[186,116],ankleBack:[184,181],toeBack:[198,183]});
const seatedEnd=mod(seatedStart,{elbow:[141,30],hand:[141,9],elbowBack:[173,30],handBack:[173,9]});
const benchStart=p({head:[72,127],shoulder:[97,130],hip:[163,133],elbow:[102,103],hand:[106,72],elbowBack:[108,106],handBack:[112,74],knee:[202,150],ankle:[207,181],toe:[221,183],kneeBack:[195,152],ankleBack:[200,181],toeBack:[214,183]});
const benchEnd=mod(benchStart,{elbow:[80,145],hand:[107,121],elbowBack:[86,148],handBack:[113,123]});

type Input=Omit<MotionDemo,'avatar'>;
const definitions:Input[] = [
  {exerciseId:'ex-home-air-squat',frames:[squatStart,squatDown],prop:'none',start:'Stand with feet comfortably apart.',action:'Bend hips and knees together; keep heels down and return to standing.'},
  {exerciseId:'ex-goblet-squat',frames:[chestArms(squatStart),chestArms(squatDown)],prop:'goblet',start:'Hold a light dumbbell close to your chest.',action:'Sit down between the hips with heels grounded; stand up with control.'},
  {exerciseId:'ex-barbell-squat',frames:[backArms(squatStart),backArms(squatDown)],prop:'backbar',start:'Set the bar securely across the upper back, not the neck.',action:'Bend hips and knees together, then press through your feet to stand.'},
  {exerciseId:'ex-home-good-morning',frames:[hingeStart,hingeEnd],prop:'none',start:'Stand tall with soft knees.',action:'Push hips back, keeping the spine long; return to standing.'},
  {exerciseId:'ex-romanian-deadlift',frames:[rdlStart,rdlEnd],prop:'barbell',start:'Hold a light bar in front of your thighs.',action:'Push hips back with soft knees; keep the bar close and stand tall.'},
  {exerciseId:'ex-pushups',frames:[pushStart,pushDown],prop:'none',face:'left',start:'Hands under or just outside shoulders; body in a straight line.',action:'Lower chest with control and press the floor away without sagging.'},
  {exerciseId:'ex-home-kneeling-pushup',frames:[kneePushStart,kneePushDown],prop:'none',face:'left',start:'Place hands on the floor and knees down.',action:'Keep a straight line from shoulders to knees as you lower and press up.'},
  {exerciseId:'ex-wall-pushup',frames:[wallStart,wallEnd],prop:'wall',start:'Place hands on a solid wall and step back.',action:'Keep body aligned as elbows bend, then press away from the wall.'},
  {exerciseId:'ex-incline-pushup',frames:[inclineStart,inclineEnd],prop:'bench',start:'Place hands on a stable, non-slip raised surface.',action:'Lower chest toward the support while keeping a straight body line.'},
  {exerciseId:'ex-glute-bridge',frames:[bridgeStart,bridgeEnd],prop:'none',face:'left',start:'Lie on your back with knees bent and feet grounded.',action:'Lift hips gently, keeping ribs down; lower with control.'},
  {exerciseId:'ex-home-calf-raise',frames:[stand,calfEnd],prop:'none',start:'Stand tall; use a stable support if needed.',action:'Rise onto the balls of your feet, pause, and lower heels slowly.'},
  {exerciseId:'ex-more-standing-calf-db',frames:[stand,calfEnd],prop:'dumbbell',start:'Hold light dumbbells at your sides.',action:'Rise onto the balls of your feet; lower slowly without bouncing.'},
  {exerciseId:'ex-more-toe-hold',frames:[calfEnd],prop:'none',hold:true,start:'Rise gently onto the balls of your feet; use support if needed.',action:'Hold while breathing normally, then lower your heels with control.'},
  {exerciseId:'ex-more-toe-raise',frames:[stand,toeEnd],prop:'none',start:'Stand tall with heels on the floor.',action:'Lift the toes toward your shins, then lower gently.'},
  {exerciseId:'ex-more-standing-db-curl',frames:[stand,curlTop],prop:'dumbbell',start:'Hold dumbbells at your sides with elbows close to the body.',action:'Bend elbows without swinging; lower slowly.'},
  {exerciseId:'ex-band-biceps-curl',frames:[stand,curlTop],prop:'band',start:'Stand securely on the band and hold both ends.',action:'Keep elbows near your sides as you curl and lower slowly.'},
  {exerciseId:'ex-more-db-front-raise',frames:[stand,frontTop],prop:'dumbbell',start:'Hold a light dumbbell in front of your thigh.',action:'Lift forward to a comfortable height without leaning back.'},
  {exerciseId:'ex-lateral-raise',frames:[lateralStart,lateralEnd],prop:'dumbbell',start:'Stand tall with light dumbbells at your sides.',action:'Raise arms out to a comfortable height and lower without swinging.'},
  {exerciseId:'ex-bird-dog',frames:[quad,birdEnd],prop:'none',face:'left',start:'Start on hands and knees with a comfortable, level back.',action:'Reach one arm forward and the opposite leg back; keep hips level.'},
  {exerciseId:'ex-home-donkey-kick',frames:[quad,kickEnd],prop:'none',face:'left',start:'Start on hands and knees.',action:'Lift one bent leg behind you without arching the lower back.'},
  {exerciseId:'ex-dead-bug',frames:[deadStart,deadEnd],prop:'none',face:'left',start:'Lie on your back with knees and arms raised.',action:'Reach opposite arm and leg away while keeping the trunk steady.'},
  {exerciseId:'ex-home-side-lying-leg-raise',frames:[sideStart,sideEnd],prop:'none',face:'left',start:'Lie on your side with hips stacked.',action:'Lift the top leg without rolling the hips; lower slowly.'},
  {exerciseId:'ex-more-forearm-plank',frames:[plank],prop:'none',face:'left',hold:true,start:'Elbows below shoulders; body in a straight line.',action:'Hold while breathing normally; stop before the hips sag.'},
  {exerciseId:'ex-home-march-in-place',frames:[stand,marchL,stand,marchR,stand],prop:'none',cyclic:true,start:'Stand tall; hold a stable support if needed.',action:'Alternate lifting the knees and swinging the opposite arm.'},
  {exerciseId:'ex-home-standing-knee-lifts',frames:[stand,marchL,stand,marchR,stand],prop:'none',cyclic:true,start:'Stand tall with room to balance.',action:'Lift one knee at a time and lower with control.'},
  {exerciseId:'ex-home-split-squat',frames:[splitStart,splitEnd],prop:'none',start:'Take a stable split stance, back heel raised.',action:'Bend both knees and lower comfortably; front foot stays grounded.'},
  {exerciseId:'ex-more-crunch',frames:[crunchStart,crunchEnd],prop:'none',face:'left',start:'Lie on your back with knees bent.',action:'Gently curl the shoulders up; lower without pulling on the neck.'},
  {exerciseId:'ex-barbell-row',frames:[rowStart,rowEnd],prop:'barbell',start:'Hinge at the hips with knees soft and a light bar.',action:'Draw elbows back toward the hips; lower without jerking the torso.'},
  {exerciseId:'ex-db-shoulder-press',frames:[seatedStart,seatedEnd],prop:'chair',start:'Sit upright holding light dumbbells by the shoulders.',action:'Press upward within a comfortable range, then lower with control.'},
  {exerciseId:'ex-bench-press',frames:[benchStart,benchEnd],prop:'pressbench',face:'left',start:'Lie securely on a bench with feet grounded; use a spotter or safeties.',action:'Lower the bar under control toward the chest, then press upward.'},
];

export const MOTION_DEMOS: readonly MotionDemo[] = definitions.map((d,index)=>({...d,avatar:index%2===0?'A':'B'}));
const byId = new Map(MOTION_DEMOS.map(d=>[d.exerciseId,d]));
export const exerciseMotionFor = (exercise:Pick<ExerciseItem,'id'>): MotionDemo | undefined => byId.get(exercise.id);

const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function backShoulder(demo:MotionDemo, shoulder:Point):Point {
  return demo.exerciseId==='ex-lateral-raise' || demo.exerciseId==='ex-db-shoulder-press' ? [shoulder[0]+18,shoulder[1]] : [shoulder[0]+4,shoulder[1]+2];
}
/** Solve a two-segment limb toward the authored elbow/knee, retaining lengths. */
function joint(a:Point, _suggested:Point, end:Point, upper:number, lower:number, side:number):Point {
  const dx=end[0]-a[0],dy=end[1]-a[1],d=Math.hypot(dx,dy);
  if (d<0.001) return _suggested;
  const reach=Math.max(Math.abs(upper-lower)+0.001,Math.min(upper+lower-0.001,d));
  const x=(upper*upper-lower*lower+reach*reach)/(2*reach);
  const h=Math.sqrt(Math.max(0,upper*upper-x*x));
  const ux=dx/d,uy=dy/d,mid:Point=[a[0]+ux*x,a[1]+uy*x];
  const one:Point=[mid[0]-uy*h,mid[1]+ux*h],two:Point=[mid[0]+uy*h,mid[1]-ux*h];
  return side>=0 ? one : two;
}
/** Interpolate hand/foot paths, then preserve the illustrated limb lengths. */
export function motionPoseAt(demo:MotionDemo, progress:number):Pose {
  if (demo.frames.length===1) return demo.frames[0];
  const value=Math.max(0,Math.min(1,progress))*(demo.frames.length-1);
  const i=Math.min(demo.frames.length-2,Math.floor(value)), t=value-i;
  const a=demo.frames[i],b=demo.frames[i+1],result={} as Record<keyof Pose,Point>;
  (Object.keys(a) as (keyof Pose)[]).forEach(key=>{result[key]=[a[key][0]+(b[key][0]-a[key][0])*t,a[key][1]+(b[key][1]-a[key][1])*t];});
  const first=demo.frames[0];
  // Keep a consistent elbow/knee bend side throughout each illustration to
  // prevent sudden joint flips when a limb passes through a straight pose.
  const side=(anchor:(p:Pose)=>Point, middle:keyof Pose, end:keyof Pose):number=>{
    let strongest=0;
    demo.frames.forEach(frame=>{const a=anchor(frame),m=frame[middle],e=frame[end];
      const cross=(e[0]-a[0])*(m[1]-a[1])-(e[1]-a[1])*(m[0]-a[0]);
      if (Math.abs(cross)>Math.abs(strongest)) strongest=cross;
    });
    return strongest>=0?1:-1;
  };
  result.elbow=joint(result.shoulder,result.elbow,result.hand,distance(first.shoulder,first.elbow),distance(first.elbow,first.hand),side(p=>p.shoulder,'elbow','hand'));
  const s0=backShoulder(demo,first.shoulder),s=backShoulder(demo,result.shoulder);
  result.elbowBack=joint(s,result.elbowBack,result.handBack,distance(s0,first.elbowBack),distance(first.elbowBack,first.handBack),side(p=>backShoulder(demo,p.shoulder),'elbowBack','handBack'));
  result.knee=joint(result.hip,result.knee,result.ankle,distance(first.hip,first.knee),distance(first.knee,first.ankle),side(p=>p.hip,'knee','ankle'));
  result.kneeBack=joint(result.hip,result.kneeBack,result.ankleBack,distance(first.hip,first.kneeBack),distance(first.kneeBack,first.ankleBack),side(p=>p.hip,'kneeBack','ankleBack'));
  // These movements show a straight working leg; avoid an artificial knee bend.
  if (demo.exerciseId==='ex-pushups' || demo.exerciseId==='ex-home-side-lying-leg-raise') {
    result.knee=[(result.hip[0]+result.ankle[0])/2,(result.hip[1]+result.ankle[1])/2];
    if (demo.exerciseId==='ex-pushups') result.kneeBack=[(result.hip[0]+result.ankleBack[0])/2,(result.hip[1]+result.ankleBack[1])/2];
  }
  return result;
}
