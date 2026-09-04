import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, Archive, ArrowDownRight, ArrowLeft, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, ChevronDown, ClipboardCheck, Copy, Crosshair, FileText, Flag, Grid3X3, Hammer, Home,
  LogIn, LogOut, Map as MapIcon, Menu, MessageSquare, Plus, Radio, Save, Search, Settings,
  Shield, Swords, Target, Users, X, Zap
} from 'lucide-react';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const DEMO_USER = { id: 'demo-command', email: 'command@demo.local', display_name: 'Raven', role: 'commander' };

const seed = {
  ops: [
    { id: '042', name: 'Carentan — Defense', opponent: '4th Infantry', map: 'Carentan', mode: 'Warfare', date: '2026-08-31', time: '20:00', status: 'active', strategy: 'ready', briefing: '21/25', attendance: '23/25', commander: 'Raven', color: 'green' },
    { id: '041', name: 'Foy — Assault', opponent: '1st Armored', map: 'Foy', mode: 'Warfare', date: '2026-08-24', time: '20:00', status: 'archived', strategy: 'complete', briefing: '24/24', attendance: '24/25', commander: 'Wolf', color: 'muted' },
    { id: '040', name: 'Utah — Defense', opponent: '9th Guards', map: 'Utah', mode: 'Warfare', date: '2026-08-17', time: '20:00', status: 'archived', strategy: 'complete', briefing: '20/23', attendance: '21/25', commander: 'Raven', color: 'muted' }
  ],
  players: [
    ['Raven','Alpha','Support','ready'],['Wolf','Alpha','SL','ready'],['Viper','Alpha','AT','ready'],['Mason','Alpha','Engineer','ready'],['Kite','Alpha','Medic','ready'],
    ['Hawk','Bravo','SL','ready'],['Reaper','Bravo','Assault','ready'],['Fox','Bravo','MG','ready'],['Bishop','Bravo','Tank','ready'],['Stone','Bravo','Rifleman','ready'],
    ['Ghost','Charlie','Recon','ready'],['Iceman','Charlie','SL','ready'],['Ace','Charlie','Rifleman','ready'],['Nox','Charlie','Engineer','missing'],['Cole','Charlie','Support','ready'],
    ['Shade','Delta','SL','ready'],['Jinx','Delta','Spotter','ready'],['Rook','Delta','Sniper','ready'],['Bear','Delta','Rifleman','ready'],['Finn','Delta','AT','ready'],
    ['Sparrow','Echo','SL','ready'],['Ash','Echo','Rifleman','ready'],['Oak','Echo','Medic','missing'],['Bolt','Echo','Support','ready'],['Maverick','Echo','Armor','ready']
  ].map(([name,squad,role,status])=>({id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),name,squad,role,status})),
  events: [
    {id:'e1',date:'2026-08-31',time:'20:00',title:'vs 4th Infantry',type:'MATCH',meta:'Carentan · Defense',status:'ready', attendance:'23/25'},
    {id:'e2',date:'2026-09-02',time:'19:30',title:'Garrison Workshop',type:'TRAINING',meta:'Command + SLs',status:'open', attendance:'8/12'},
    {id:'e3',date:'2026-09-05',time:'18:30',title:'Armor Coordination Drill',type:'TRAINING',meta:'Bravo + reserves',status:'open', attendance:'5/8'}
  ],
  briefings: {
    Raven: 'Stay with Alpha during the initial setup. Your priority is supplies for Garrison 2. Do not chase enemy contact. If G2 is threatened, fall back to the southern route and report to your SL.',
    Wolf: 'Lead Alpha through the initial setup. Lock G1 and G2, then report armor sightings using compass + grid reference. Preserve squad strength for the first counter-push.',
    Viper: 'Remain close to Alpha SL. Your first priority is enemy armor confirmation. Do not expose for a solo shot; call contact first, then engage from covered angles.'
  },
  strategy: {name:'Carentan — Defense', intent:'Deny the southern approach and preserve the fallback network.', orders:'Hold the first defensive line until enemy armor is confirmed. Alpha owns the western sector. Bravo controls the center and armor reserve. Charlie maintains the southern fallback. Delta provides recon and artillery coordination.'},
  wiki: [
    ['Carentan Defensive Network','MAP','2026-08-31','Command'],
    ['Garrison Discipline SOP','SOP','2026-08-28','Wolf'],
    ['Armor Reserve Doctrine','ARMOR','2026-08-26','Viper'],
    ['Recon Reporting Format','RECON','2026-08-21','Ghost'],
    ['Fallback Spawn Doctrine','SOP','2026-08-19','Command']
  ],
  aar: {result:'WIN',score:'4 — 2',worked:'Defensive setup was fast. Alpha and Bravo communicated armor sightings well. Fallback garrisons survived the first major push.',failed:'Late rotation from Delta. Artillery calls lacked grid references. Two players overextended after the first cap.'}
};

const DEFAULT_PHASES = [
  {id:'p1',no:1,name:'SETUP',intent:'Establish spawns, defensive positions and support network.',tasks:[]},
  {id:'p2',no:2,name:'CONTACT',intent:'Absorb the first push and identify enemy armor and artillery.',tasks:[]},
  {id:'p3',no:3,name:'ROTATE',intent:'Shift reserves only on confirmed pressure and preserve the fallback line.',tasks:[]},
  {id:'p4',no:4,name:'FINAL',intent:'Execute fallback or counterattack according to command release.',tasks:[]}
];

function makeOperation(op={}, index=0){
  const baseId=op.id || String(40+index+1).padStart(3,'0');
  return {
    id:baseId, name:op.name||'New Operation', opponent:op.opponent||'TBD', map:op.map||'TBD', mode:op.mode||'Warfare',
    date:op.date||new Date().toISOString().slice(0,10), time:op.time||'20:00', status:op.status||'draft',
    strategy:op.strategy||'draft', briefing:op.briefing||'0/0', attendance:op.attendance||'0/0', commander:op.commander||'Command',
    attendanceByPlayer:op.attendanceByPlayer||{}, squads:op.squads||[
      {id:'alpha',name:'Alpha',lead:'',playerIds:[]},{id:'bravo',name:'Bravo',lead:'',playerIds:[]},
      {id:'charlie',name:'Charlie',lead:'',playerIds:[]},{id:'delta',name:'Delta',lead:'',playerIds:[]}
    ],
    strategyData:op.strategyData||{intent:'',orders:'',phases:DEFAULT_PHASES.map(p=>({...p,tasks:[]}))},
    stageMaps:op.stageMaps||DEFAULT_PHASES.map(p=>({phaseNo:p.no,name:p.name,markers:[]})),
    briefingsByPlayer:op.briefingsByPlayer||{},
    aarData:op.aarData||{result:'',score:'',worked:'',failed:'',lessons:''}
  };
}

function normalizeData(raw){
  const base=raw&&typeof raw==='object'?raw:seed;
  return {...seed,...base,ops:(Array.isArray(base.ops)?base.ops:seed.ops).map((op,i)=>makeOperation(op,i)),players:Array.isArray(base.players)?base.players:seed.players,events:Array.isArray(base.events)?base.events:seed.events,briefings:base.briefings||{},strategy:base.strategy||seed.strategy,wiki:Array.isArray(base.wiki)?base.wiki:seed.wiki,aar:base.aar||seed.aar};
}

function useClanStore(user){
  const [data,setData]=useState(seed);
  const [clan,setClan]=useState(null);
  const [loading,setLoading]=useState(!!supabase);
  const [error,setError]=useState('');
  const [needsOnboarding,setNeedsOnboarding]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      if(!supabase){
        const local=JSON.parse(localStorage.getItem('hll-command-data')||'null');
        if(!cancelled){setData(normalizeData(local||seed));setClan({id:'demo-clan',name:'HLL Demo Clan',tag:'DEMO',role:'commander'});setLoading(false);}
        return;
      }
      setLoading(true);
      const {data:member,error:memberError}=await supabase
        .from('clan_members')
        .select('clan_id,role,callsign,clans(id,name,tag,invite_code)')
        .eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
      if(memberError){ if(!cancelled){setError(memberError.message);setLoading(false);} return; }
      if(!member){ if(!cancelled){setNeedsOnboarding(true);setLoading(false);} return; }
      const clanInfo={id:member.clan_id,name:member.clans?.name||'Clan',tag:member.clans?.tag||'',inviteCode:member.clans?.invite_code||'',role:member.role,callsign:member.callsign||user.user_metadata?.name||user.email?.split('@')[0]||'Player'};
      const {data:row,error:stateError}=await supabase.from('clan_app_state').select('data').eq('clan_id',member.clan_id).maybeSingle();
      if(stateError){ if(!cancelled){setError(stateError.message);setLoading(false);} return; }
      if(!cancelled){setClan(clanInfo);setData(normalizeData(row?.data || seed));setNeedsOnboarding(false);setLoading(false);}
    })();
    return ()=>{cancelled=true};
  },[user?.id]);

  useEffect(()=>{
    if(!clan || loading) return;
    const timer=setTimeout(async()=>{
      if(!supabase){localStorage.setItem('hll-command-data',JSON.stringify(data));return;}
      const {error:upsertError}=await supabase.from('clan_app_state').upsert({clan_id:clan.id,data,updated_at:new Date().toISOString()},{onConflict:'clan_id'});
      if(upsertError) setError(upsertError.message);
    },350);
    return ()=>clearTimeout(timer);
  },[data,clan?.id]);

  useEffect(()=>{
    if(!supabase || !clan?.id) return;
    const channel=supabase.channel(`clan-state-${clan.id}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'clan_app_state',filter:`clan_id=eq.${clan.id}`},payload=>{
        if(payload.new?.data) setData(payload.new.data);
      }).subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[clan?.id]);

  async function createClan(name,tag){
    if(!supabase) { setClan({id:'demo-clan',name,tag,inviteCode:'demo1234',role:'commander',callsign: user.user_metadata?.name || user.email?.split('@')[0] || 'Player'}); setNeedsOnboarding(false); return; }
    const {data:clanRow,error:clanError}=await supabase.from('clans').insert({name,tag,created_by:user.id}).select().single();
    if(clanError) throw clanError;
    const {error:memberError}=await supabase.from('clan_members').insert({clan_id:clanRow.id,user_id:user.id,role:'commander',callsign:user.user_metadata?.name||user.email?.split('@')[0]});
    if(memberError) throw memberError;
    const {error:stateError}=await supabase.from('clan_app_state').insert({clan_id:clanRow.id,data:seed});
    if(stateError) throw stateError;
    setClan({id:clanRow.id,name:clanRow.name,tag:clanRow.tag,inviteCode:clanRow.invite_code||'',role:'commander',callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'}); setData(seed); setNeedsOnboarding(false);
  }
  async function joinClan(inviteCode){
    if(!supabase){ setClan({id:'demo-clan',name:'HLL Demo Clan',tag:'DEMO',inviteCode:'demo1234',role:'player',callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'}); setNeedsOnboarding(false); return; }
    const {data:joined,error:joinError}=await supabase.rpc('join_clan_by_invite',{p_code:inviteCode});
    if(joinError) throw joinError;
    const row=Array.isArray(joined)?joined[0]:joined;
    if(!row?.clan_id) throw new Error('Could not join clan.');
    const {data:stateRow,error:stateError}=await supabase.from('clan_app_state').select('data').eq('clan_id',row.clan_id).maybeSingle();
    if(stateError) throw stateError;
    setClan({id:row.clan_id,name:row.clan_name,tag:row.clan_tag,inviteCode:inviteCode,role:row.member_role,callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'});
    setData(normalizeData(stateRow?.data || seed));
    setNeedsOnboarding(false);
  }
  return {data,setData,clan,setClan,loading,error,needsOnboarding,createClan,joinClan};
}

function useAuth(){
  const [session,setSession]=useState(null); const [loading,setLoading]=useState(!!supabase);
  useEffect(()=>{ if(!supabase){setSession({user:DEMO_USER});setLoading(false);return;} supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return ()=>subscription.unsubscribe(); },[]);
  return {session,loading};
}

function App(){
  const {session,loading}=useAuth();
  if(loading) return <div className="splash"><Shield size={36}/><div>INITIALIZING COMMAND SYSTEM</div></div>;
  if(!session) return <Login/>;
  return <AuthenticatedApp session={session}/>;
}

function AuthenticatedApp({session}){
  const store=useClanStore(session.user);
  if(store.loading) return <div className="splash"><Shield size={36}/><div>LOADING CLAN DATA</div></div>;
  if(store.needsOnboarding) return <Onboarding user={session.user} onCreate={store.createClan} onJoin={store.joinClan}/>;
  if(store.error) return <div className="splash"><Shield size={36}/><div><b>DATA CONNECTION ERROR</b><small>{store.error}</small></div></div>;
  return <Shell session={session} store={store}/>;
}

function Onboarding({user,onCreate,onJoin}){
  const [mode,setMode]=useState('create'); const [name,setName]=useState(''); const [tag,setTag]=useState(''); const [invite,setInvite]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function createSubmit(e){e.preventDefault();setBusy(true);setError('');try{await onCreate(name.trim(),tag.trim().toUpperCase());}catch(e){setError(e.message||'Could not create clan.')}finally{setBusy(false)}}
  async function joinSubmit(e){e.preventDefault();setBusy(true);setError('');try{await onJoin(invite.trim().toLowerCase());}catch(e){setError(e.message||'Could not join clan.')}finally{setBusy(false)}}
  return <div className="login"><div className="login-card wide"><div className="brand large">HLL // COMMAND<small>CLAN OPERATIONS HUB</small></div><div className="eyebrow">FIRST-TIME SETUP</div><h1>{mode==='create'?'CREATE YOUR CLAN':'JOIN YOUR CLAN'}</h1><p>Welcome {user.user_metadata?.name || user.email}. {mode==='create'?'Create the clan workspace that will hold your operations, players, maps and briefings.':'Enter the invite code supplied by your commander to join the existing clan workspace.'}</p><div className="tabs auth-tabs"><button className={mode==='create'?'active':''} onClick={()=>{setMode('create');setError('')}}>CREATE CLAN</button><button className={mode==='join'?'active':''} onClick={()=>{setMode('join');setError('')}}>JOIN CLAN</button></div>{mode==='create'?<form onSubmit={createSubmit} className="stack"><label>Clan name<input value={name} onChange={e=>setName(e.target.value)} placeholder="7th Armored Division" required/></label><label>Clan tag<input value={tag} onChange={e=>setTag(e.target.value)} placeholder="7AD" maxLength={8} required/></label>{error&&<div className="error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?'CREATING…':'CREATE CLAN'} <Plus size={15}/></button></form>:<form onSubmit={joinSubmit} className="stack"><label>Clan invite code<input value={invite} onChange={e=>setInvite(e.target.value)} placeholder="a1b2c3d4" maxLength={16} required/></label><div className="callout">Your commander can find the invite code under <b>Members</b> after logging in.</div>{error&&<div className="error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?'JOINING…':'JOIN CLAN'} <Users size={15}/></button></form>}<div className="login-foot">{supabase?'Cloud accounts enabled':'Demo mode enabled'}</div></div></div>
}
function Login(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function submit(e){e.preventDefault();setBusy(true);setError(''); if(!supabase){alert('Demo mode: configure Supabase to enable accounts.');setBusy(false);return;} const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)setError(error.message); setBusy(false)}
  async function signup(){ if(!supabase){setError('Connect Supabase first.');return;} if(!email||!password){setError('Enter email and password first.');return;} setBusy(true); setError(''); const {error}=await supabase.auth.signUp({email,password,options:{data:{name:email.split('@')[0]}}}); if(error)setError(error.message); else setError('Account created. Check your email if confirmation is required, then sign in.'); setBusy(false) }
  return <div className="login"><div className="login-card"><div className="brand large">HLL // COMMAND<small>CLAN OPERATIONS HUB</small></div><div className="eyebrow">SECURE ACCESS</div><h1>COMMAND LOGIN</h1><p>Sign in to access operations, stage maps, rosters and briefings.</p><form onSubmit={submit} className="stack"><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@clan.com" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></label>{error&&<div className="error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?'AUTHENTICATING…':'SIGN IN'} <LogIn size={15}/></button><button type="button" className="btn" disabled={busy} onClick={signup}>CREATE ACCOUNT</button></form><div className="login-foot">{supabase?'Supabase authentication enabled':'Demo mode enabled — add Supabase env vars to activate accounts.'}</div></div></div>
}

function Shell({session,store}){
  const {data,setData,clan}=store; const [sidebar,setSidebar]=useState(false); const user=session.user || DEMO_USER; const displayName=clan?.callsign || user.user_metadata?.name || user.email?.split('@')[0] || DEMO_USER.display_name;
  const navigate=useNavigate();
  async function logout(){if(supabase) await supabase.auth.signOut(); else window.location.reload()}
  return <div className="app"><aside className={sidebar?'sidebar open':'sidebar'}><div className="brand">HLL // COMMAND<small>{clan?.tag ? `${clan.tag} · ` : ''}CLAN OPERATIONS HUB</small></div><nav>{[
    ['/', 'Dashboard', Home],['/operations','Operations',Swords],['/calendar','Calendar',CalendarDays],['/roster','Roster',Users],['/members','Members',Users],['/strategy','Strategies',Target],['/maps','Stage Maps',MapIcon],['/briefings','Briefings',FileText],['/wiki','Clan Wiki',BookOpen],['/aar','AAR',ClipboardCheck]
  ].map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setSidebar(false)} className={({isActive})=>isActive?'navitem active':'navitem'}><Icon size={17}/><span>{label}</span></NavLink>)}</nav><div className="side-bottom"><div className="online"><i/>SYSTEM ONLINE</div><div>{clan?.name || 'HLL Demo Clan'}</div><div className="muted">{supabase ? 'SUPABASE CONNECTED' : 'LOCAL DEMO MODE'}</div></div></aside><main><header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(v=>!v)}><Menu/></button><TopCrumb/><div className="top-right"><button className="iconbtn"><Bell size={16}/><em></em></button><button className="profile profile-clickable" onClick={()=>navigate('/profile')} title="Edit profile"><div className="avatar">{displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><span>{(clan?.role || DEMO_USER.role).toUpperCase()}</span></div></button><button className="iconbtn" onClick={logout} title="Log out"><LogOut size={15}/></button></div></header><div className="content"><Routes>
    <Route path="/" element={<Dashboard data={data}/>}/><Route path="/my-operation" element={<MyOperation data={data} setData={setData} user={user} clan={clan}/>}/><Route path="/operations" element={<Operations data={data} setData={setData}/>}/><Route path="/operations/:id" element={<OperationDetail data={data} setData={setData} user={user} clan={clan}/>}/><Route path="/calendar" element={<Calendar data={data} setData={setData}/>}/><Route path="/roster" element={<Roster data={data} setData={setData}/>}/><Route path="/members" element={<Members clan={clan} user={user} data={data}/>}/><Route path="/strategy" element={<Strategy data={data} setData={setData}/>}/><Route path="/maps" element={<Maps data={data} setData={setData}/>}/><Route path="/briefings" element={<Briefings data={data} setData={setData}/>}/><Route path="/wiki" element={<Wiki data={data} setData={setData}/>}/><Route path="/aar" element={<AAR data={data} setData={setData}/>}/><Route path="/profile" element={<Profile user={user} clan={clan} store={store}/>}/>
  </Routes></div></main></div>
}

function TopCrumb(){const l=useLocation(); const label=l.pathname==='/'?'DASHBOARD':l.pathname.split('/')[1].toUpperCase(); return <div className="crumb">CLAN / <b>{label}</b></div>}

function Profile({user,clan,store}){
  const [name,setName]=useState(clan?.callsign || user.user_metadata?.name || user.email?.split('@')[0] || 'Player');
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  async function save(e){e.preventDefault(); const value=name.trim(); if(!value){setError('Enter your in-game name.');return;} setBusy(true);setMessage('');setError('');
    try{
      if(!supabase){ localStorage.setItem('hll-demo-callsign',value); store.setData(d=>({...d,currentPlayerName:value})); setMessage('In-game name saved.'); return; }
      const {error:userError}=await supabase.auth.updateUser({data:{name:value}}); if(userError) throw userError;
      const {error:profileError}=await supabase.from('profiles').update({display_name:value,updated_at:new Date().toISOString()}).eq('id',user.id); if(profileError) throw profileError;
      const {error:memberError}=await supabase.from('clan_members').update({callsign:value}).eq('clan_id',clan.id).eq('user_id',user.id); if(memberError) throw memberError;
      store.setClan?.(current=>current ? {...current,callsign:value} : current);
      setMessage('In-game name saved.');
    }catch(err){setError(err.message || 'Could not save your in-game name.');} finally{setBusy(false)}
  }
  return <><PageHead eyebrow="PERSONAL SETTINGS" title="PLAYER PROFILE" subtitle="YOUR IN-GAME IDENTITY" actions={<Link className="btn" to="/"><ArrowLeft size={15}/> BACK</Link>}/><div className="grid g2"><div className="card form"><div className="eyebrow">IDENTITY</div><h2>IN-GAME NAME</h2><p className="subtitle">This is the name your clan sees in the roster, briefings and command screens.</p><form onSubmit={save} className="stack"><label className="field"><span>CALLSIGN / IN-GAME NAME</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={32} placeholder="Raven" autoComplete="off" required/></label>{error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}<button className="btn primary" disabled={busy}>{busy?'SAVING…':'SAVE PROFILE'} <Save size={15}/></button></form></div><div className="card brief"><div className="eyebrow">PREVIEW</div><div className="profile-preview"><div className="avatar xl">{(name.trim()||'P').slice(0,1).toUpperCase()}</div><div><h2>{name.trim()||'YOUR NAME'}</h2><div className="subtitle">{clan?.role?.toUpperCase()||'PLAYER'} · {clan?.tag||'CLAN'}</div></div></div><div className="callout">Your in-game name will be used instead of your email address throughout the clan interface.</div></div></div></>
}
function PageHead({eyebrow,title,subtitle,actions}){return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><div className="subtitle">{subtitle}</div></div><div className="actions">{actions}</div></div>}
function Stat({label,value,sub,trend}){return <div className="card stat"><div className="k">{label}</div><div className="v">{value}</div><div className={trend?'s trend':'s'}>{sub}</div></div>}
function Tag({children,tone=''}){return <span className={`tag ${tone}`}>{children}</span>}

function MyOperation({data,setData,user,clan}){
  const navigate=useNavigate();
  const op=data.ops.find(o=>o.status==='active')||data.ops[0];
  const player=currentPlayer(data,user,clan);
  const status=player&&op?(op.attendanceByPlayer||{})[player.id]||'pending':'pending';
  const squad=player?player.squad:'Unassigned';
  const brief=player?(op?.briefingsByPlayer||{})[player.id]:null;
  const phase=(op?.strategyData?.phases||DEFAULT_PHASES).find(p=>p.intent)||DEFAULT_PHASES[0];
  if(!op) return <div className="card"><h2>NO ACTIVE OPERATION</h2><p className="subtitle">Your commander has not created an operation yet.</p><button className="btn" onClick={()=>navigate('/operations')}>OPEN OPERATIONS</button></div>;
  function respond(next){
    let pid=player?.id;
    if(!pid){pid=crypto.randomUUID?.()||Math.random().toString(36).slice(2);setData(d=>({...d,players:[...d.players,{id:pid,memberUserId:user.id,name:clan?.callsign||user.email?.split('@')[0]||'Player',squad:'Unassigned',role:'Rifleman',status:'ready'}]}));}
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,attendanceByPlayer:{...(x.attendanceByPlayer||{}),[pid]:next}}:x)}));
  }
  return <>
    <PageHead eyebrow={`PLAYER CONSOLE // OPERATION #${op.id}`} title={op.name} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<Tag tone={status==='going'?'green':status==='declined'?'red':'yellow'}>{status.toUpperCase()}</Tag>}/>
    <div className="grid g4"><Stat label="ATTENDANCE" value={status.toUpperCase()} sub="YOUR RESPONSE" trend={status==='going'}/><Stat label="SQUAD" value={squad} sub={player?.role||'ROLE NOT SET'}/><Stat label="CURRENT PHASE" value={String(phase.no).padStart(2,'0')} sub={phase.name}/><Stat label="BRIEFING" value={brief?.published?'READY':'PENDING'} sub="INDIVIDUAL MISSION"/></div>
    <div className="grid g2 section">
      <div className="card form"><div className="eyebrow">YOUR ATTENDANCE</div><h2>REPORT AVAILABILITY</h2><p className="subtitle">Your commander uses this response to build squads and readiness.</p><div className="actions"><button className={status==='going'?'btn primary':'btn'} onClick={()=>respond('going')}><Check size={15}/> GOING</button><button className={status==='maybe'?'btn primary':'btn'} onClick={()=>respond('maybe')}>MAYBE</button><button className={status==='declined'?'btn primary':'btn'} onClick={()=>respond('declined')}>DECLINE</button></div><div className="callout"><Radio size={15}/> Attendance is saved to this operation and visible to command.</div></div>
      <div className="card brief"><div className="eyebrow">YOUR INDIVIDUAL BRIEFING</div><h2>{brief?.title||'NOT PUBLISHED YET'}</h2><div className="subtitle">{squad.toUpperCase()} · {(player?.role||'RIFLEMAN').toUpperCase()}</div>{brief?.published?<p>{brief.body||'No mission text has been written yet.'}</p>:<p>Your squad assignment and mission brief will appear here once command publishes them.</p>}<Tag tone={brief?.published?'green':'yellow'}>{brief?.published?'PUBLISHED':'WAITING FOR COMMAND'}</Tag></div>
    </div>
    <div className="grid g2 section">
      <div className="card"><div className="section-head"><h3>Command plan</h3><span>PHASE {String(phase.no).padStart(2,'0')}</span></div><div className="side-list"><div className="row"><div><b>Commander intent</b><small>{op.strategyData?.intent||'Not published yet.'}</small></div></div><div className="row"><div><b>Your phase task</b><small>{phase.tasks?.length?phase.tasks.join(' · '):'No task assigned yet.'}</small></div></div><div className="row"><div><b>Global orders</b><small>{op.strategyData?.orders||'No global orders published yet.'}</small></div></div></div></div>
      <div className="card"><div className="section-head"><h3>Operation navigation</h3><span>FULL WORKSPACE</span></div><div className="actions"><button className="btn" onClick={()=>navigate(`/operations/${op.id}`)}>OPEN OPERATION</button><button className="btn" onClick={()=>navigate(`/operations/${op.id}`)}>VIEW STAGE MAPS</button></div><div className="callout"><MessageSquare size={15}/> Your commander should publish your final briefing before squad lock.</div></div>
    </div>
  </>;
}

function Dashboard({data}){
  const op=data.ops.find(o=>o.status==='active') || data.ops[0] || makeOperation({},0);
  const ready=data.players.filter(p=>p.status==='ready').length;
  const squads=[...new Set(data.players.map(p=>p.squad).filter(Boolean))];
  const phaseReady=op.strategyData?.phases?.filter(p=>p.intent).length||0;
  const briefingCount=Object.values(op.briefingsByPlayer||{}).filter(b=>b?.published).length;
  return <><PageHead eyebrow={`CURRENT OPERATION // ${op.id}`} title={op.name.toUpperCase()} subtitle={`${op.date} · ${op.time} · ${op.map} · VS ${op.opponent}`} actions={<><Link className="btn" to={`/operations/${op.id}`}>OPEN OPERATION</Link><Link className="btn primary" to={`/operations/${op.id}`}>COMMAND WORKSPACE</Link></>}/><div className="grid g4"><Stat label="ATTENDANCE" value={op.attendanceByPlayer?`${Object.values(op.attendanceByPlayer).filter(v=>v==='going').length}/${Object.keys(op.attendanceByPlayer).length}`:op.attendance} sub="RESPONDED / GOING" trend/><Stat label="SQUADS" value={`${squads.length}`} sub={`${ready}/${data.players.length} PLAYERS READY`} trend/><Stat label="STRATEGY" value={`${phaseReady}/4`} sub="PHASES DEFINED" trend/><Stat label="BRIEFINGS" value={`${briefingCount}/${data.players.length}`} sub="PUBLISHED"/></div><div className="grid g2 section"><div className="card"><div className="section-head"><h3>Operation map</h3><span>LIVE WORKSPACE</span></div><TacticalMap compact/></div><div className="card"><div className="section-head"><h3>Command board</h3><span>OPERATION #{op.id}</span></div><div className="side-list"><button className="row row-button" onClick={()=>location.assign(`/operations/${op.id}`)}><div><b>01 · Player attendance</b><small>Confirm availability before squad lock</small></div><Tag tone="green">OPEN</Tag></button><button className="row row-button"><div><b>02 · Squad assignment</b><small>{op.squads?.length||0} squads configured</small></div><Tag tone="yellow">MANAGE</Tag></button><button className="row row-button"><div><b>03 · Strategy</b><small>{phaseReady}/4 phases have an intent</small></div><Tag tone={phaseReady===4?'green':'yellow'}>{phaseReady===4?'READY':'DRAFT'}</Tag></button><button className="row row-button"><div><b>04 · Individual briefings</b><small>Published briefs stay attached to this match</small></div><Tag tone={briefingCount===data.players.length?'green':'red'}>{briefingCount}/{data.players.length}</Tag></button><button className="row row-button"><div><b>05 · AAR</b><small>Complete after the match</small></div><Tag>{op.aarData?.result||'PENDING'}</Tag></button></div></div></div></>
}

function Operations({data,setData}){
  const navigate=useNavigate();
  const [creating,setCreating]=useState(false);
  const [draft,setDraft]=useState({name:'',opponent:'',map:'',mode:'Warfare',date:new Date().toISOString().slice(0,10),time:'20:00'});
  function create(){
    if(!draft.name.trim()||!draft.map.trim()) return;
    const id=String(40+data.ops.length+1).padStart(3,'0');
    const op=makeOperation({...draft,id,commander:'Command'} ,0);
    setData(d=>({...d,ops:[op,...d.ops]}));
    setCreating(false); setDraft({name:'',opponent:'',map:'',mode:'Warfare',date:new Date().toISOString().slice(0,10),time:'20:00'});
    navigate(`/operations/${id}`);
  }
  return <>
    <PageHead eyebrow="OPERATIONS" title="MATCH WORKSPACE" subtitle="ONE RECORD FOR EVERYTHING CONNECTED TO A MATCH" actions={<button className="btn primary" onClick={()=>setCreating(v=>!v)}><Plus size={15}/> NEW OPERATION</button>}/>
    {creating&&<div className="card section"><div className="section-head"><h3>New operation</h3><span>CREATE MISSION RECORD</span></div><div className="form-grid"><Input label="OPERATION NAME" value={draft.name} onChange={v=>setDraft(x=>({...x,name:v}))} placeholder="Carentan — Defense"/><Input label="OPPONENT" value={draft.opponent} onChange={v=>setDraft(x=>({...x,opponent:v}))} placeholder="4th Infantry"/><Input label="MAP" value={draft.map} onChange={v=>setDraft(x=>({...x,map:v}))} placeholder="Carentan"/><Input label="MODE" value={draft.mode} onChange={v=>setDraft(x=>({...x,mode:v}))} placeholder="Warfare"/><label className="field"><span>DATE</span><input type="date" value={draft.date} onChange={e=>setDraft(x=>({...x,date:e.target.value}))}/></label><label className="field"><span>TIME</span><input type="time" value={draft.time} onChange={e=>setDraft(x=>({...x,time:e.target.value}))}/></label></div><div className="actions"><button className="btn" onClick={()=>setCreating(false)}>CANCEL</button><button className="btn primary" onClick={create}><Check size={15}/> CREATE OPERATION</button></div></div>}
    <div className="grid g3"><Stat label="ACTIVE OPERATIONS" value={data.ops.filter(o=>o.status==='active').length} sub="LIVE MATCH WORKSPACES" trend/><Stat label="NEXT EVENT" value={data.events[0]?.date?.slice(5)||'—'} sub={data.events[0]?.title||'NO EVENT'}/><Stat label="TOTAL RECORDS" value={data.ops.length} sub="MATCH HISTORY"/></div>
    <div className="card section"><div className="section-head"><h3>All operations</h3><span>{data.ops.length} RECORDS</span></div><table className="table"><thead><tr><th>OPERATION</th><th>OPPONENT</th><th>MAP</th><th>DATE</th><th>READINESS</th><th>STATUS</th></tr></thead><tbody>{data.ops.map(op=><tr key={op.id} onClick={()=>navigate(`/operations/${op.id}`)} className="clickrow"><td><b>#{op.id}</b> {op.name}</td><td>{op.opponent}</td><td>{op.map}</td><td>{op.date} · {op.time}</td><td>{op.strategyData?.intent?<Tag tone="green">READY</Tag>:<Tag tone="yellow">DRAFT</Tag>}</td><td>{op.status==='active'?<Tag tone="green">ACTIVE</Tag>:op.status==='draft'?<Tag tone="yellow">DRAFT</Tag>:<Tag>ARCHIVED</Tag>}</td></tr>)}</tbody></table></div>
  </>
}

function OperationDetail({data,setData,user,clan}){
  const {id}=useParams(); const navigate=useNavigate();
  const op=data.ops.find(x=>x.id===id);
  const [tab,setTab]=useState('overview');
  if(!op) return <div className="card"><h2>Operation not found</h2><button className="btn" onClick={()=>navigate('/operations')}><ArrowLeft size={15}/> BACK</button></div>;
  const update=(patch)=>setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,...patch}:x)}));
  const nested=()=>{setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?makeOperation(x):x)}))};
  const attendanceValues=Object.values(op.attendanceByPlayer||{}); const going=attendanceValues.filter(v=>v==='going').length; const responded=attendanceValues.length;
  const playersWithIds=data.players.filter(p=>p.memberUserId||p.id);
  return <>
    <PageHead eyebrow={`OPERATION #${op.id}`} title={op.name} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<><Tag tone={op.status==='active'?'green':'yellow'}>{op.status.toUpperCase()}</Tag><button className="btn" onClick={()=>navigate('/operations')}><ArrowLeft size={15}/> BACK</button></>}/>
    <div className="tabs">{['overview','attendance','squads','strategy','stage maps','briefings','aar'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
    {tab==='overview'&&<div className="grid g3">
      <Stat label="ATTENDANCE" value={`${going}/${responded}`} sub="RESPONDED / GOING" trend/><Stat label="SQUADS" value={(op.squads||[]).length} sub="ASSIGNMENT GROUPS"/><Stat label="BRIEFINGS" value={`${Object.values(op.briefingsByPlayer||{}).filter(b=>b?.published).length}/${data.players.length}`} sub="PUBLISHED"/>
      <div className="card section span2"><div className="section-head"><h3>Mission record</h3><span>EDITABLE</span></div><div className="form-grid"><Input label="OPERATION NAME" value={op.name} onChange={v=>update({name:v})}/><Input label="OPPONENT" value={op.opponent} onChange={v=>update({opponent:v})}/><Input label="MAP" value={op.map} onChange={v=>update({map:v})}/><Input label="MODE" value={op.mode} onChange={v=>update({mode:v})}/><label className="field"><span>DATE</span><input type="date" value={op.date} onChange={e=>update({date:e.target.value})}/></label><label className="field"><span>TIME</span><input type="time" value={op.time} onChange={e=>update({time:e.target.value})}/></label></div><div className="actions"><button className="btn" onClick={()=>update({status:op.status==='active'?'draft':'active'})}>{op.status==='active'?'SET DRAFT':'ACTIVATE OPERATION'}</button><button className="btn" onClick={nested}>PREPARE WORKSPACE</button></div></div>
      <div className="card section"><div className="section-head"><h3>Command flow</h3></div><div className="side-list">{[['1','Players sign up','attendance'],['2','Squads assigned','squads'],['3','Strategy locked','strategy'],['4','Stage maps','stage maps'],['5','Individual briefings','briefings'],['6','AAR','aar']].map(([n,label,t])=><button className="row row-button" key={t} onClick={()=>setTab(t)}><div><b>{n}. {label}</b><small>Open workspace</small></div><ArrowUpRight size={14}/></button>)}</div></div>
    </div>}
    {tab==='attendance'&&<OperationAttendance op={op} data={data} setData={setData} user={user} clan={clan}/>} 
    {tab==='squads'&&<OperationSquads op={op} data={data} setData={setData}/>} 
    {tab==='strategy'&&<OperationStrategy op={op} setData={setData}/>} 
    {tab==='stage maps'&&<OperationStageMaps op={op} setData={setData}/>} 
    {tab==='briefings'&&<OperationBriefings op={op} data={data} setData={setData} user={user}/>} 
    {tab==='aar'&&<OperationAAR op={op} setData={setData}/>} 
  </>
}

function currentPlayer(data,user,clan){
  return data.players.find(p=>p.memberUserId===user?.id)||data.players.find(p=>p.name===clan?.callsign)||null;
}

function OperationAttendance({op,data,setData,user,clan}){
  const player=currentPlayer(data,user,clan); const [name,setName]=useState(clan?.callsign||user?.email?.split('@')[0]||'Player');
  function join(){
    let pid=player?.id;
    if(!pid){pid=crypto.randomUUID?.()||Math.random().toString(36).slice(2); setData(d=>({...d,players:[...d.players,{id:pid,memberUserId:user.id,name:name.trim()||'Player',squad:'Unassigned',role:'Rifleman',status:'ready'}]}));}
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,attendanceByPlayer:{...(x.attendanceByPlayer||{}),[pid]:'going'}}:x)}));
  }
  const statuses=op.attendanceByPlayer||{};
  const roster=data.players.filter(p=>p.memberUserId||statuses[p.id]);
  return <div className="grid g2"><div className="card form"><div className="eyebrow">YOUR RESPONSE</div><h2>ATTENDANCE</h2><p className="subtitle">Confirm whether you will attend this operation.</p>{!player&&<label className="field"><span>IN-GAME NAME</span><input value={name} onChange={e=>setName(e.target.value)}/></label>}<div className="actions"><button className="btn primary" onClick={join}>GOING</button><button className="btn" onClick={()=>joinStatus('maybe')}>MAYBE</button><button className="btn" onClick={()=>joinStatus('declined')}>DECLINE</button></div><div className="callout"><Check size={15}/> Your response is saved to this operation.</div></div><div className="card"><div className="section-head"><h3>Attendance board</h3><span>{Object.values(statuses).filter(s=>s==='going').length} GOING</span></div><table className="table"><thead><tr><th>PLAYER</th><th>SQUAD</th><th>RESPONSE</th></tr></thead><tbody>{roster.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.squad}</td><td><Tag tone={statuses[p.id]==='going'?'green':statuses[p.id]==='declined'?'red':'yellow'}>{(statuses[p.id]||'PENDING').toUpperCase()}</Tag></td></tr>)}</tbody></table></div></div>;
  function joinStatus(status){ let pid=player?.id; if(!pid){pid=crypto.randomUUID?.()||Math.random().toString(36).slice(2); setData(d=>({...d,players:[...d.players,{id:pid,memberUserId:user.id,name:name.trim()||'Player',squad:'Unassigned',role:'Rifleman',status:'ready'}]}));} setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,attendanceByPlayer:{...(x.attendanceByPlayer||{}),[pid]:status}}:x)})); }
}

function OperationSquads({op,data,setData}){
  const squads=op.squads||[];

  function assign(pid,sid){
    const squadName=squads.find(s=>s.id===sid)?.name||'Unassigned';
    setData(d=>({
      ...d,
      ops:d.ops.map(x=>{
        if(x.id!==op.id)return x;
        return {
          ...x,
          squads:(x.squads||[]).map(s=>({
            ...s,
            playerIds:s.id===sid
              ? [...new Set([...(s.playerIds||[]),pid])]
              : (s.playerIds||[]).filter(id=>id!==pid)
          }))
        };
      }),
      players:d.players.map(p=>p.id===pid?{...p,squad:squadName}:p)
    }));
  }

  function addSquad(){
    const name=`Squad ${squads.length+1}`;
    const newSquad={id:`s${Date.now()}`,name,lead:'',playerIds:[]};
    setData(d=>({
      ...d,
      ops:d.ops.map(x=>x.id===op.id?{...x,squads:[...(x.squads||[]),newSquad]}:x)
    }));
  }

  return <>
    <PageHead
      eyebrow={`OPERATION #${op.id}`}
      title="SQUAD ASSIGNMENT"
      subtitle="PUT EVERY PLAYER IN THE RIGHT PLACE"
      actions={<button className="btn primary" onClick={addSquad}><Plus size={15}/> ADD SQUAD</button>}
    />

    <div className="grid g2">
      {squads.map(s=>(
        <div className="card" key={s.id}>
          <div className="section-head"><h3>{s.name}</h3><span>{(s.playerIds||[]).length} PLAYERS</span></div>
          <label className="field">
            <span>SQUAD LEAD</span>
            <select
              value={s.lead||''}
              onChange={e=>setData(d=>({
                ...d,
                ops:d.ops.map(x=>x.id===op.id?{
                  ...x,
                  squads:(x.squads||[]).map(q=>q.id===s.id?{...q,lead:e.target.value}:q)
                }:x)
              }))}
            >
              <option value="">Unassigned</option>
              {data.players.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </label>
          <div className="player-chips">
            {(s.playerIds||[]).map(pid=>{
              const p=data.players.find(x=>x.id===pid);
              return p?<Tag key={pid} tone="green">{p.name}</Tag>:null;
            })}
          </div>
        </div>
      ))}

      <div className="card section">
        <div className="section-head"><h3>Assign players</h3><span>ALL ROSTER</span></div>
        <table className="table">
          <thead><tr><th>PLAYER</th><th>CURRENT SQUAD</th><th>MOVE TO</th></tr></thead>
          <tbody>
            {data.players.map(p=>(
              <tr key={p.id}>
                <td><b>{p.name}</b><small>{p.role}</small></td>
                <td>{p.squad||'Unassigned'}</td>
                <td>
                  <select value={squads.find(s=>s.name===p.squad)?.id||''} onChange={e=>assign(p.id,e.target.value)}>
                    <option value="">Unassigned</option>
                    {squads.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}

function OperationStrategy({op,setData}){const local=op.strategyData||{intent:'',orders:'',phases:DEFAULT_PHASES}; function updateStrategy(patch){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,strategyData:{...local,...patch},strategy:'ready'}:x)}));} function updatePhase(id,patch){const phases=local.phases.map(p=>p.id===id?{...p,...patch}:p);updateStrategy({phases});} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="STRATEGY" subtitle="COMMANDER'S INTENT → PHASES → TASKS" actions={<Tag tone={local.intent?'green':'yellow'}>{local.intent?'DRAFT READY':'INCOMPLETE'}</Tag>}/><div className="grid g2"><div className="card form"><Input label="COMMANDER'S INTENT" value={local.intent} onChange={v=>updateStrategy({intent:v})} placeholder="What must this operation achieve?"/><label className="field"><span>GLOBAL ORDERS</span><textarea value={local.orders} onChange={e=>updateStrategy({orders:e.target.value})} placeholder="Rules, priorities, triggers, fallback conditions…"/></label></div><div className="card"><div className="section-head"><h3>Battle phases</h3><span>4 PHASES</span></div><div className="side-list">{local.phases.map(p=><div className="row" key={p.id}><div><b>{String(p.no).padStart(2,'0')} — {p.name}</b><small>{p.intent||'No phase intent yet.'}</small></div><Tag tone={p.intent?'green':'yellow'}>{p.intent?'READY':'DRAFT'}</Tag></div>)}</div></div></div><div className="card section"><div className="section-head"><h3>Phase editor</h3><span>SAVE AS YOU TYPE</span></div>{local.phases.map(p=><div className="phase-editor" key={p.id}><div className="phase-title"><Tag tone="green">{String(p.no).padStart(2,'0')}</Tag><b>{p.name}</b></div><Input label="PHASE INTENT" value={p.intent} onChange={v=>updatePhase(p.id,{intent:v})}/><Input label="PRIMARY TASKS" value={(p.tasks||[]).join(' · ')} onChange={v=>updatePhase(p.id,{tasks:v.split('·').map(x=>x.trim()).filter(Boolean)})}/></div>)}</div></div>}

function OperationStageMaps({op,setData}){const maps=op.stageMaps||DEFAULT_PHASES.map(p=>({phaseNo:p.no,name:p.name,markers:[]})); const [phase,setPhase]=useState(1); const current=maps.find(m=>m.phaseNo===phase)||maps[0]; function setMap(patch){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,stageMaps:x.stageMaps.map(m=>m.phaseNo===current.phaseNo?{...m,...patch}:m)}:x)}));} function addMarker(){const markers=[...(current.markers||[]),{id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),label:`M${(current.markers||[]).length+1}`,x:50,y:50,type:'objective'}];setMap({markers});} function move(i,x,y){setMap({markers:current.markers.map((m,n)=>n===i?{...m,x,y}:m)});} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="STAGE MAPS" subtitle="BUILD THE PLAN PHASE BY PHASE" actions={<button className="btn primary" onClick={addMarker}><Plus size={15}/> ADD MARKER</button>}/><div className="tabs">{maps.map(m=><button key={m.phaseNo} className={phase===m.phaseNo?'active':''} onClick={()=>setPhase(m.phaseNo)}>{String(m.phaseNo).padStart(2,'0')} {m.name}</button>)}</div><div className="card map-wrap"><OperationMapCanvas map={current} onMove={move}/></div><div className="grid g3 section"><Stat label="MARKERS" value={current.markers?.length||0} sub="TACTICAL OBJECTS"/><Stat label="PHASE" value={String(current.phaseNo).padStart(2,'0')} sub={current.name}/><Stat label="STATUS" value={current.markers?.length?'READY':'DRAFT'} sub="SAVED TO OPERATION"/></div></div>}
function OperationMapCanvas({map,onMove}){const [drag,setDrag]=useState(null); return <div className="tactical-map" onPointerMove={e=>{if(drag===null)return;const r=e.currentTarget.getBoundingClientRect();const x=Math.max(2,Math.min(96,(e.clientX-r.left)/r.width*100));const y=Math.max(2,Math.min(96,(e.clientY-r.top)/r.height*100));onMove(drag,x,y)}} onPointerUp={()=>setDrag(null)}><div className="grid-overlay"/><div className="zone friendly"/><div className="zone contested"/><div className="zone rear"/><div className="river"/><div className="road road-a"/><div className="road road-b"/>{(map.markers||[]).map((m,i)=><div className="marker yellow" key={m.id} style={{left:`${m.x}%`,top:`${m.y}%`}} onPointerDown={()=>setDrag(i)}>{m.label}</div>)}<div className="legend"><span><i className="lg friend"/>FRIENDLY</span><span><i className="lg enemy"/>ENEMY</span><span><i className="lg obj"/>OBJECTIVE</span></div><div className="map-grid-label">GRID // OP-{map.phaseNo} · {map.name}</div></div>}

function OperationBriefings({op,data,setData,user}){const ids=data.players.map(p=>p.id); const [pid,setPid]=useState(ids[0]||''); const player=data.players.find(p=>p.id===pid)||data.players[0]; const existing=op.briefingsByPlayer?.[pid]||{title:'Mission briefing',body:'',checklist:['Know your route','Confirm role with SL','Report contact with grid'],published:false}; function update(patch){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,briefingsByPlayer:{...(x.briefingsByPlayer||{}),[pid]:{...existing,...patch}}}:x)}));} function publish(){update({published:true,publishedAt:new Date().toISOString()});} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="INDIVIDUAL BRIEFINGS" subtitle="ONE BRIEF PER PLAYER" actions={<button className="btn primary" onClick={publish}><Save size={15}/> PUBLISH BRIEFING</button>}/><div className="grid g2"><div className="card form"><label className="field"><span>PLAYER</span><select value={pid} onChange={e=>setPid(e.target.value)}>{data.players.map(p=><option key={p.id} value={p.id}>{p.name} · {p.squad} · {p.role}</option>)}</select></label><Input label="TITLE" value={existing.title} onChange={v=>update({title:v})}/><label className="field"><span>MISSION</span><textarea value={existing.body} onChange={e=>update({body:e.target.value})} placeholder="What this player must do, where, and when…"/></label><div className="checklist"><span className="field-title">CHECKLIST</span>{existing.checklist.map((c,i)=><label key={i}><input type="checkbox" defaultChecked={false}/><span>{c}</span></label>)}</div></div><div className="card brief"><div className="eyebrow">PLAYER VIEW</div><h2>{player?.name||'PLAYER'}</h2><div className="subtitle">{player?.squad||'UNASSIGNED'} · {player?.role||'RIFLEMAN'}</div><Tag tone={existing.published?'green':'yellow'}>{existing.published?'PUBLISHED':'DRAFT'}</Tag><h4>{existing.title}</h4><p>{existing.body||'No individual briefing written yet.'}</p><div className="callout"><MessageSquare size={15}/> This is the exact briefing shown to the player.</div></div></div><div className="card section"><div className="section-head"><h3>Briefing coverage</h3><span>{data.players.filter(p=>op.briefingsByPlayer?.[p.id]?.published).length}/{data.players.length}</span></div><table className="table"><thead><tr><th>PLAYER</th><th>SQUAD</th><th>STATUS</th></tr></thead><tbody>{data.players.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.squad}</td><td><Tag tone={op.briefingsByPlayer?.[p.id]?.published?'green':'red'}>{op.briefingsByPlayer?.[p.id]?.published?'PUBLISHED':'PENDING'}</Tag></td></tr>)}</tbody></table></div></div>}

function OperationAAR({op,setData}){const a=op.aarData||{}; function upd(p){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,aarData:{...a,...p}}:x)}));} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="AFTER ACTION REVIEW" subtitle="CAPTURE LESSONS FOR THE NEXT MATCH"/><div className="grid g4"><Stat label="RESULT" value={a.result||'—'} sub={a.score||'SCORE'}/><Stat label="LESSONS" value={a.lessons?'READY':'DRAFT'} sub="COMMAND NOTES"/><Stat label="WORKED" value={a.worked?'FILLED':'EMPTY'} sub="POSITIVE"/><Stat label="FAILED" value={a.failed?'FILLED':'EMPTY'} sub="IMPROVE"/></div><div className="grid g2 section"><div className="card form"><label className="field"><span>RESULT</span><select value={a.result||''} onChange={e=>upd({result:e.target.value})}><option value="">Select</option><option>WIN</option><option>LOSS</option><option>DRAW</option></select></label><Input label="SCORE" value={a.score||''} onChange={v=>upd({score:v})} placeholder="4 — 2"/><label className="field"><span>WHAT WORKED?</span><textarea value={a.worked||''} onChange={e=>upd({worked:e.target.value})}/></label><label className="field"><span>WHAT FAILED?</span><textarea value={a.failed||''} onChange={e=>upd({failed:e.target.value})}/></label><label className="field"><span>LESSONS FOR NEXT OP</span><textarea value={a.lessons||''} onChange={e=>upd({lessons:e.target.value})}/></label></div><div className="card brief"><div className="eyebrow">COMMAND SUMMARY</div><h2>{a.result||'OPERATION COMPLETE'}</h2><p>{a.worked||'Document what the clan did well.'}</p><p>{a.failed||'Document what must change.'}</p><div className="callout"><Archive size={15}/> The AAR stays attached to operation #{op.id}.</div></div></div></div>}

function Input({label,value,onChange,placeholder}){return <label className="field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}

function Calendar({data,setData}){
  function add(){
    const title=prompt('Event title?');
    if(!title)return;
    setData(d=>({...d,events:[...d.events,{id:crypto.randomUUID?.()||Math.random(),date:new Date().toISOString().slice(0,10),time:'20:00',title,type:'EVENT',meta:'Clan',status:'open',attendance:'0/0'}]}));
  }
  return <>
    <PageHead eyebrow="SCHEDULE" title="CLAN CALENDAR" subtitle="MATCHES · TRAINING · EVENTS" actions={<button className="btn primary" onClick={add}><Plus size={15}/> ADD EVENT</button>}/>
    <div className="calendar">
      <div className="weekhead">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d=><div key={d}>{d}</div>)}</div>
      <div className="calendar-grid">
        {data.events.map(e=>(
          <div className="event card" key={e.id}>
            <div className="event-date">{e.date.slice(5)} · {e.time}</div>
            <b>{e.title}</b>
            <small>{e.meta}</small>
            <div><Tag tone={e.type==='MATCH'?'red':'yellow'}>{e.type}</Tag> <Tag tone={e.status==='ready'?'green':''}>{e.attendance}</Tag></div>
          </div>
        ))}
      </div>
    </div>
    <div className="card section">
      <div className="section-head"><h3>Upcoming events</h3></div>
      <table className="table">
        <thead><tr><th>DATE</th><th>EVENT</th><th>TYPE</th><th>ATTENDANCE</th><th>STATUS</th></tr></thead>
        <tbody>
          {data.events.map(e=>(
            <tr key={e.id}>
              <td>{e.date} · {e.time}</td>
              <td><b>{e.title}</b><small>{e.meta}</small></td>
              <td><Tag tone={e.type==='MATCH'?'red':'yellow'}>{e.type}</Tag></td>
              <td>{e.attendance}</td>
              <td><Tag tone={e.status==='ready'?'green':''}>{e.status.toUpperCase()}</Tag></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>;
}

function Roster({data,setData,embedded=false}){
  const [filter,setFilter]=useState('');
  const [newName,setNewName]=useState('');
  const filtered=data.players.filter(p=>`${p.name} ${p.squad} ${p.role}`.toLowerCase().includes(filter.toLowerCase()));
  function add(){
    if(!newName.trim())return;
    setData(d=>({...d,players:[...d.players,{id:crypto.randomUUID?.()||Math.random(),name:newName.trim(),squad:'Echo',role:'Rifleman',status:'ready'}]}));
    setNewName('');
  }
  const squads=[...new Set(data.players.map(p=>p.squad))].map(s=>{
    const a=data.players.filter(p=>p.squad===s);
    return {s,ready:a.filter(p=>p.status==='ready').length,total:a.length};
  });
  return <div className={embedded?'embedded':''}>
    {!embedded&&<PageHead eyebrow="PERSONNEL" title="ROSTER & SQUADS" subtitle="ASSIGN PLAYERS, ROLES AND READINESS" actions={<button className="btn primary" onClick={add}><Plus size={15}/> ADD PLAYER</button>}/>}
    <div className="grid g2">
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search size={14}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search player, squad, role…"/></div>
          <div className="add-inline"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Player name"/><button className="btn" onClick={add}><Plus size={14}/></button></div>
        </div>
        <table className="table">
          <thead><tr><th>PLAYER</th><th>SQUAD</th><th>ROLE</th><th>STATUS</th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id}><td><b>{p.name}</b></td><td>{p.squad}</td><td><Tag>{p.role}</Tag></td><td><Tag tone={p.status==='ready'?'green':'red'}>{p.status.toUpperCase()}</Tag></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="section-head"><h3>Squad readiness</h3><span>LIVE</span></div>
        <div className="side-list">
          {squads.map(x=>(
            <div className="row" key={x.s}>
              <div><b>{x.s}</b><small>{x.ready}/{x.total} READY</small></div>
              <div className="progress"><i style={{width:`${x.total?x.ready/x.total*100:0}%`}}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>;
}

function Members({clan,user,data}){
  const [members,setMembers]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [copied,setCopied]=useState(false);
  useEffect(()=>{let live=true;(async()=>{if(!supabase||!clan?.id){setMembers(data.players.map(p=>({id:p.id,callsign:p.name,role:p.role,user_id:p.memberUserId,active:true})));setLoading(false);return;} const {data:rows,error:e}=await supabase.from('clan_members').select('id,user_id,callsign,role,active,created_at').eq('clan_id',clan.id).order('created_at',{ascending:true}); if(live){setMembers(rows||[]);setError(e?.message||'');setLoading(false);}})();return()=>{live=false}},[clan?.id,data.players.length]);
  async function copyInvite(){if(!clan?.inviteCode)return;try{await navigator.clipboard.writeText(clan.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{setCopied(false)}}
  return <><PageHead eyebrow="PERSONNEL COMMAND" title="CLAN MEMBERS" subtitle="ACCOUNTS · ROLES · INVITE ACCESS"/><div className="grid g3"><div className="card stat"><div className="k">MEMBERS</div><div className="v">{members.length}</div><div className="s">ACTIVE CLAN ACCOUNTS</div></div><div className="card stat"><div className="k">COMMANDERS</div><div className="v">{members.filter(m=>m.role==='commander'||m.role==='co').length}</div><div className="s">COMMAND ACCESS</div></div><div className="card"><div className="section-head"><h3>Invite code</h3><span>SHARE WITH CLAN</span></div><div className="invite-code">{clan?.inviteCode||'—'}</div><button className="btn primary" onClick={copyInvite} disabled={!clan?.inviteCode}><Copy size={14}/> {copied?'COPIED':'COPY INVITE CODE'}</button></div></div>{error&&<div className="error section">{error}</div>}<div className="card section"><div className="section-head"><h3>Member roster</h3><span>{loading?'LOADING…':'LIVE FROM SUPABASE'}</span></div><table className="table"><thead><tr><th>CALLSIGN</th><th>ROLE</th><th>STATUS</th><th>USER ID</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><b>{m.callsign||'Unnamed player'}</b></td><td><Tag tone={m.role==='commander'?'green':m.role==='squad_lead'?'yellow':''}>{String(m.role||'player').replace('_',' ').toUpperCase()}</Tag></td><td><Tag tone={m.active?'green':'red'}>{m.active?'ACTIVE':'INACTIVE'}</Tag></td><td><small>{m.user_id===user?.id?'YOU':(m.user_id||'—').slice(0,8)}</small></td></tr>)}{!members.length&&!loading&&<tr><td colSpan="4">No clan members found.</td></tr>}</tbody></table></div></>
}

function Strategy({data,setData,embedded=false}){const [local,setLocal]=useState(data.strategy); useEffect(()=>setLocal(data.strategy),[data.strategy]); function save(){setData(d=>({...d,strategy:local}));alert('Strategy saved to local command database.')} return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="OPERATION 042" title="STRATEGY BUILDER" subtitle="COMMANDER'S INTENT → PHASES → TASKS" actions={<button className="btn primary" onClick={save}><Save size={15}/> SAVE STRATEGY</button>}/>}<div className="grid g2"><div className="card form"><div className="form-grid"><Input label="OPERATION NAME" value={local.name} onChange={v=>setLocal(x=>({...x,name:v}))}/><Input label="COMMANDER'S INTENT" value={local.intent} onChange={v=>setLocal(x=>({...x,intent:v}))}/></div><label className="field"><span>GLOBAL ORDERS</span><textarea value={local.orders} onChange={e=>setLocal(x=>({...x,orders:e.target.value}))}/></label><div className="callout"><Target size={15}/> Every phase should map to a stage map and at least one squad task.</div></div><div className="card"><div className="section-head"><h3>Battle phases</h3><span>4 PHASES</span></div><div className="side-list">{[['01 — SETUP','Garrisons, nodes, defensive positions','green'],['02 — CONTACT','Absorb first push, identify armor','green'],['03 — ROTATE','Shift Bravo north on center pressure','yellow'],['04 — FINAL','Fallback network, counterattack on call','']].map(([a,b,t])=><div className="row" key={a}><div><b>{a}</b><small>{b}</small></div><Tag tone={t}>{t==='green'?'READY':t==='yellow'?'DRAFT':'DRAFT'}</Tag></div>)}</div></div></div><div className="card section"><div className="section-head"><h3>Squad tasks</h3><span>LINKED TO PHASES</span></div><table className="table"><thead><tr><th>SQUAD</th><th>PRIMARY TASK</th><th>PHASE</th><th>DEPENDENCY</th></tr></thead><tbody><tr><td><b>ALPHA</b></td><td>Own western sector; protect G1</td><td>01–02</td><td>Supply + fallback</td></tr><tr><td><b>BRAVO</b></td><td>Center line + armor reserve</td><td>01–04</td><td>Commander release</td></tr><tr><td><b>CHARLIE</b></td><td>Southern fallback / counterattack</td><td>02–04</td><td>G2 integrity</td></tr><tr><td><b>DELTA</b></td><td>Recon + arty coordination</td><td>01–03</td><td>Grid reporting</td></tr></tbody></table></div></div>}

function Maps({embedded=false}){return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="TACTICAL PLANNING" title="STAGE MAP EDITOR" subtitle="01 SETUP · 02 CONTACT · 03 ROTATE · 04 FINAL" actions={<><button className="btn" onClick={()=>alert('Marker tool active — click the map to place a marker.')}><Plus size={15}/> ADD MARKER</button><button className="btn primary" onClick={()=>alert('Map saved locally.') }><Save size={15}/> SAVE MAP</button></>}/>}<div className="tabs"><button className="active">01 SETUP</button><button>02 CONTACT</button><button>03 ROTATE</button><button>04 FINAL</button></div><div className="card map-wrap"><TacticalMap editor/></div><div className="grid g3 section"><div className="card stat"><div className="k">FRIENDLY PLACEMENTS</div><div className="v">17</div><div className="s">6 GARRISON / 5 SQUADS / 6 OTHER</div></div><div className="card stat"><div className="k">ROUTES</div><div className="v">8</div><div className="s">3 ATTACK · 5 SUPPORT</div></div><div className="card stat"><div className="k">OBJECTIVES</div><div className="v">4</div><div className="s">2 PRIMARY · 2 FALLBACK</div></div></div></div>}

function TacticalMap({compact=false,editor=false}){const [markers,setMarkers]=useState([{x:18,y:34,label:'G1',tone:'green'},{x:26,y:48,label:'E1',tone:'red'},{x:70,y:62,label:'O1',tone:'yellow'},{x:77,y:49,label:'M1',tone:'blue'},{x:51,y:70,label:'G2',tone:'green'}]); const [drag,setDrag]=useState(null); function moveMarker(i,e){const rect=e.currentTarget.getBoundingClientRect(); const x=Math.max(2,Math.min(96,((e.clientX-rect.left)/rect.width)*100)); const y=Math.max(2,Math.min(96,((e.clientY-rect.top)/rect.height)*100));setMarkers(m=>m.map((a,n)=>n===i?{...a,x,y}:a))} return <div className={`tactical-map ${compact?'compact':''}`} onPointerMove={e=>{if(drag!=null)moveMarker(drag,e)}} onPointerUp={()=>setDrag(null)}><div className="grid-overlay"/><div className="zone friendly"/><div className="zone contested"/><div className="zone rear"/><div className="river"/><div className="road road-a"/><div className="road road-b"/><div className="route route-a"/><div className="route route-b"/>{markers.map((m,i)=><div key={i} className={`marker ${m.tone}`} style={{left:`${m.x}%`,top:`${m.y}%`}} onPointerDown={()=>setDrag(i)}>{m.label}</div>)}{editor&&<div className="map-tools"><button><ArrowUpRight size={14}/></button><button><X size={14}/></button><button><Settings size={14}/></button><button><Save size={14}/></button></div>}<div className="legend"><span><i className="lg friend"/>FRIENDLY</span><span><i className="lg enemy"/>ENEMY</span><span><i className="lg obj"/>OBJECTIVE</span><span><i className="lg sup"/>SUPPORT</span></div><div className="map-grid-label">GRID // 042-A · CARANTAN</div></div>}

function Briefings({data,setData,embedded=false}){const [player,setPlayer]=useState(Object.keys(data.briefings)[0]||data.players[0]?.name||'Raven'); const [text,setText]=useState(data.briefings[player]||''); useEffect(()=>setText(data.briefings[player]||''),[player,data.briefings]); function publish(){setData(d=>({...d,briefings:{...d.briefings,[player]:text}}));alert(`Briefing published for ${player}.`)} return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="PLAYER COMMUNICATION" title="BRIEFING CENTER" subtitle="GLOBAL → SQUAD → INDIVIDUAL" actions={<button className="btn primary" onClick={publish}><Save size={15}/> PUBLISH BRIEFING</button>}/>}<div className="grid g2"><div className="card form"><div className="form-grid"><label className="field"><span>PLAYER</span><select value={player} onChange={e=>setPlayer(e.target.value)}>{data.players.map(p=><option key={p.id} value={p.name}>{p.name} — {p.role}</option>)}</select></label><Input label="SQUAD" value={data.players.find(p=>p.name===player)?.squad||'ALPHA'} onChange={()=>{}}/></div><label className="field"><span>MISSION</span><textarea value={text} onChange={e=>setText(e.target.value)}/></label><div className="checklist"><span className="field-title">CHECKLIST</span>{[['Stay within 100m of SL',true],['Build / maintain Garrison 2',true],['Establish fallback spawn',false],['Resupply AT',false]].map(([x,checked])=><label key={x}><input type="checkbox" defaultChecked={checked}/><span>{x}</span></label>)}</div></div><div className="card brief"><div className="eyebrow">PLAYER PREVIEW</div><h2>{player}</h2><div className="subtitle">{data.players.find(p=>p.name===player)?.squad?.toUpperCase()||'ALPHA'} · {data.players.find(p=>p.name===player)?.role?.toUpperCase()||'SUPPORT'} · PHASE 1</div><h4>Your mission</h4><p>{text}</p><h4>Map responsibilities</h4><p><Tag tone="green">G2</Tag> Supply priority · <Tag tone="yellow">ROUTE B</Tag> Fallback · <Tag tone="red">E1</Tag> Report contact</p><div className="callout"><MessageSquare size={15}/> Published briefings are visible to the assigned player on their dashboard.</div></div></div><div className="card section"><div className="section-head"><h3>Briefing coverage</h3><span>21/25 PUBLISHED</span></div><div className="brief-grid">{data.players.slice(0,10).map(p=><div key={p.id} className="brief-row"><div className="avatar sm">{p.name.slice(0,1)}</div><div><b>{p.name}</b><small>{p.squad} · {p.role}</small></div><Tag tone={data.briefings[p.name]?'green':'red'}>{data.briefings[p.name]?'PUBLISHED':'PENDING'}</Tag></div>)}</div></div></div>}

function Wiki({data,setData}){const [q,setQ]=useState(''); const [title,setTitle]=useState(''); const filtered=data.wiki.filter(r=>r.join(' ').toLowerCase().includes(q.toLowerCase())); function add(){if(!title.trim())return;setData(d=>({...d,wiki:[[title.trim(),'SOP',new Date().toISOString().slice(0,10),'Command'],...d.wiki]}));setTitle('')}return <><PageHead eyebrow="KNOWLEDGE BASE" title="CLAN WIKI" subtitle="REUSABLE MAPS · SOPs · TACTICS" actions={<button className="btn primary" onClick={add}><Plus size={15}/> NEW ARTICLE</button>}/><div className="grid g3"><Stat label="MAP PLAYBOOKS" value="12" sub="4 UPDATED THIS MONTH"/><Stat label="SOPs" value="27" sub="COMMAND / INF / ARMOR"/><Stat label="TACTICAL NOTES" value="83" sub="SEARCHABLE"/></div><div className="card section"><div className="toolbar"><div className="search"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search knowledge base…"/></div><div className="add-inline"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New article title"/><button className="btn" onClick={add}><Plus size={14}/></button></div></div><table className="table"><thead><tr><th>ARTICLE</th><th>CATEGORY</th><th>UPDATED</th><th>OWNER</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={i}><td><b>{r[0]}</b></td><td><Tag>{r[1]}</Tag></td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody></table></div></>}

function AAR({data,setData,embedded=false}){const [local,setLocal]=useState(data.aar);function save(){setData(d=>({...d,aar:local}));alert('AAR saved.');}return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="POST-MATCH" title="AFTER ACTION REVIEW" subtitle="CAPTURE LESSONS → IMPROVE THE NEXT OPERATION" actions={<button className="btn primary" onClick={save}><Save size={15}/> SAVE AAR</button>}/>}<div className="grid g4"><Stat label="RESULT" value={local.result} sub={local.score} trend/><Stat label="ATTENDANCE" value="24/25" sub="96%"/><Stat label="GARRISON SCORE" value="8/10" sub="GOOD"/><Stat label="COMMS" value="7/10" sub="IMPROVE"/></div><div className="grid g2 section"><div className="card form"><label className="field"><span>WHAT WORKED?</span><textarea value={local.worked} onChange={e=>setLocal(x=>({...x,worked:e.target.value}))}/></label><label className="field"><span>WHAT FAILED?</span><textarea value={local.failed} onChange={e=>setLocal(x=>({...x,failed:e.target.value}))}/></label></div><div className="card"><div className="section-head"><h3>Squad evaluation</h3></div><table className="table"><tbody>{[['Alpha','9/10','EXCELLENT','green'],['Bravo','7/10','ROTATION','yellow'],['Charlie','8/10','SOLID','green'],['Delta','6/10','COMMS','red']].map(([a,b,c,t])=><tr key={a}><td>{a}</td><td>{b}</td><td><Tag tone={t}>{c}</Tag></td></tr>)}</tbody></table></div></div></div>}

createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);

