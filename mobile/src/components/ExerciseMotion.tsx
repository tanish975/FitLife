import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'animejs/animation';
import { Pause, Play } from 'lucide-react';
import { exerciseMotionFor, motionPoseAt, type MotionDemo, type Point, type Pose } from '../data/ExerciseMotion';
import type { ExerciseItem } from '../data/types';
import { useReducedMotion } from '../hooks/useReducedMotion';

type LineProps={a:Point;b:Point;color:string;width:number};
const Limb=({a,b,color,width}:LineProps)=><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round"/>;
const halfway=(a:Point,b:Point,n:number):Point=>[a[0]+(b[0]-a[0])*n,a[1]+(b[1]-a[1])*n];
const Weight=({at}: {at:Point})=><g transform={`translate(${at[0]} ${at[1]})`} aria-hidden="true"><line x1="-8" y1="0" x2="8" y2="0" stroke="#233a3c" strokeWidth="3"/><rect x="-10" y="-6" width="4" height="12" rx="1" fill="#233a3c"/><rect x="6" y="-6" width="4" height="12" rx="1" fill="#233a3c"/></g>;
const Barbell=({at}:{at:Point})=><g transform={`translate(${at[0]} ${at[1]})`}><line x1="-22" y1="0" x2="22" y2="0" stroke="#344c4b" strokeWidth="3"/><rect x="-19" y="-8" width="5" height="16" rx="1" fill="#344c4b"/><rect x="14" y="-8" width="5" height="16" rx="1" fill="#344c4b"/></g>;
function Figure({pose:q,demo}:{pose:Pose;demo:MotionDemo}) {
  const frontFacing=demo.exerciseId==='ex-lateral-raise'||demo.exerciseId==='ex-db-shoulder-press';
  const shoulderBack:Point=frontFacing?[q.shoulder[0]+18,q.shoulder[1]]:[q.shoulder[0]+4,q.shoulder[1]+2];
  const centerShoulder:Point=frontFacing?halfway(q.shoulder,shoulderBack,.5):q.shoulder;
  const skin=demo.avatar==='A'?'#d3a17e':'#a96f50';
  const hair='#282e2a', shirt=demo.avatar==='A'?'#557d63':'#3e6b72', pants='#263d43', farPants='#72817d';
  const backSleeve=halfway(shoulderBack,q.elbowBack,.34),sleeve=halfway(q.shoulder,q.elbow,.34);
  const neck=halfway(q.head,centerShoulder,.72);
  const dumbbell=demo.prop==='dumbbell'||demo.prop==='chair';
  return <svg viewBox="0 0 320 200" role="presentation" aria-hidden="true" className="movement-svg" data-exercise-figure={demo.exerciseId}>
    <rect width="320" height="200" rx="16" fill="#e5e9df"/>
    <line x1="20" y1="184.5" x2="300" y2="184.5" stroke="#b5c3b4" strokeWidth="2"/>
    {demo.prop==='wall' && <rect x="249" y="22" width="9" height="163" rx="3" fill="#8ca296"/>}
    {demo.prop==='bench' && <g fill="#899e91"><rect x="234" y="129" width="66" height="8" rx="3"/><rect x="246" y="137" width="7" height="48"/><rect x="287" y="137" width="7" height="48"/></g>}
    {demo.prop==='chair' && <g fill="#899e91"><rect x="139" y="113" width="64" height="7" rx="3"/><rect x="144" y="119" width="6" height="65"/><rect x="195" y="119" width="6" height="65"/><rect x="135" y="67" width="6" height="46"/></g>}
    {demo.prop==='pressbench' && <g fill="#899e91"><rect x="63" y="142" width="119" height="7" rx="3"/><rect x="82" y="149" width="6" height="35"/><rect x="166" y="149" width="6" height="35"/></g>}
    {demo.prop==='band' && <g stroke="#a36f3c" strokeWidth="3" fill="none" strokeLinecap="round"><path d={`M ${q.toeBack.join(' ')} L ${q.handBack.join(' ')}`}/><path d={`M ${q.toe.join(' ')} L ${q.hand.join(' ')}`}/></g>}
    <Limb a={q.hip} b={q.kneeBack} color={farPants} width={13}/><Limb a={q.kneeBack} b={q.ankleBack} color={farPants} width={11}/><Limb a={q.ankleBack} b={q.toeBack} color="#627773" width={7}/>
    <Limb a={shoulderBack} b={q.elbowBack} color={skin} width={8}/><Limb a={q.elbowBack} b={q.handBack} color={skin} width={7}/><Limb a={shoulderBack} b={backSleeve} color={shirt} width={11}/>
    <Limb a={centerShoulder} b={q.hip} color={shirt} width={23}/>
    <Limb a={q.hip} b={q.knee} color={pants} width={13}/><Limb a={q.knee} b={q.ankle} color={pants} width={11}/><Limb a={q.ankle} b={q.toe} color="#1f3033" width={7}/>
    <Limb a={q.shoulder} b={q.elbow} color={skin} width={8}/><Limb a={q.elbow} b={q.hand} color={skin} width={7}/><Limb a={q.shoulder} b={sleeve} color={shirt} width={11}/>
    <Limb a={centerShoulder} b={neck} color={skin} width={8}/>
    <circle cx={q.head[0]} cy={q.head[1]} r="10" fill={skin}/>
    <path d={`M ${q.head[0]-9} ${q.head[1]-3} Q ${q.head[0]-10} ${q.head[1]-12} ${q.head[0]} ${q.head[1]-11} Q ${q.head[0]+9} ${q.head[1]-10} ${q.head[0]+10} ${q.head[1]-3} Q ${q.head[0]} ${q.head[1]-6} ${q.head[0]-9} ${q.head[1]-3} Z`} fill={hair}/>
    {demo.avatar==='B' && <circle cx={q.head[0]-(demo.face==='left'?-8:8)} cy={q.head[1]-8} r="4.5" fill={hair}/>}
    <circle cx={q.head[0]+(demo.face==='left'?-4:4)} cy={q.head[1]+1} r="1" fill="#292d2b"/>
    {dumbbell && <><Weight at={q.handBack}/><Weight at={q.hand}/></>}
    {demo.prop==='goblet' && <g transform={`translate(${q.hand[0]} ${q.hand[1]})`}><rect x="-7" y="-9" width="14" height="18" rx="4" fill="#314d4e"/><line x1="-8" y1="0" x2="8" y2="0" stroke="#b9c6b7" strokeWidth="2"/></g>}
    {(demo.prop==='barbell'||demo.prop==='pressbench') && <Barbell at={q.hand}/>}
    {demo.prop==='backbar' && <Barbell at={[q.shoulder[0]-4,q.shoulder[1]-5]}/>}
  </svg>;
}

function MotionPlayer({demo,exercise}:{demo:MotionDemo;exercise:ExerciseItem}) {
  const reduced=useReducedMotion();
  const [playing,setPlaying]=useState(!reduced && !demo.hold);
  const [visible,setVisible]=useState(false);
  const [pageVisible,setPageVisible]=useState(!document.hidden);
  const [progress,setProgress]=useState(0);
  const root=useRef<HTMLDivElement>(null);
  const animation=useRef<ReturnType<typeof animate>|null>(null);
  const cursor=useRef({value:0});
  const pose=useMemo(()=>motionPoseAt(demo,progress),[demo,progress]);
  useEffect(()=>{
    const element=root.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>setVisible(!!entries[0]?.isIntersecting),{threshold:0.05});
    observer.observe(element);return()=>observer.disconnect();
  },[demo.exerciseId]);
  useEffect(()=>{
    const update=()=>setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);
  },[]);
  useEffect(()=>{
    if (reduced || demo.hold) {setPlaying(false);setProgress(0);return;}
    cursor.current.value=0;
    const a=animate(cursor.current,{value:[0,1],duration:2100,loop:true,alternate:!demo.cyclic,ease:'inOutSine',frameRate:30,autoplay:false,onRender:()=>setProgress(cursor.current.value)});
    animation.current=a;
    return()=>{a.cancel();animation.current=null;};
  },[demo,reduced]);
  useEffect(()=>{
    const a=animation.current;
    if (!a) return;
    if (playing && visible && pageVisible && !reduced) a.play(); else a.pause();
  },[playing,visible,pageVisible,reduced,demo]);
  const position=(end:boolean)=>{animation.current?.pause();setPlaying(false);setProgress(end ? (demo.cyclic ? 0.25 : 1) : 0);};
  const toggle=()=>{
    if (!playing) {animation.current?.seek(0);setProgress(0);}
    setPlaying(v=>!v);
  };
  return <div className="movement-preview" ref={root} data-motion-demo={exercise.id}>
    <div className="movement-heading"><div><strong>Movement preview</strong><small>{demo.hold?'Hold position':'Illustrated movement'}</small></div>{!demo.hold && !reduced && <button type="button" aria-label={`${playing?'Pause':'Play'} movement preview for ${exercise.name}`} onClick={toggle}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pause':'Play'}</button>}</div>
    <Figure pose={pose} demo={demo}/>
    <p className="movement-instructions"><strong>Set up:</strong> {demo.start}<br/><strong>{demo.hold?'Hold':'Move'}:</strong> {demo.action}</p>
    {!demo.hold && <div className="movement-steps"><button type="button" onClick={()=>position(false)}>Show start</button><button type="button" onClick={()=>position(true)}>Show movement</button>{reduced && <span>Reduced motion: positions only.</span>}</div>}
    <small className="movement-note">Simplified illustration; not professionally verified or personal coaching. Move comfortably and stop if you feel pain.</small>
  </div>;
}

/** No generic substitute is shown for unillustrated exercises. */
export const ExerciseMotion:React.FC<{exercise:ExerciseItem;showUnavailable?:boolean}> = ({exercise,showUnavailable=true}) => {
  const demo=exerciseMotionFor(exercise);
  return demo ? <MotionPlayer key={exercise.id} demo={demo} exercise={exercise}/> : showUnavailable ? <p className="movement-pending">Movement preview coming later. Use the form cue below.</p> : null;
};
