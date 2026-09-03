import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, Archive, ArrowDownRight, ArrowLeft, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, ChevronDown, ClipboardCheck, Crosshair, FileText, Flag, Grid3X3, Hammer, Home,
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
        if(!cancelled){setData(local||seed);setClan({id:'demo-clan',name:'HLL Demo Clan',tag:'DEMO',role:'commander'});setLoading(false);}
        return;
      }
      setLoading(true);
      const {data:member,error:memberError}=await supabase
        .from('clan_members')
        .select('clan_id,role,callsign,clans(id,name,tag)')
        .eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
      if(memberError){ if(!cancelled){setError(memberError.message);setLoading(false);} return; }
      if(!member){ if(!cancelled){setNeedsOnboarding(true);setLoading(false);} return; }
      const clanInfo={id:member.clan_id,name:member.clans?.name||'Clan',tag:member.clans?.tag||'',role:member.role,callsign:member.callsign||user.user_metadata?.name||user.email?.split('@')[0]||'Player'};
      const {data:row,error:stateError}=await supabase.from('clan_app_state').select('data').eq('clan_id',member.clan_id).maybeSingle();
      if(stateError){ if(!cancelled){setError(stateError.message);setLoading(false);} return; }
      if(!cancelled){setClan(clanInfo);setData(row?.data || seed);setNeedsOnboarding(false);setLoading(false);}
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
    if(!supabase) { setClan({id:'demo-clan',name,tag,role:'commander'}); setNeedsOnboarding(false); return; }
    const {data:clanRow,error:clanError}=await supabase.from('clans').insert({name,tag,created_by:user.id}).select().single();
    if(clanError) throw clanError;
    const {error:memberError}=await supabase.from('clan_members').insert({clan_id:clanRow.id,user_id:user.id,role:'commander',callsign:user.user_metadata?.name||user.email?.split('@')[0]});
    if(memberError) throw memberError;
    const {error:stateError}=await supabase.from('clan_app_state').insert({clan_id:clanRow.id,data:seed});
    if(stateError) throw stateError;
    setClan({id:clanRow.id,name:clanRow.name,tag:clanRow.tag,role:'commander',callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'}); setData(seed); setNeedsOnboarding(false);
  }
  return {data,setData,clan,setClan,loading,error,needsOnboarding,createClan};
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
  if(store.needsOnboarding) return <Onboarding user={session.user} onCreate={store.createClan}/>;
  if(store.error) return <div className="splash"><Shield size={36}/><div><b>DATA CONNECTION ERROR</b><small>{store.error}</small></div></div>;
  return <Shell session={session} store={store}/>;
}

function Onboarding({user,onCreate}){
  const [name,setName]=useState(''); const [tag,setTag]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onCreate(name.trim(),tag.trim().toUpperCase());}catch(e){setError(e.message||'Could not create clan.')}finally{setBusy(false)}}
  return <div className="login"><div className="login-card"><div className="brand large">HLL // COMMAND<small>CLAN OPERATIONS HUB</small></div><div className="eyebrow">FIRST-TIME SETUP</div><h1>CREATE YOUR CLAN</h1><p>Welcome {user.user_metadata?.name || user.email}. Create the clan workspace that will hold your operations, players, maps and briefings.</p><form onSubmit={submit} className="stack"><label>Clan name<input value={name} onChange={e=>setName(e.target.value)} placeholder="7th Armored Division" required/></label><label>Clan tag<input value={tag} onChange={e=>setTag(e.target.value)} placeholder="7AD" maxLength={8} required/></label>{error&&<div className="error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?'CREATING…':'CREATE CLAN'} <Plus size={15}/></button></form></div></div>
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
    ['/', 'Dashboard', Home],['/operations','Operations',Swords],['/calendar','Calendar',CalendarDays],['/roster','Roster',Users],['/strategy','Strategies',Target],['/maps','Stage Maps',MapIcon],['/briefings','Briefings',FileText],['/wiki','Clan Wiki',BookOpen],['/aar','AAR',ClipboardCheck]
  ].map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setSidebar(false)} className={({isActive})=>isActive?'navitem active':'navitem'}><Icon size={17}/><span>{label}</span></NavLink>)}</nav><div className="side-bottom"><div className="online"><i/>SYSTEM ONLINE</div><div>{clan?.name || 'HLL Demo Clan'}</div><div className="muted">{supabase ? 'SUPABASE CONNECTED' : 'LOCAL DEMO MODE'}</div></div></aside><main><header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(v=>!v)}><Menu/></button><TopCrumb/><div className="top-right"><button className="iconbtn"><Bell size={16}/><em></em></button><button className="profile profile-clickable" onClick={()=>navigate('/profile')} title="Edit profile"><div className="avatar">{displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><span>{(clan?.role || DEMO_USER.role).toUpperCase()}</span></div></button><button className="iconbtn" onClick={logout} title="Log out"><LogOut size={15}/></button></div></header><div className="content"><Routes>
    <Route path="/" element={<Dashboard data={data}/>}/><Route path="/operations" element={<Operations data={data} setData={setData}/>}/><Route path="/operations/:id" element={<OperationDetail data={data} setData={setData}/>}/><Route path="/calendar" element={<Calendar data={data} setData={setData}/>}/><Route path="/roster" element={<Roster data={data} setData={setData}/>}/><Route path="/strategy" element={<Strategy data={data} setData={setData}/>}/><Route path="/maps" element={<Maps data={data} setData={setData}/>}/><Route path="/briefings" element={<Briefings data={data} setData={setData}/>}/><Route path="/wiki" element={<Wiki data={data} setData={setData}/>}/><Route path="/aar" element={<AAR data={data} setData={setData}/>}/><Route path="/profile" element={<Profile user={user} clan={clan} store={store}/>}/>
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

function Dashboard({data}){
  const op=data.ops[0]; const ready=data.players.filter(p=>p.status==='ready').length; const squads=[...new Set(data.players.map(p=>p.squad))];
  return <><PageHead eyebrow="CURRENT OPERATION // 042" title="CARANTAN — DEFENSE" subtitle="SAT 31 AUG 2026 · 20:00 CET · VS 4TH INFANTRY" actions={<><Link className="btn" to="/briefings">VIEW BRIEFING</Link><Link className="btn primary" to="/maps">OPEN TACTICAL MAP</Link></>}/><div className="grid g4"><Stat label="ATTENDANCE" value={op.attendance} sub="92% CONFIRMED" trend/><Stat label="SQUADS READY" value={`${squads.length}/${squads.length}`} sub="ALL ASSIGNED" trend/><Stat label="STRATEGY" value="READY" sub="REVISION 4" trend/><Stat label="BRIEFINGS" value={op.briefing} sub="4 PENDING"/></div><div className="grid g2 section"><div className="card"><div className="section-head"><h3>Operation overview</h3><span>LIVE</span></div><TacticalMap compact/></div><div className="card"><div className="section-head"><h3>Command board</h3><span>8 ITEMS</span></div><div className="side-list"><div className="row"><div><b>Defensive setup</b><small>Phase 1 · 19:30</small></div><Tag tone="green">READY</Tag></div><div className="row"><div><b>Garrison network</b><small>G1 / G2 / fallback</small></div><Tag tone="green">LOCKED</Tag></div><div className="row"><div><b>Armor reserve</b><small>Bravo tank section</small></div><Tag tone="yellow">PENDING</Tag></div><div className="row"><div><b>Player briefings</b><small>4 players outstanding</small></div><Tag tone="red">ACTION</Tag></div><div className="row"><div><b>Enemy notes</b><small>Updated 18:42</small></div><Tag>INTEL</Tag></div></div></div></div><div className="grid g3 section"><div className="card mini-card"><div className="mini-icon"><Radio size={18}/></div><div><b>COMMAND COMMS</b><small>Last action 18:42 — Delta reported armor north.</small></div></div><div className="card mini-card"><div className="mini-icon"><Flag size={18}/></div><div><b>OBJECTIVES</b><small>3 primary · 2 fallback · 1 reserve</small></div></div><div className="card mini-card"><div className="mini-icon"><Activity size={18}/></div><div><b>READINESS</b><small>{ready}/25 players confirmed across {squads.length} squads.</small></div></div></div></>
}

function Operations({data,setData}){
  const navigate=useNavigate();
  function newOp(){const id=String(40+data.ops.length+1).padStart(3,'0'); const op={id,name:'New Operation',opponent:'TBD',map:'TBD',mode:'Warfare',date:new Date().toISOString().slice(0,10),time:'20:00',status:'draft',strategy:'draft',briefing:'0/0',attendance:'0/0',commander:'Raven'};setData(d=>({...d,ops:[op,...d.ops]}));navigate(`/operations/${id}`)}
  return <><PageHead eyebrow="OPERATIONS" title="MATCH WORKSPACE" subtitle="ONE RECORD FOR EVERYTHING CONNECTED TO A MATCH" actions={<button className="btn primary" onClick={newOp}><Plus size={15}/> NEW OPERATION</button>}/><div className="grid g3"><Stat label="ACTIVE OPERATION" value="#042" sub="CARENTAN · DEFENSE" trend/><Stat label="NEXT EVENT" value="02 SEP" sub="GARRISON WORKSHOP"/><Stat label="OPEN ISSUES" value="4" sub="2 HIGH PRIORITY"/></div><div className="card section"><div className="section-head"><h3>All operations</h3><span>{data.ops.length} RECORDS</span></div><table className="table"><thead><tr><th>OPERATION</th><th>OPPONENT</th><th>MAP</th><th>DATE</th><th>READINESS</th><th>STATUS</th></tr></thead><tbody>{data.ops.map(op=><tr key={op.id} onClick={()=>navigate(`/operations/${op.id}`)} className="clickrow"><td><b>#{op.id}</b> {op.name}</td><td>{op.opponent}</td><td>{op.map}</td><td>{op.date} · {op.time}</td><td>{op.strategy==='ready'?<Tag tone="green">READY</Tag>:<Tag tone="yellow">DRAFT</Tag>}</td><td>{op.status==='active'?<Tag tone="green">ACTIVE</Tag>:<Tag>ARCHIVED</Tag>}</td></tr>)}</tbody></table></div></>
}

function OperationDetail({data,setData}){const {id}=useParams(); const op=data.ops.find(x=>x.id===id) || data.ops[0]; const [tab,setTab]=useState('overview'); const navigate=useNavigate(); const update=(patch)=>setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,...patch}:x)}));
 return <><PageHead eyebrow={`OPERATION #${op.id}`} title={op.name} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<button className="btn" onClick={()=>navigate('/operations')}><ArrowLeft size={15}/> BACK</button>}/><div className="tabs">{['overview','roster','strategy','maps','briefings','aar'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='overview'&&<div className="grid g3"><Stat label="ATTENDANCE" value={op.attendance} sub="LOCKED 23:40" trend/><Stat label="STRATEGY" value={op.strategy.toUpperCase()} sub="4 PHASES" trend/><Stat label="BRIEFINGS" value={op.briefing} sub="4 PENDING"/><div className="card section span2"><div className="section-head"><h3>Mission record</h3><span>EDITABLE</span></div><div className="form-grid"><Input label="OPPONENT" value={op.opponent} onChange={v=>update({opponent:v})}/><Input label="MAP" value={op.map} onChange={v=>update({map:v})}/><Input label="MODE" value={op.mode} onChange={v=>update({mode:v})}/><Input label="COMMANDER" value={op.commander} onChange={v=>update({commander:v})}/></div></div><div className="card section"><div className="section-head"><h3>Quick links</h3></div><div className="quick-links"><Link to="/strategy">Strategy editor <ArrowUpRight size={14}/></Link><Link to="/maps">Stage maps <MapIcon size={14}/></Link><Link to="/briefings">Briefing center <FileText size={14}/></Link></div></div></div>}{tab==='roster'&&<Roster data={data} setData={setData} embedded/>}{tab==='strategy'&&<Strategy data={data} setData={setData} embedded/>}{tab==='maps'&&<Maps data={data} setData={setData} embedded/>}{tab==='briefings'&&<Briefings data={data} setData={setData} embedded/>}{tab==='aar'&&<AAR data={data} setData={setData} embedded/>}</>
}
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

function Strategy({data,setData,embedded=false}){const [local,setLocal]=useState(data.strategy); useEffect(()=>setLocal(data.strategy),[data.strategy]); function save(){setData(d=>({...d,strategy:local}));alert('Strategy saved to local command database.')} return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="OPERATION 042" title="STRATEGY BUILDER" subtitle="COMMANDER'S INTENT → PHASES → TASKS" actions={<button className="btn primary" onClick={save}><Save size={15}/> SAVE STRATEGY</button>}/>}<div className="grid g2"><div className="card form"><div className="form-grid"><Input label="OPERATION NAME" value={local.name} onChange={v=>setLocal(x=>({...x,name:v}))}/><Input label="COMMANDER'S INTENT" value={local.intent} onChange={v=>setLocal(x=>({...x,intent:v}))}/></div><label className="field"><span>GLOBAL ORDERS</span><textarea value={local.orders} onChange={e=>setLocal(x=>({...x,orders:e.target.value}))}/></label><div className="callout"><Target size={15}/> Every phase should map to a stage map and at least one squad task.</div></div><div className="card"><div className="section-head"><h3>Battle phases</h3><span>4 PHASES</span></div><div className="side-list">{[['01 — SETUP','Garrisons, nodes, defensive positions','green'],['02 — CONTACT','Absorb first push, identify armor','green'],['03 — ROTATE','Shift Bravo north on center pressure','yellow'],['04 — FINAL','Fallback network, counterattack on call','']].map(([a,b,t])=><div className="row" key={a}><div><b>{a}</b><small>{b}</small></div><Tag tone={t}>{t==='green'?'READY':t==='yellow'?'DRAFT':'DRAFT'}</Tag></div>)}</div></div></div><div className="card section"><div className="section-head"><h3>Squad tasks</h3><span>LINKED TO PHASES</span></div><table className="table"><thead><tr><th>SQUAD</th><th>PRIMARY TASK</th><th>PHASE</th><th>DEPENDENCY</th></tr></thead><tbody><tr><td><b>ALPHA</b></td><td>Own western sector; protect G1</td><td>01–02</td><td>Supply + fallback</td></tr><tr><td><b>BRAVO</b></td><td>Center line + armor reserve</td><td>01–04</td><td>Commander release</td></tr><tr><td><b>CHARLIE</b></td><td>Southern fallback / counterattack</td><td>02–04</td><td>G2 integrity</td></tr><tr><td><b>DELTA</b></td><td>Recon + arty coordination</td><td>01–03</td><td>Grid reporting</td></tr></tbody></table></div></div>}

function Maps({embedded=false}){return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="TACTICAL PLANNING" title="STAGE MAP EDITOR" subtitle="01 SETUP · 02 CONTACT · 03 ROTATE · 04 FINAL" actions={<><button className="btn" onClick={()=>alert('Marker tool active — click the map to place a marker.')}><Plus size={15}/> ADD MARKER</button><button className="btn primary" onClick={()=>alert('Map saved locally.') }><Save size={15}/> SAVE MAP</button></>}/>}<div className="tabs"><button className="active">01 SETUP</button><button>02 CONTACT</button><button>03 ROTATE</button><button>04 FINAL</button></div><div className="card map-wrap"><TacticalMap editor/></div><div className="grid g3 section"><div className="card stat"><div className="k">FRIENDLY PLACEMENTS</div><div className="v">17</div><div className="s">6 GARRISON / 5 SQUADS / 6 OTHER</div></div><div className="card stat"><div className="k">ROUTES</div><div className="v">8</div><div className="s">3 ATTACK · 5 SUPPORT</div></div><div className="card stat"><div className="k">OBJECTIVES</div><div className="v">4</div><div className="s">2 PRIMARY · 2 FALLBACK</div></div></div></div>}

function TacticalMap({compact=false,editor=false}){const [markers,setMarkers]=useState([{x:18,y:34,label:'G1',tone:'green'},{x:26,y:48,label:'E1',tone:'red'},{x:70,y:62,label:'O1',tone:'yellow'},{x:77,y:49,label:'M1',tone:'blue'},{x:51,y:70,label:'G2',tone:'green'}]); const [drag,setDrag]=useState(null); function moveMarker(i,e){const rect=e.currentTarget.getBoundingClientRect(); const x=Math.max(2,Math.min(96,((e.clientX-rect.left)/rect.width)*100)); const y=Math.max(2,Math.min(96,((e.clientY-rect.top)/rect.height)*100));setMarkers(m=>m.map((a,n)=>n===i?{...a,x,y}:a))} return <div className={`tactical-map ${compact?'compact':''}`} onPointerMove={e=>{if(drag!=null)moveMarker(drag,e)}} onPointerUp={()=>setDrag(null)}><div className="grid-overlay"/><div className="zone friendly"/><div className="zone contested"/><div className="zone rear"/><div className="river"/><div className="road road-a"/><div className="road road-b"/><div className="route route-a"/><div className="route route-b"/>{markers.map((m,i)=><div key={i} className={`marker ${m.tone}`} style={{left:`${m.x}%`,top:`${m.y}%`}} onPointerDown={()=>setDrag(i)}>{m.label}</div>)}{editor&&<div className="map-tools"><button><ArrowUpRight size={14}/></button><button><X size={14}/></button><button><Settings size={14}/></button><button><Save size={14}/></button></div>}<div className="legend"><span><i className="lg friend"/>FRIENDLY</span><span><i className="lg enemy"/>ENEMY</span><span><i className="lg obj"/>OBJECTIVE</span><span><i className="lg sup"/>SUPPORT</span></div><div className="map-grid-label">GRID // 042-A · CARANTAN</div></div>}

function Briefings({data,setData,embedded=false}){const [player,setPlayer]=useState(Object.keys(data.briefings)[0]||data.players[0]?.name||'Raven'); const [text,setText]=useState(data.briefings[player]||''); useEffect(()=>setText(data.briefings[player]||''),[player,data.briefings]); function publish(){setData(d=>({...d,briefings:{...d.briefings,[player]:text}}));alert(`Briefing published for ${player}.`)} return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="PLAYER COMMUNICATION" title="BRIEFING CENTER" subtitle="GLOBAL → SQUAD → INDIVIDUAL" actions={<button className="btn primary" onClick={publish}><Save size={15}/> PUBLISH BRIEFING</button>}/>}<div className="grid g2"><div className="card form"><div className="form-grid"><label className="field"><span>PLAYER</span><select value={player} onChange={e=>setPlayer(e.target.value)}>{data.players.map(p=><option key={p.id} value={p.name}>{p.name} — {p.role}</option>)}</select></label><Input label="SQUAD" value={data.players.find(p=>p.name===player)?.squad||'ALPHA'} onChange={()=>{}}/></div><label className="field"><span>MISSION</span><textarea value={text} onChange={e=>setText(e.target.value)}/></label><div className="checklist"><span className="field-title">CHECKLIST</span>{[['Stay within 100m of SL',true],['Build / maintain Garrison 2',true],['Establish fallback spawn',false],['Resupply AT',false]].map(([x,checked])=><label key={x}><input type="checkbox" defaultChecked={checked}/><span>{x}</span></label>)}</div></div><div className="card brief"><div className="eyebrow">PLAYER PREVIEW</div><h2>{player}</h2><div className="subtitle">{data.players.find(p=>p.name===player)?.squad?.toUpperCase()||'ALPHA'} · {data.players.find(p=>p.name===player)?.role?.toUpperCase()||'SUPPORT'} · PHASE 1</div><h4>Your mission</h4><p>{text}</p><h4>Map responsibilities</h4><p><Tag tone="green">G2</Tag> Supply priority · <Tag tone="yellow">ROUTE B</Tag> Fallback · <Tag tone="red">E1</Tag> Report contact</p><div className="callout"><MessageSquare size={15}/> Published briefings are visible to the assigned player on their dashboard.</div></div></div><div className="card section"><div className="section-head"><h3>Briefing coverage</h3><span>21/25 PUBLISHED</span></div><div className="brief-grid">{data.players.slice(0,10).map(p=><div key={p.id} className="brief-row"><div className="avatar sm">{p.name.slice(0,1)}</div><div><b>{p.name}</b><small>{p.squad} · {p.role}</small></div><Tag tone={data.briefings[p.name]?'green':'red'}>{data.briefings[p.name]?'PUBLISHED':'PENDING'}</Tag></div>)}</div></div></div>}

function Wiki({data,setData}){const [q,setQ]=useState(''); const [title,setTitle]=useState(''); const filtered=data.wiki.filter(r=>r.join(' ').toLowerCase().includes(q.toLowerCase())); function add(){if(!title.trim())return;setData(d=>({...d,wiki:[[title.trim(),'SOP',new Date().toISOString().slice(0,10),'Command'],...d.wiki]}));setTitle('')}return <><PageHead eyebrow="KNOWLEDGE BASE" title="CLAN WIKI" subtitle="REUSABLE MAPS · SOPs · TACTICS" actions={<button className="btn primary" onClick={add}><Plus size={15}/> NEW ARTICLE</button>}/><div className="grid g3"><Stat label="MAP PLAYBOOKS" value="12" sub="4 UPDATED THIS MONTH"/><Stat label="SOPs" value="27" sub="COMMAND / INF / ARMOR"/><Stat label="TACTICAL NOTES" value="83" sub="SEARCHABLE"/></div><div className="card section"><div className="toolbar"><div className="search"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search knowledge base…"/></div><div className="add-inline"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New article title"/><button className="btn" onClick={add}><Plus size={14}/></button></div></div><table className="table"><thead><tr><th>ARTICLE</th><th>CATEGORY</th><th>UPDATED</th><th>OWNER</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={i}><td><b>{r[0]}</b></td><td><Tag>{r[1]}</Tag></td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody></table></div></>}

function AAR({data,setData,embedded=false}){const [local,setLocal]=useState(data.aar);function save(){setData(d=>({...d,aar:local}));alert('AAR saved.');}return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="POST-MATCH" title="AFTER ACTION REVIEW" subtitle="CAPTURE LESSONS → IMPROVE THE NEXT OPERATION" actions={<button className="btn primary" onClick={save}><Save size={15}/> SAVE AAR</button>}/>}<div className="grid g4"><Stat label="RESULT" value={local.result} sub={local.score} trend/><Stat label="ATTENDANCE" value="24/25" sub="96%"/><Stat label="GARRISON SCORE" value="8/10" sub="GOOD"/><Stat label="COMMS" value="7/10" sub="IMPROVE"/></div><div className="grid g2 section"><div className="card form"><label className="field"><span>WHAT WORKED?</span><textarea value={local.worked} onChange={e=>setLocal(x=>({...x,worked:e.target.value}))}/></label><label className="field"><span>WHAT FAILED?</span><textarea value={local.failed} onChange={e=>setLocal(x=>({...x,failed:e.target.value}))}/></label></div><div className="card"><div className="section-head"><h3>Squad evaluation</h3></div><table className="table"><tbody>{[['Alpha','9/10','EXCELLENT','green'],['Bravo','7/10','ROTATION','yellow'],['Charlie','8/10','SOLID','green'],['Delta','6/10','COMMS','red']].map(([a,b,c,t])=><tr key={a}><td>{a}</td><td>{b}</td><td><Tag tone={t}>{c}</Tag></td></tr>)}</tbody></table></div></div></div>}

createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);

