import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, Archive, ArrowDownRight, ArrowLeft, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, ChevronDown, ClipboardCheck, Copy, Crosshair, FileText, Flag, Grid3X3, Hammer, Home,
  LogIn, LogOut, Map as MapIcon, Menu, MessageSquare, Plus, Radio, Save, Search, Settings,
  AlertTriangle, Shield, Swords, Target, Users, X, Zap
} from 'lucide-react';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

async function logActivity(clanId, eventType, title, message=null, operationId=null, targetUserId=null, metadata={}){
  if(!supabase || !clanId) return;
  try{ await supabase.rpc('log_clan_activity',{p_clan_id:clanId,p_event_type:eventType,p_title:title,p_message:message,p_operation_id:operationId,p_target_user_id:targetUserId,p_metadata:metadata}); }catch(e){ console.warn('Activity log failed',e); }
}
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
    id:baseId, dbId:op.dbId||null, name:op.name||'New Operation', opponent:op.opponent||'TBD', map:op.map||'TBD', mode:op.mode||'Warfare',
    date:op.date||new Date().toISOString().slice(0,10), time:op.time||'20:00', status:op.status||'draft',
    strategy:op.strategy||'draft', briefing:op.briefing||'0/0', attendance:op.attendance||'0/0', commander:op.commander||'Command',
    attendanceByPlayer:op.attendanceByPlayer||{}, squads:op.squads||[
      {id:'alpha',name:'Alpha',lead:'',playerIds:[]},{id:'bravo',name:'Bravo',lead:'',playerIds:[]},
      {id:'charlie',name:'Charlie',lead:'',playerIds:[]},{id:'delta',name:'Delta',lead:'',playerIds:[]}
    ],
    strategyData:op.strategyData||{intent:'',orders:'',phases:DEFAULT_PHASES.map(p=>({...p,tasks:[]}))},
    stageMaps:op.stageMaps||DEFAULT_PHASES.map(p=>({phaseNo:p.no,name:p.name,markers:[]})),
    briefingsByPlayer:op.briefingsByPlayer||{},
    briefingReceipts:op.briefingReceipts||{},
    aarData:op.aarData||{result:'',score:'',worked:'',failed:'',lessons:''}
  };
}

function normalizeData(raw){
  const base=raw&&typeof raw==='object'?raw:seed;
  return {...seed,...base,ops:(Array.isArray(base.ops)?base.ops:seed.ops).map((op,i)=>makeOperation(op,i)),players:Array.isArray(base.players)?base.players:seed.players,events:Array.isArray(base.events)?base.events:seed.events,briefings:base.briefings||{},strategy:base.strategy||seed.strategy,wiki:Array.isArray(base.wiki)?base.wiki:seed.wiki,aar:base.aar||seed.aar};
}

async function syncOperationRelations({clanId,user,role,op,players}){
  if(!supabase || !clanId || !op) return;
  const command=['commander','co'].includes(role);
  const isPlayerRole=['player','recruit','squad_lead'].includes(role);
  const number=Number(op.id);
  if(!Number.isFinite(number)) return;
  const scheduledAt=op.date ? `${op.date}T${op.time||'20:00'}:00` : null;
  const baseRow={clan_id:clanId,number,name:op.name||'Untitled Operation',opponent:op.opponent||'',map_name:op.map||'',game_mode:op.mode||'Warfare',side:op.side||null,scheduled_at:scheduledAt,status:op.status||'draft',commander_id:players.find(p=>p.name===op.commander)?.memberUserId||user.id,strategy_status:op.strategyData?.intent?'ready':'draft',commander_intent:op.strategyData?.intent||'',global_orders:op.strategyData?.orders||'',created_by:user.id,updated_at:new Date().toISOString()};
  const {data:opRow,error:opError}=await supabase.from('operations').upsert(baseRow,{onConflict:'clan_id,number'}).select('id,number').single();
  if(opError) throw opError;
  if(!opRow) return;

  if(command){
    const squadRows=(op.squads||[]).map(s=>({operation_id:opRow.id,name:s.name,color:s.color||null,squad_lead_id:players.find(p=>p.id===s.lead||p.memberUserId===s.lead||p.name===s.lead)?.memberUserId||null}));
    if(squadRows.length){ const {error}=await supabase.from('squads').upsert(squadRows,{onConflict:'operation_id,name'}); if(error) throw error; }
    const {data:dbSquads,error:sqErr}=await supabase.from('squads').select('id,name,squad_lead_id').eq('operation_id',opRow.id); if(sqErr) throw sqErr;
    const squadIdByName=Object.fromEntries((dbSquads||[]).map(s=>[s.name,s.id]));
    const {error:delAssign}=await supabase.from('roster_assignments').delete().eq('operation_id',opRow.id); if(delAssign) throw delAssign;
    const assignments=players.filter(p=>p.memberUserId||p.id).map(p=>{
      const squad=(op.squads||[]).find(s=>(s.playerIds||[]).includes(p.id));
      return {operation_id:opRow.id,squad_id:squad?squadIdByName[squad.name]:null,user_id:p.memberUserId||p.id,role:p.role||'Rifleman',attendance:(op.attendanceByPlayer||{})[p.id]||'maybe',ready:p.status==='ready'};
    });
    if(assignments.length){ const {error}=await supabase.from('roster_assignments').insert(assignments); if(error) throw error; }

    const {data:oldPhases}=await supabase.from('strategy_phases').select('id').eq('operation_id',opRow.id);
    if(oldPhases?.length){ const {error}=await supabase.from('strategy_tasks').delete().in('phase_id',oldPhases.map(x=>x.id)); if(error) throw error; }
    { const {error}=await supabase.from('strategy_phases').delete().eq('operation_id',opRow.id); if(error) throw error; }
    const phaseRows=(op.strategyData?.phases||[]).map(p=>({operation_id:opRow.id,phase_no:p.no,title:p.name,summary:p.intent||'',status:p.intent?'ready':'draft'}));
    if(phaseRows.length){ const {error}=await supabase.from('strategy_phases').insert(phaseRows); if(error) throw error; }
    const {data:dbPhases,error:phErr}=await supabase.from('strategy_phases').select('id,phase_no').eq('operation_id',opRow.id); if(phErr) throw phErr;
    const phaseIdByNo=Object.fromEntries((dbPhases||[]).map(x=>[String(x.phase_no),x.id]));
    const taskRows=[];
    for(const phase of (op.strategyData?.phases||[])) for(const task of (phase.tasks||[])) if(String(task).trim()) taskRows.push({phase_id:phaseIdByNo[String(phase.no)],title:String(task).trim(),details:null,priority:2});
    if(taskRows.length){ const {error}=await supabase.from('strategy_tasks').insert(taskRows); if(error) throw error; }

    const {data:oldMaps}=await supabase.from('stage_maps').select('id').eq('operation_id',opRow.id);
    if(oldMaps?.length){ const {error}=await supabase.from('map_objects').delete().in('stage_map_id',oldMaps.map(x=>x.id)); if(error) throw error; }
    { const {error}=await supabase.from('stage_maps').delete().eq('operation_id',opRow.id); if(error) throw error; }
    const mapRows=(op.stageMaps||[]).map(m=>({operation_id:opRow.id,phase_no:m.phaseNo,name:m.name,map_image_url:m.mapImageUrl||null,version:m.version||1,published:!!m.published,created_by:user.id,updated_at:new Date().toISOString()}));
    if(mapRows.length){ const {error}=await supabase.from('stage_maps').insert(mapRows); if(error) throw error; }
    const {data:dbMaps,error:mapErr}=await supabase.from('stage_maps').select('id,phase_no').eq('operation_id',opRow.id); if(mapErr) throw mapErr;
    const mapIdByPhase=Object.fromEntries((dbMaps||[]).map(x=>[String(x.phase_no),x.id]));
    const objects=[];
    for(const m of (op.stageMaps||[])) for(const marker of (m.markers||[])) objects.push({stage_map_id:mapIdByPhase[String(m.phaseNo)],object_type:marker.type||'objective',label:marker.label||'',x:Number(marker.x)||0,y:Number(marker.y)||0,width:null,height:null,rotation:0,squad_id:null,player_id:null,metadata:{}});
    if(objects.length){ const {error}=await supabase.from('map_objects').insert(objects); if(error) throw error; }

    const briefingRows=Object.entries(op.briefingsByPlayer||{}).map(([pid,b])=>({operation_id:opRow.id,scope:'individual',squad_id:null,player_id:pid,title:b?.title||'',body:b?.body||'',checklist:b?.checklist||[],published_at:b?.published?b.publishedAt||new Date().toISOString():null,updated_by:user.id,updated_at:new Date().toISOString()})).filter(x=>x.player_id);
    if(briefingRows.length){ const {error}=await supabase.from('briefings').upsert(briefingRows,{onConflict:'operation_id,player_id'}); if(error) throw error; }
    if(op.aarData && Object.values(op.aarData).some(Boolean)){
      const {error}=await supabase.from('aars').upsert({operation_id:opRow.id,result:op.aarData.result||null,score:op.aarData.score||null,worked:op.aarData.worked||null,failed:op.aarData.failed||null,lessons_learned:op.aarData.lessons?[op.aarData.lessons]:[],created_by:user.id,updated_at:new Date().toISOString()},{onConflict:'operation_id'}); if(error) throw error;
    }
  } else if(isPlayerRole){
    const me=players.find(p=>p.memberUserId===user.id);
    if(me){
      const attendance=(op.attendanceByPlayer||{})[me.id]||'maybe';
      const {data:existing}=await supabase.from('roster_assignments').select('squad_id,role,ready').eq('operation_id',opRow.id).eq('user_id',user.id).maybeSingle();
      const {error}=await supabase.from('roster_assignments').upsert({operation_id:opRow.id,squad_id:existing?.squad_id||null,user_id:user.id,role:existing?.role||me.role||'Rifleman',attendance,ready:existing?.ready||false},{onConflict:'operation_id,user_id'}); if(error) throw error;
    }
  }
}

async function loadRelationalOperations(clanId,baseData,members){
  if(!supabase || !clanId) return {...baseData,players:members};
  const {data:ops,error:opError}=await supabase.from('operations').select('*').eq('clan_id',clanId).order('number',{ascending:false});
  if(opError) throw opError;
  if(!ops?.length) return {...baseData,players:members};
  const opIds=ops.map(o=>o.id);
  const [sq,ra,ph,sm,bf,aar]=await Promise.all([
    supabase.from('squads').select('*').in('operation_id',opIds),
    supabase.from('roster_assignments').select('*').in('operation_id',opIds),
    supabase.from('strategy_phases').select('*').in('operation_id',opIds).order('phase_no'),
    supabase.from('stage_maps').select('*').in('operation_id',opIds).order('phase_no'),
    supabase.from('briefings').select('*').in('operation_id',opIds),
    supabase.from('aars').select('*').in('operation_id',opIds)
  ]);
  for(const r of [sq,ra,ph,sm,bf,aar]) if(r.error) throw r.error;
  const briefingIds=(bf.data||[]).map(x=>x.id);
  const receiptQuery=briefingIds.length ? await supabase.from('briefing_receipts').select('*').in('briefing_id',briefingIds) : {data:[],error:null};
  if(receiptQuery.error) throw receiptQuery.error;
  const memberById=Object.fromEntries(members.map(m=>[m.id,m]));
  const squadByOp={}; for(const row of sq.data||[]) (squadByOp[row.operation_id]??=[]).push(row);
  const assignByOp={}; for(const row of ra.data||[]) (assignByOp[row.operation_id]??=[]).push(row);
  const phaseByOp={}; for(const row of ph.data||[]) (phaseByOp[row.operation_id]??=[]).push({...row,tasks:[]});
  const mapByOp={}; for(const row of sm.data||[]) (mapByOp[row.operation_id]??=[]).push({...row,markers:[]});
  const receiptByBrief=Object.fromEntries((receiptQuery.data||[]).map(r=>[r.briefing_id,r]));
  const briefByOp={}; for(const row of bf.data||[]){ const rec=receiptByBrief[row.id]; ((briefByOp[row.operation_id]??={})[row.player_id]={id:row.id,title:row.title||'',body:row.body||'',checklist:row.checklist||[],published:!!row.published_at,publishedAt:row.published_at||null,read:!!rec?.read_at,readAt:rec?.read_at||null,acknowledged:!!rec?.acknowledged_at,acknowledgedAt:rec?.acknowledged_at||null}); }
  const aarByOp=Object.fromEntries((aar.data||[]).map(row=>[row.operation_id,{result:row.result||'',score:row.score||'',worked:row.worked||'',failed:row.failed||'',lessons:Array.isArray(row.lessons_learned)?row.lessons_learned.join('\n'):''}]));
  const taskRows=await supabase.from('strategy_tasks').select('*').in('phase_id',(ph.data||[]).map(x=>x.id)); if(taskRows.error) throw taskRows.error;
  const tasksByPhase={}; for(const row of taskRows.data||[]) (tasksByPhase[row.phase_id]??=[]).push(row.title);
  const objectRows=await supabase.from('map_objects').select('*').in('stage_map_id',(sm.data||[]).map(x=>x.id)); if(objectRows.error) throw objectRows.error;
  const markersByMap={}; for(const row of objectRows.data||[]) (markersByMap[row.stage_map_id]??=[]).push({id:row.id,label:row.label||'',x:Number(row.x)||0,y:Number(row.y)||0,type:row.object_type||'objective'});
  const transformed=ops.map((row,i)=>{
    const assigns=assignByOp[row.id]||[];
    const squads=(squadByOp[row.id]||[]).map(s=>({id:s.id,name:s.name,lead:s.squad_lead_id||'',playerIds:assigns.filter(a=>a.squad_id===s.id).map(a=>a.user_id)}));
    const attendanceByPlayer=Object.fromEntries(assigns.map(a=>[a.user_id,a.attendance]));
    const playerSquadById=Object.fromEntries(assigns.map(a=>[a.user_id,squadByOp[row.id]?.find(s=>s.id===a.squad_id)?.name||'Unassigned']));
    const phases=(phaseByOp[row.id]||[]).map(p=>({...p,id:`p${p.phase_no}`,no:p.phase_no,name:p.title,intent:p.summary||'',tasks:tasksByPhase[p.id]||[]}));
    const stageMaps=(mapByOp[row.id]||[]).map(m=>({phaseNo:m.phase_no,name:m.name,mapImageUrl:m.map_image_url,version:m.version,published:m.published,markers:markersByMap[m.id]||[]}));
    const date=row.scheduled_at?new Date(row.scheduled_at).toISOString().slice(0,10):new Date().toISOString().slice(0,10);
    const time=row.scheduled_at?new Date(row.scheduled_at).toISOString().slice(11,16):'20:00';
    const commander=memberById[row.commander_id]?.name||'Command';
    return makeOperation({id:String(row.number).padStart(3,'0'),dbId:row.id,name:row.name,opponent:row.opponent,map:row.map_name,mode:row.game_mode,date,time,status:row.status,strategy:row.strategy_status,commander,attendanceByPlayer,squads,strategyData:{intent:row.commander_intent||'',orders:row.global_orders||'',phases:phases.length?phases:DEFAULT_PHASES.map(p=>({...p,tasks:[]}))},stageMaps:stageMaps.length?stageMaps:DEFAULT_PHASES.map(p=>({phaseNo:p.no,name:p.name,markers:[]})),briefingsByPlayer:briefByOp[row.id]||{},aarData:aarByOp[row.id]||{}},i);
  });
  return {...baseData,ops:transformed,players:members};
}

function buildMemberPlayers(members){
  return members.map(m=>({id:m.id,memberUserId:m.id,name:m.name,squad:'Unassigned',role:m.primary_role||m.role||'Rifleman',status:'ready'}));
}

function useClanStore(user){
  const [data,setData]=useState(seed);
  const [clan,setClan]=useState(null);
  const [loading,setLoading]=useState(!!supabase);
  const [error,setError]=useState('');
  const [needsOnboarding,setNeedsOnboarding]=useState(false);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      if(!supabase){
        const local=JSON.parse(localStorage.getItem('hll-command-data')||'null');
        if(!cancelled){setData(normalizeData(local||seed));setClan({id:'demo-clan',name:'HLL Demo Clan',tag:'DEMO',role:'commander'});setLoading(false);setHydrated(true);}
        return;
      }
      setLoading(true); setHydrated(false);
      const {data:member,error:memberError}=await supabase.from('clan_members').select('clan_id,role,callsign,primary_role,clans(id,name,tag,invite_code)').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
      if(memberError){ if(!cancelled){setError(memberError.message);setLoading(false);} return; }
      if(!member){ if(!cancelled){setNeedsOnboarding(true);setLoading(false);setHydrated(true);} return; }
      const {data:memberRows,error:membersError}=await supabase.from('clan_members').select('id,user_id,callsign,primary_role,role,active,profiles(display_name)').eq('clan_id',member.clan_id).eq('active',true).order('created_at');
      if(membersError){ if(!cancelled){setError(membersError.message);setLoading(false);} return; }
      const members=(memberRows||[]).map(m=>({id:m.user_id,name:m.callsign||m.profiles?.display_name||'Player',primary_role:m.primary_role,role:m.role}));
      const cloudPlayers=buildMemberPlayers(members);
      const clanInfo={id:member.clan_id,name:member.clans?.name||'Clan',tag:member.clans?.tag||'',inviteCode:member.clans?.invite_code||'',role:member.role,callsign:member.callsign||user.user_metadata?.name||user.email?.split('@')[0]||'Player'};
      const {data:row,error:stateError}=await supabase.from('clan_app_state').select('data').eq('clan_id',member.clan_id).maybeSingle();
      if(stateError){ if(!cancelled){setError(stateError.message);setLoading(false);} return; }
      try{
        const base=normalizeData(row?.data || {...seed,players:cloudPlayers});
        const merged=await loadRelationalOperations(member.clan_id,base,cloudPlayers);
        if(!cancelled){setClan(clanInfo);setData(merged);setNeedsOnboarding(false);setLoading(false);setHydrated(true);}
      }catch(loadError){ if(!cancelled){setError(loadError.message||String(loadError));setLoading(false);setHydrated(true);} }
    })();
    return ()=>{cancelled=true};
  },[user?.id]);

  useEffect(()=>{
    if(!clan || loading || !hydrated) return;
    const timer=setTimeout(async()=>{
      if(!supabase){localStorage.setItem('hll-command-data',JSON.stringify(data));return;}
      const {error:upsertError}=await supabase.from('clan_app_state').upsert({clan_id:clan.id,data,updated_at:new Date().toISOString()},{onConflict:'clan_id'});
      if(upsertError){setError(upsertError.message);return;}
      try{
        for(const op of data.ops||[]) await syncOperationRelations({clanId:clan.id,user,role:clan.role,op,players:data.players||[]});
      }catch(syncError){setError(syncError.message||String(syncError));}
    },900);
    return ()=>clearTimeout(timer);
  },[data,clan?.id,clan?.role,hydrated,user?.id]);

  useEffect(()=>{
    if(!supabase || !clan?.id) return;
    const channel=supabase.channel(`clan-state-${clan.id}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'clan_app_state',filter:`clan_id=eq.${clan.id}`},payload=>{if(payload.new?.data) setData(normalizeData(payload.new.data));})
      .subscribe();
    return ()=>{supabase.removeChannel(channel)};
  },[clan?.id]);

  async function createClan(name,tag){
    if(!supabase) {setClan({id:'demo-clan',name,tag,inviteCode:'demo1234',role:'commander',callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'});setNeedsOnboarding(false);return;}
    const {data:clanRow,error:clanError}=await supabase.from('clans').insert({name,tag,created_by:user.id}).select().single(); if(clanError) throw clanError;
    const callsign=user.user_metadata?.name||user.email?.split('@')[0]||'Player';
    const {error:memberError}=await supabase.from('clan_members').insert({clan_id:clanRow.id,user_id:user.id,role:'commander',callsign}); if(memberError) throw memberError;
    const empty={...seed,ops:[],events:[],players:[{id:user.id,memberUserId:user.id,name:callsign,squad:'Unassigned',role:'Commander',status:'ready'}],briefings:{},wiki:[],aar:{}};
    const {error:stateError}=await supabase.from('clan_app_state').insert({clan_id:clanRow.id,data:empty}); if(stateError) throw stateError;
    setClan({id:clanRow.id,name:clanRow.name,tag:clanRow.tag,inviteCode:clanRow.invite_code||'',role:'commander',callsign}); setData(empty); setNeedsOnboarding(false); setHydrated(true);
  }
  async function joinClan(inviteCode){
    if(!supabase){setClan({id:'demo-clan',name:'HLL Demo Clan',tag:'DEMO',inviteCode:'demo1234',role:'player',callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'});setNeedsOnboarding(false);return;}
    const {data:joined,error:joinError}=await supabase.rpc('join_clan_by_invite',{p_code:inviteCode}); if(joinError) throw joinError;
    const row=Array.isArray(joined)?joined[0]:joined; if(!row?.clan_id) throw new Error('Could not join clan.');
    const {data:stateRow,error:stateError}=await supabase.from('clan_app_state').select('data').eq('clan_id',row.clan_id).maybeSingle(); if(stateError) throw stateError;
    setClan({id:row.clan_id,name:row.clan_name,tag:row.clan_tag,inviteCode:inviteCode,role:row.member_role,callsign:user.user_metadata?.name||user.email?.split('@')[0]||'Player'}); setData(normalizeData(stateRow?.data||seed)); setNeedsOnboarding(false); setHydrated(true);
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

const ROLE_LABELS={commander:'COMMANDER',co:'CO',squad_lead:'SQUAD LEAD',player:'PLAYER',recruit:'RECRUIT'};
const ROLE_ORDER=['commander','co','squad_lead','player','recruit'];
function roleOf(clan){return clan?.role||'player'}
function canCommand(clan){return ['commander','co'].includes(roleOf(clan))}
function canManageMembers(clan){return roleOf(clan)==='commander'}
function canManageSquads(clan){return ['commander','co','squad_lead'].includes(roleOf(clan))}
function PermissionCard({clan,title='COMMAND ACCESS REQUIRED',text='This workspace is restricted to the appropriate command role.'}){return <div className="card section"><div className="eyebrow">ACCESS CONTROL</div><h2>{title}</h2><p className="subtitle">{text}</p><div className="callout"><Shield size={15}/> Your current role: <b>{ROLE_LABELS[roleOf(clan)]}</b></div></div>}

function Shell({session,store}){
  const {data,setData,clan}=store; const [sidebar,setSidebar]=useState(false); const [activityCount,setActivityCount]=useState(0); const user=session.user || DEMO_USER; const displayName=clan?.callsign || user.user_metadata?.name || user.email?.split('@')[0] || DEMO_USER.display_name;
  const navigate=useNavigate();
  useEffect(()=>{
    if(!supabase || !clan?.id){ setActivityCount(0); return; }
    let live=true;
    async function load(){ const since=new Date(Date.now()-60*60*1000).toISOString(); const {count}=await supabase.from('clan_activity').select('id',{count:'exact',head:true}).eq('clan_id',clan.id).gte('created_at',since); if(live)setActivityCount(count||0); }
    load();
    const channel=supabase.channel(`activity-badge-${clan.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'clan_activity',filter:`clan_id=eq.${clan.id}`},()=>{setActivityCount(c=>c+1)}).subscribe();
    return ()=>{live=false; supabase.removeChannel(channel)};
  },[clan?.id]);
  async function logout(){if(supabase) await supabase.auth.signOut(); else window.location.reload()}
  return <div className="app"><aside className={sidebar?'sidebar open':'sidebar'}><div className="brand">HLL // COMMAND<small>{clan?.tag ? `${clan.tag} · ` : ''}CLAN OPERATIONS HUB</small></div><nav>{[
    ['/', 'Dashboard', Home],['/my-operation','My Operation',Radio],['/operations','Operations',Swords],['/calendar','Calendar',CalendarDays],['/roster','Roster',Users],['/members','Members',Users],['/strategy','Strategies',Target],['/maps','Stage Maps',MapIcon],['/briefings','Briefings',FileText],['/activity','Command Feed',Activity],['/wiki','Clan Wiki',BookOpen],['/aar','AAR',ClipboardCheck]
  ].map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setSidebar(false)} className={({isActive})=>isActive?'navitem active':'navitem'}><Icon size={17}/><span>{label}</span></NavLink>)}</nav><div className="side-bottom"><div className="online"><i/>SYSTEM ONLINE</div><div>{clan?.name || 'HLL Demo Clan'}</div><div className="muted">{supabase ? 'SUPABASE CONNECTED' : 'LOCAL DEMO MODE'}</div></div></aside><main><header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(v=>!v)}><Menu/></button><TopCrumb/><div className="top-right"><button className="iconbtn" onClick={()=>navigate('/activity')} title="Command Feed"><Bell size={16}/>{activityCount>0&&<em className="activity-badge">{activityCount>99?'99+':activityCount}</em>}</button><button className="profile profile-clickable" onClick={()=>navigate('/profile')} title="Edit profile"><div className="avatar">{displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><span>{(clan?.role || DEMO_USER.role).toUpperCase()}</span></div></button><button className="iconbtn" onClick={logout} title="Log out"><LogOut size={15}/></button></div></header><div className="content"><Routes>
    <Route path="/" element={<Dashboard data={data} clan={clan}/>}/><Route path="/my-operation" element={<MyOperation data={data} setData={setData} user={user} clan={clan}/>}/><Route path="/operations" element={<Operations data={data} setData={setData} clan={clan}/>}/><Route path="/operations/:id" element={<OperationDetail data={data} setData={setData} user={user} clan={clan}/>}/><Route path="/calendar" element={<Calendar data={data} setData={setData}/>}/><Route path="/roster" element={<Roster data={data} setData={setData}/>}/><Route path="/members" element={<Members clan={clan} user={user} data={data} setClan={store.setClan}/>}/><Route path="/strategy" element={canCommand(clan)?<Strategy data={data} setData={setData}/>:<PermissionCard clan={clan} title="STRATEGY CONTROLLED" text="Commander and CO roles can build and publish clan strategy."/>}/><Route path="/maps" element={canCommand(clan)?<Maps data={data} setData={setData}/>:<PermissionCard clan={clan} title="STAGE MAPS CONTROLLED" text="Command roles manage the tactical map workspace."/>}/><Route path="/briefings" element={canCommand(clan)?<Briefings data={data} setData={setData}/>:<PermissionCard clan={clan} title="BRIEFINGS CONTROLLED" text="Command roles publish player briefings."/>}/><Route path="/activity" element={<ActivityFeed clan={clan} user={user} data={data}/>}/><Route path="/wiki" element={<Wiki data={data} setData={setData}/>}/><Route path="/aar" element={canCommand(clan)?<AAR data={data} setData={setData}/>:<PermissionCard clan={clan} title="AAR CONTROLLED" text="Command roles own the official after-action review."/>}/><Route path="/profile" element={<Profile user={user} clan={clan} store={store}/>}/>
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
function ActivityFeed({clan,user}){\n  const [items,setItems]=useState([]);\n  const [filter,setFilter]=useState('all');\n  const [loading,setLoading]=useState(true);\n  useEffect(()=>{\n    if(!supabase || !clan?.id){setItems([]);setLoading(false);return;}\n    let live=true;\n    async function load(){\n      const {data,error}=await supabase.from('clan_activity').select('*').eq('clan_id',clan.id).order('created_at',{ascending:false}).limit(60);\n      if(live){setItems(data||[]);setLoading(false);}\n      if(error) console.warn(error);\n    }\n    load();\n    const channel=supabase.channel(`command-feed-${clan.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'clan_activity',filter:`clan_id=eq.${clan.id}`},payload=>{setItems(prev=>[payload.new,...prev].slice(0,60))}).subscribe();\n    return ()=>{live=false;supabase.removeChannel(channel)};\n  },[clan?.id]);\n  const filtered=items.filter(x=>filter==='all'||(filter==='briefings'&&x.event_type.startsWith('briefing'))||(filter==='operations'&&x.event_type.startsWith('operation'))||(filter==='personnel'&&(x.event_type.startsWith('member')||x.event_type.startsWith('attendance')||x.event_type.startsWith('squad'))));\n  const labelFor=(t)=>({operation_created:'OPERATION',operation_status:'OPERATION',briefing_published:'BRIEFING',briefing_read:'BRIEFING',briefing_ack:'BRIEFING',attendance_changed:'ATTENDANCE',squad_change:'SQUAD',member_role:'PERSONNEL'})[t]||'COMMAND';\n  const toneFor=(t)=>t==='briefing_ack'?'green':t==='briefing_read'||t==='briefing_published'?'yellow':t==='operation_created'||t==='operation_status'?'green':t==='member_role'?'yellow':'';\n  return <>\n    <PageHead eyebrow="COMMAND / ACTIVITY" title="COMMAND FEED" subtitle="LIVE CLAN EVENTS · READINESS · PLAYER ACTIONS" actions={<Tag tone="green">LIVE</Tag>}/>\n    <div className="tabs activity-tabs"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>ALL</button><button className={filter==='operations'?'active':''} onClick={()=>setFilter('operations')}>OPERATIONS</button><button className={filter==='briefings'?'active':''} onClick={()=>setFilter('briefings')}>BRIEFINGS</button><button className={filter==='personnel'?'active':''} onClick={()=>setFilter('personnel')}>PERSONNEL</button></div>\n    <div className="card section">\n      <div className="section-head"><div><h3>Live event stream</h3><small>NEWEST EVENTS FIRST · REALTIME</small></div><span>{filtered.length} EVENTS</span></div>\n      {loading?<div className="empty-state"><p className="muted">Loading command feed…</p></div>:filtered.length? <div className="activity-list">{filtered.map(item=><div className="activity-item" key={item.id}><div className={`activity-dot ${toneFor(item.event_type)}`}></div><div className="activity-main"><div className="activity-top"><Tag tone={toneFor(item.event_type)}>{labelFor(item.event_type)}</Tag><time>{new Date(item.created_at).toLocaleString()}</time></div><b>{item.title}</b><p>{item.message||'Command activity recorded.'}</p>{item.operation_id&&<small>OPERATION LINKED</small>}</div></div>)}</div>:<div className="empty-state"><Activity size={22}/><h2>No activity yet</h2><p className="muted">Operation, briefing and player actions will appear here.</p></div>}\n    </div>\n  </>\n}\n\nfunction PageHead({eyebrow,title,subtitle,actions}){return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><div className="subtitle">{subtitle}</div></div><div className="actions">{actions}</div></div>}
function Stat({label,value,sub,trend}){return <div className="card stat"><div className="k">{label}</div><div className="v">{value}</div><div className={trend?'s trend':'s'}>{sub}</div></div>}
function Tag({children,tone=''}){return <span className={`tag ${tone}`}>{children}</span>}

function MyOperation({data,setData,user,clan}){
  const navigate=useNavigate();
  const op=data.ops.find(o=>o.status==='active')||data.ops[0];
  const player=currentPlayer(data,user,clan);
  const status=player&&op?(op.attendanceByPlayer||{})[player.id]||'pending':'pending';
  const squad=player?playerSquadForOperation(op,player.id):'Unassigned';
  const localBrief=player?(op?.briefingsByPlayer||{})[player.id]:null;
  const [serverBrief,setServerBrief]=useState(null);
  const [receiptBusy,setReceiptBusy]=useState(false);
  const [receiptError,setReceiptError]=useState('');

  useEffect(()=>{
    let cancelled=false;
    async function loadBriefing(){
      setServerBrief(null); setReceiptError('');
      if(!supabase||!op||!user?.id) return;
      let operationUuid = op.dbId || null;
      if(!operationUuid && /^\d+$/.test(String(op.id))) {
        const {data:opRow,error:opErr}=await supabase.from('operations').select('id').eq('clan_id',clan?.id).eq('number',Number(op.id)).maybeSingle();
        if(opErr){if(!cancelled)setReceiptError(opErr.message);return;}
        operationUuid=opRow?.id||null;
      }
      if(!operationUuid){ return; }
      const {data:rows,error}=await supabase.from('briefings').select('id,operation_id,player_id,title,body,checklist,published_at').eq('operation_id',operationUuid).eq('player_id',user.id).eq('scope','individual').order('updated_at',{ascending:false}).limit(1);
      if(error){if(!cancelled)setReceiptError(error.message);return;}
      const b=rows?.[0];
      if(!b){if(!cancelled)setServerBrief(null);return;}
      const {data:receipt,error:receiptErr}=await supabase.from('briefing_receipts').select('read_at,acknowledged_at').eq('briefing_id',b.id).eq('player_id',user.id).maybeSingle();
      if(receiptErr){if(!cancelled)setReceiptError(receiptErr.message);return;}
      if(!cancelled)setServerBrief({id:b.id,title:b.title||'MISSION BRIEF',body:b.body||'',published:!!b.published_at,read:!!receipt?.read_at,readAt:receipt?.read_at||null,acknowledged:!!receipt?.acknowledged_at,acknowledgedAt:receipt?.acknowledged_at||null});
    }
    loadBriefing();
    return ()=>{cancelled=true};
  },[op?.id,op?.dbId,user?.id,clan?.id]);

  const brief=serverBrief || localBrief;
  const phase=(op?.strategyData?.phases||DEFAULT_PHASES).find(p=>p.status==='active')||(op?.strategyData?.phases||DEFAULT_PHASES).find(p=>p.intent)||DEFAULT_PHASES[0];

  if(!op) return <div className="card"><h2>NO ACTIVE OPERATION</h2><p className="subtitle">Your commander has not created an operation yet.</p><button className="btn" onClick={()=>navigate('/operations')}>OPEN OPERATIONS</button></div>;

  function respond(next){
    let pid=player?.id;
    if(!pid){pid=crypto.randomUUID?.()||Math.random().toString(36).slice(2);setData(d=>({...d,players:[...d.players,{id:pid,memberUserId:user.id,name:clan?.callsign||user.email?.split('@')[0]||'Player',squad:'Unassigned',role:'Rifleman',status:'ready'}]}));}
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,attendanceByPlayer:{...(x.attendanceByPlayer||{}),[pid]:next}}:x)}));
  }

  async function markReceipt(action){
    if(!brief?.id||!user?.id||!supabase)return;
    setReceiptBusy(true); setReceiptError('');
    const {data:row,error}=await supabase.rpc('set_briefing_receipt',{p_briefing_id:brief.id,p_action:action});
    setReceiptBusy(false);
    if(error){setReceiptError(error.message);return;}
    const next={
      ...(brief||{}),
      read:!!row?.read_at,
      readAt:row?.read_at||null,
      acknowledged:!!row?.acknowledged_at,
      acknowledgedAt:row?.acknowledged_at||null
    };
    setServerBrief(next);
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,briefingsByPlayer:{...(x.briefingsByPlayer||{}),[player.id]:{...(x.briefingsByPlayer?.[player.id]||{}),...next}}}:x)}));
  }

  const briefingState=brief?.acknowledged?'ACKNOWLEDGED':brief?.read?'READ':brief?.published?'UNREAD':'PENDING';
  return <>
    <PageHead eyebrow={`PLAYER CONSOLE // OPERATION #${op.id}`} title={op.name} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<Tag tone={status==='going'?'green':status==='declined'?'red':'yellow'}>{status.toUpperCase()}</Tag>}/>
    <div className="grid g4"><Stat label="ATTENDANCE" value={status.toUpperCase()} sub="YOUR RESPONSE" trend={status==='going'}/><Stat label="SQUAD" value={squad} sub={player?.role||'ROLE NOT SET'}/><Stat label="CURRENT PHASE" value={String(phase.no).padStart(2,'0')} sub={phase.name}/><Stat label="BRIEFING" value={briefingState} sub="INDIVIDUAL MISSION" trend={!!brief?.acknowledged}/></div>
    <div className="grid g2 section">
      <div className="card form"><div className="eyebrow">YOUR ATTENDANCE</div><h2>REPORT AVAILABILITY</h2><p className="subtitle">Your commander uses this response to build squads and readiness.</p><div className="actions"><button className={status==='going'?'btn primary':'btn'} onClick={()=>respond('going')}><Check size={15}/> GOING</button><button className={status==='maybe'?'btn primary':'btn'} onClick={()=>respond('maybe')}>MAYBE</button><button className={status==='declined'?'btn primary':'btn'} onClick={()=>respond('declined')}>DECLINE</button></div><div className="callout"><Radio size={15}/> Attendance is saved to this operation and visible to command.</div></div>
      <div className="card brief"><div className="eyebrow">YOUR INDIVIDUAL BRIEFING</div><h2>{brief?.title||'NOT PUBLISHED YET'}</h2><div className="subtitle">{squad.toUpperCase()} · {(player?.role||'RIFLEMAN').toUpperCase()}</div>{brief?.published?<><p>{brief.body||'No mission text has been written yet.'}</p><div className="status-line"><Tag tone={brief.acknowledged?'green':brief.read?'yellow':'red'}>{brief.acknowledged?'ACKNOWLEDGED':brief.read?'READ':'UNREAD'}</Tag></div><div className="actions">{!brief.read&&<button type="button" className="btn" disabled={receiptBusy} onClick={()=>markReceipt('read')}>{receiptBusy?'SAVING…':'MARK AS READ'}</button>} {!brief.acknowledged&&<button type="button" className="btn primary" disabled={receiptBusy} onClick={()=>markReceipt('acknowledge')}><Check size={15}/> ACKNOWLEDGE ORDERS</button>}</div>{receiptError&&<div className="error">{receiptError}</div>}<div className="callout"><ClipboardCheck size={15}/> Acknowledging confirms you have read your mission orders.</div></>:<><p>Your squad assignment and mission brief will appear here once command publishes them.</p><Tag tone="yellow">WAITING FOR COMMAND</Tag></>}</div>
    </div>
    <div className="grid g2 section">
      <div className="card"><div className="section-head"><h3>Command plan</h3><span>PHASE {String(phase.no).padStart(2,'0')}</span></div><div className="side-list"><div className="row"><div><b>Commander intent</b><small>{op.strategyData?.intent||'Not published yet.'}</small></div></div><div className="row"><div><b>Your phase task</b><small>{phase.tasks?.length?phase.tasks.join(' · '):'No task assigned yet.'}</small></div></div><div className="row"><div><b>Global orders</b><small>{op.strategyData?.orders||'No global orders published yet.'}</small></div></div></div></div>
      <div className="card"><div className="section-head"><h3>Operation navigation</h3><span>FULL WORKSPACE</span></div><div className="actions"><button className="btn" onClick={()=>navigate(`/operations/${op.id}`)}>OPEN OPERATION</button><button className="btn" onClick={()=>navigate(`/operations/${op.id}`)}>VIEW STAGE MAPS</button></div><div className="callout"><MessageSquare size={15}/> Keep this page open for live command changes and the latest mission briefing.</div></div>
    </div>
  </>;
}

function Dashboard({data,clan}){
  const op=data.ops.find(o=>o.status==='active') || data.ops[0];
  const command=canCommand(clan);
  const navigate=useNavigate();
  if(!op){
    return <><PageHead eyebrow="COMMAND CENTER" title="NO OPERATION" subtitle="CREATE THE NEXT MATCH WORKSPACE" actions={command?<Link className="btn primary" to="/operations">OPEN OPERATIONS</Link>:null}/><div className="card section empty-state"><div className="eyebrow">STANDBY</div><h2>No operation has been created yet.</h2><p className="subtitle">Once command creates the next match, this room becomes the live control board.</p></div></>;
  }

  const readiness=operationReadiness(op,data);
  const attendance=op.attendanceByPlayer||{};
  const players=data.players||[];
  const responded=players.filter(p=>attendance[p.id]).length;
  const going=players.filter(p=>attendance[p.id]==='going');
  const maybe=players.filter(p=>attendance[p.id]==='maybe');
  const declined=players.filter(p=>attendance[p.id]==='declined');
  const assignedIds=new Set((op.squads||[]).flatMap(s=>s.playerIds||[]));
  const unassigned=going.filter(p=>!assignedIds.has(p.id));
  const briefings=op.briefingsByPlayer||{};
  const publishedBriefings=going.filter(p=>briefings[p.id]?.published).length;
  const phases=op.strategyData?.phases||[];
  const activePhase=phases.find(p=>p.status==='active')||phases.find(p=>p.intent)||phases[0];
  const squadRows=(op.squads||[]).map(s=>{
    const members=players.filter(p=>(s.playerIds||[]).includes(p.id));
    const ready=members.filter(p=>attendance[p.id]==='going');
    const lead=players.find(p=>p.id===s.lead || p.memberUserId===s.lead || p.name===s.lead);
    return { ...s, members, ready, lead };
  });
  const alerts=[];
  if(responded<players.length) alerts.push({tone:'yellow',title:'Attendance incomplete',detail:`${players.length-responded} players have not responded.`});
  if(unassigned.length) alerts.push({tone:'red',title:'Players without squads',detail:`${unassigned.length} going players still need assignment.`});
  if(readiness.checks.find(c=>c.key==='strategy'&&!c.ok)) alerts.push({tone:'yellow',title:'Strategy not locked',detail:'Command intent, orders or phases are still incomplete.'});
  if(publishedBriefings<going.length) alerts.push({tone:'yellow',title:'Briefings pending',detail:`${going.length-publishedBriefings} going players are missing a published briefing.`});
  if(op.status==='draft') alerts.unshift({tone:'yellow',title:'Operation is still draft',detail:'Deployment remains manually gated by command.'});
  const alertTone=alerts.some(a=>a.tone==='red')?'red':alerts.length?'yellow':'green';

  if(!command){
    return <><PageHead eyebrow={`PLAYER CONSOLE // OPERATION #${op.id}`} title={op.name.toUpperCase()} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<Link className="btn primary" to="/my-operation">MY OPERATION <ArrowUpRight size={14}/></Link>}/><div className="grid g4"><Stat label="ATTENDANCE" value={attendance[data.players.find(p=>p.id===data.currentPlayerId)?.id]||'PENDING'} sub="YOUR RESPONSE"/><Stat label="SQUAD" value={data.players.find(p=>p.id===data.currentPlayerId)?.squad||'UNASSIGNED'} sub="CURRENT ASSIGNMENT"/><Stat label="PHASE" value={String(activePhase?.no||1).padStart(2,'0')} sub={activePhase?.name||'SETUP'}/><Stat label="BRIEFING" value={data.players.find(p=>briefings[p.id])?'READY':'PENDING'} sub="INDIVIDUAL MISSION"/></div><div className="grid g2 section"><div className="card"><div className="section-head"><h3>Operation status</h3><span>{op.status.toUpperCase()}</span></div><div className="side-list"><div className="row"><div><b>Deployment readiness</b><small>{readiness.percent}% of command gates complete</small></div><Tag tone={alertTone}>{readiness.percent}%</Tag></div><div className="row"><div><b>Players going</b><small>{going.length} confirmed · {maybe.length} maybe · {declined.length} declined</small></div></div><div className="row"><div><b>Current phase</b><small>Phase {String(activePhase?.no||1).padStart(2,'0')} · {activePhase?.name||'SETUP'}</small></div></div></div></div><div className="card"><div className="section-head"><h3>Your mission</h3><span>PLAYER VIEW</span></div><div className="brief"><h2>{briefings[players.find(p=>p.memberUserId===undefined)?.id]?.title||'OPEN MY OPERATION'}</h2><p>Attendance, squad assignment, stage maps and your personal briefing are all available from My Operation.</p><Link className="btn primary" to="/my-operation">OPEN MY OPERATION</Link></div></div></div></>;
  }

  return <>
    <PageHead eyebrow={`COMMAND CONTROL ROOM // OPERATION #${op.id}`} title={op.name.toUpperCase()} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<><Tag tone={op.status==='active'?'green':'yellow'}>{op.status.toUpperCase()}</Tag><Link className="btn primary" to={`/operations/${op.id}`}>OPEN COMMAND WORKSPACE <ArrowUpRight size={14}/></Link></>}/>
    <div className="control-strip">
      <div><span>DEPLOYMENT READINESS</span><b>{readiness.percent}%</b><div className="readiness-bar compact"><span style={{width:`${readiness.percent}%`}}/></div></div>
      <div><span>GOING</span><b>{going.length}/{players.length}</b><small>{maybe.length} MAYBE · {declined.length} DECLINED</small></div>
      <div><span>SQUADS</span><b>{squadRows.length}</b><small>{unassigned.length ? `${unassigned.length} UNASSIGNED` : 'ALL GOING ASSIGNED'}</small></div>
      <div><span>BRIEFINGS</span><b>{publishedBriefings}/{going.length}</b><small>{going.length-publishedBriefings} PENDING</small></div>
    </div>

    <div className="grid control-main section">
      <div className="control-col">
        <div className="card">
          <div className="section-head"><div><h3>Command alerts</h3><small>{alerts.length ? `${alerts.length} ITEMS NEED ATTENTION` : 'NO BLOCKING ITEMS'}</small></div><Tag tone={alertTone}>{alerts.length?'ACTION':'GREEN'}</Tag></div>
          <div className="side-list">{alerts.length?alerts.map((a,i)=><div className="alert-row" key={i}><Tag tone={a.tone}>{a.tone==='red'?'BLOCK':'CHECK'}</Tag><div><b>{a.title}</b><small>{a.detail}</small></div></div>):<div className="empty-inline"><Check size={16}/><div><b>All current control checks are clear.</b><small>Keep monitoring attendance and readiness before launch.</small></div></div>}</div>
        </div>
        <div className="card section">
          <div className="section-head"><div><h3>Squad readiness</h3><small>GOING PLAYERS BY ASSIGNMENT</small></div><Link className="btn" to={`/operations/${op.id}`}>MANAGE</Link></div>
          <div className="squad-grid">{squadRows.map(s=><div className={`squad-status ${s.members.length?'filled':''}`} key={s.id}><div className="squad-top"><b>{s.name}</b><Tag tone={s.ready.length===s.members.length && s.members.length?'green':'yellow'}>{s.ready.length}/{s.members.length}</Tag></div><div className="squad-meta">{s.lead?`SL · ${s.lead.name}`:'NO SL ASSIGNED'}</div><div className="squad-members">{s.members.length?s.members.map(p=><span key={p.id} className={attendance[p.id]==='going'?'ready':''}>{p.name}</span>):<span className="muted">EMPTY SQUAD</span>}</div></div>)}</div>
        </div>
      </div>
      <div className="control-col">
        <div className="card">
          <div className="section-head"><div><h3>Deployment gates</h3><small>WORKFLOW STATUS</small></div><Tag tone={readiness.percent===100?'green':readiness.percent>=60?'yellow':'red'}>{readiness.percent}%</Tag></div>
          <div className="gate-list">{readiness.checks.map(c=><div className="gate-row" key={c.key}><div className={`gate-icon ${c.ok?'ok':''}`}>{c.ok?'✓':'!'}</div><div><b>{c.label}</b><small>{c.detail}</small></div><Tag tone={c.ok?'green':'yellow'}>{c.ok?'READY':'PENDING'}</Tag></div>)}</div>
        </div>
        <div className="card section">
          <div className="section-head"><div><h3>Mission timeline</h3><small>COMMAND WORKFLOW</small></div><span>PHASE {String(activePhase?.no||1).padStart(2,'0')}</span></div>
          <div className="timeline">{[['01','ATTENDANCE',`${responded}/${players.length} RESPONDED`,responded===players.length],['02','SQUADS',`${going.length-unassigned.length}/${going.length} ASSIGNED`,unassigned.length===0&&going.length>0],['03','STRATEGY',`${phases.filter(p=>p.intent&&p.tasks?.length).length}/${phases.length||4} READY`,readiness.checks.find(c=>c.key==='strategy')?.ok],['04','STAGE MAPS',`${(op.stageMaps||[]).filter(m=>(m.markers||[]).length).length}/${(op.stageMaps||[]).length||4} MAPPED`,readiness.checks.find(c=>c.key==='maps')?.ok],['05','BRIEFINGS',`${publishedBriefings}/${going.length} PUBLISHED`,publishedBriefings===going.length&&going.length>0]].map(([n,label,detail,done])=><div className="timeline-row" key={n}><span className={`timeline-dot ${done?'done':''}`}>{done?'✓':n}</span><div><b>{label}</b><small>{detail}</small></div></div>)}</div>
        </div>
      </div>
    </div>
    <div className="card section command-next"><div><div className="eyebrow">NEXT COMMAND ACTION</div><h3>{alerts[0]?.title || 'Operation is fully prepared'}</h3><p>{alerts[0]?.detail || 'All major deployment gates are green. Open the operation workspace to activate or archive the operation.'}</p></div><div className="actions"><Link className="btn" to={`/operations/${op.id}`}>OPEN WORKSPACE</Link>{op.status==='draft'&&readiness.percent===100?<Link className="btn primary" to={`/operations/${op.id}`}>ACTIVATE OPERATION</Link>:<Link className="btn primary" to={`/operations/${op.id}`}>CONTINUE COMMAND</Link>}</div></div>
  </>;
}

function Operations({data,setData,clan}){
  const command=canCommand(clan);
  const navigate=useNavigate();
  const [creating,setCreating]=useState(false);
  const [draft,setDraft]=useState({name:'',opponent:'',map:'',mode:'Warfare',date:new Date().toISOString().slice(0,10),time:'20:00'});
  function create(){
    if(!command || !draft.name.trim()||!draft.map.trim()) return;
    const id=String(40+data.ops.length+1).padStart(3,'0');
    const op=makeOperation({...draft,id,commander:'Command'} ,0);
    setData(d=>({...d,ops:[op,...d.ops]}));
    setCreating(false); setDraft({name:'',opponent:'',map:'',mode:'Warfare',date:new Date().toISOString().slice(0,10),time:'20:00'});
    navigate(`/operations/${id}`);
  }
  return <>
    <PageHead eyebrow="OPERATIONS" title="MATCH WORKSPACE" subtitle="ONE RECORD FOR EVERYTHING CONNECTED TO A MATCH" actions={command?<button className="btn primary" onClick={()=>setCreating(v=>!v)}><Plus size={15}/> NEW OPERATION</button>:<Tag tone="yellow">READ ONLY</Tag>}/>
    {creating&&<div className="card section"><div className="section-head"><h3>New operation</h3><span>CREATE MISSION RECORD</span></div><div className="form-grid"><Input label="OPERATION NAME" value={draft.name} onChange={v=>setDraft(x=>({...x,name:v}))} placeholder="Carentan — Defense"/><Input label="OPPONENT" value={draft.opponent} onChange={v=>setDraft(x=>({...x,opponent:v}))} placeholder="4th Infantry"/><Input label="MAP" value={draft.map} onChange={v=>setDraft(x=>({...x,map:v}))} placeholder="Carentan"/><Input label="MODE" value={draft.mode} onChange={v=>setDraft(x=>({...x,mode:v}))} placeholder="Warfare"/><label className="field"><span>DATE</span><input type="date" value={draft.date} onChange={e=>setDraft(x=>({...x,date:e.target.value}))}/></label><label className="field"><span>TIME</span><input type="time" value={draft.time} onChange={e=>setDraft(x=>({...x,time:e.target.value}))}/></label></div><div className="actions"><button className="btn" onClick={()=>setCreating(false)}>CANCEL</button><button className="btn primary" onClick={create}><Check size={15}/> CREATE OPERATION</button></div></div>}
    <div className="grid g3"><Stat label="ACTIVE OPERATIONS" value={data.ops.filter(o=>o.status==='active').length} sub="LIVE MATCH WORKSPACES" trend/><Stat label="NEXT EVENT" value={data.events[0]?.date?.slice(5)||'—'} sub={data.events[0]?.title||'NO EVENT'}/><Stat label="TOTAL RECORDS" value={data.ops.length} sub="MATCH HISTORY"/></div>
    <div className="card section"><div className="section-head"><h3>All operations</h3><span>{data.ops.length} RECORDS</span></div><table className="table"><thead><tr><th>OPERATION</th><th>OPPONENT</th><th>MAP</th><th>DATE</th><th>READINESS</th><th>STATUS</th></tr></thead><tbody>{data.ops.map(op=><tr key={op.id} onClick={()=>navigate(`/operations/${op.id}`)} className="clickrow"><td><b>#{op.id}</b> {op.name}</td><td>{op.opponent}</td><td>{op.map}</td><td>{op.date} · {op.time}</td><td>{op.strategyData?.intent?<Tag tone="green">READY</Tag>:<Tag tone="yellow">DRAFT</Tag>}</td><td>{op.status==='active'?<Tag tone="green">ACTIVE</Tag>:op.status==='draft'?<Tag tone="yellow">DRAFT</Tag>:<Tag>ARCHIVED</Tag>}</td></tr>)}</tbody></table></div>
  </>
}


function operationReadiness(op,data){
  const players=(data.players||[]).filter(p=>p.memberUserId||p.id);
  const attendance=op?.attendanceByPlayer||{};
  const going=players.filter(p=>attendance[p.id]==='going');
  const responded=players.filter(p=>attendance[p.id]);
  const squads=op?.squads||[];
  const assignedIds=new Set(squads.flatMap(s=>s.playerIds||[]));
  const phases=op?.strategyData?.phases||[];
  const maps=op?.stageMaps||[];
  const briefs=op?.briefingsByPlayer||{};
  const checks=[
    {key:'attendance',label:'PLAYER READINESS',detail:`${responded.length}/${players.length} responded`,ok:players.length>0&&responded.length===players.length},
    {key:'squads',label:'SQUAD ASSIGNMENT',detail:`${going.filter(p=>assignedIds.has(p.id)).length}/${going.length||0} going players assigned`,ok:going.length>0&&going.every(p=>assignedIds.has(p.id))},
    {key:'strategy',label:'STRATEGY',detail:`${phases.filter(p=>p.intent&&p.tasks?.length).length}/${phases.length||4} phases ready`,ok:!!op?.strategyData?.intent&&!!op?.strategyData?.orders&&phases.length>=4&&phases.every(p=>p.intent&&p.tasks?.length)},
    {key:'maps',label:'STAGE MAPS',detail:`${maps.filter(m=>(m.markers||[]).length).length}/${maps.length||4} phases mapped`,ok:maps.length>=4&&maps.every(m=>(m.markers||[]).length>0)},
    {key:'briefings',label:'BRIEFINGS',detail:`${going.filter(p=>briefs[p.id]?.published).length}/${going.length||0} published`,ok:going.length>0&&going.every(p=>briefs[p.id]?.published)}
  ];
  const ready=checks.filter(c=>c.ok).length;
  return {checks,percent:Math.round((ready/checks.length)*100)};
}

function OperationReadiness({op,data,command,onActivate}){
  const r=operationReadiness(op,data);
  return <div className="card section readiness-card">
    <div className="section-head"><div><h3>Deployment readiness</h3><small>COMMAND GATE · OPERATION WORKFLOW</small></div><Tag tone={r.percent===100?'green':r.percent>=60?'yellow':'red'}>{r.percent}% READY</Tag></div>
    <div className="readiness-bar"><span style={{width:`${r.percent}%`}}/></div>
    <div className="readiness-grid">
      {r.checks.map(c=><div className={`readiness-item ${c.ok?'ok':'pending'}`} key={c.key}>
        <div className="readiness-icon">{c.ok?'✓':'!'}</div>
        <div><b>{c.label}</b><small>{c.detail}</small></div>
        <Tag tone={c.ok?'green':'yellow'}>{c.ok?'READY':'PENDING'}</Tag>
      </div>)}
    </div>
    {command && op.status==='draft' && <div className="readiness-footer"><div><b>{r.percent===100?'All deployment gates are green.':'Finish the pending gates before launch.'}</b><small>Activation remains manual; readiness is your command safety check.</small></div><button className="btn primary" onClick={onActivate}><Radio size={15}/> ACTIVATE OPERATION</button></div>}
    {op.status==='active' && <div className="readiness-footer active"><div><b>OPERATION ACTIVE</b><small>Use the tabs below to manage the live mission workspace.</small></div><Tag tone="green">LIVE</Tag></div>}
    {op.status==='archived' && <div className="readiness-footer"><div><b>OPERATION ARCHIVED</b><small>Historical record retained for reference and AAR.</small></div><Tag>ARCHIVED</Tag></div>}
  </div>;
}

function OperationDetail({data,setData,user,clan}){
  const {id}=useParams(); const navigate=useNavigate();
  const op=data.ops.find(x=>x.id===id);
  const [tab,setTab]=useState('overview');
  const command=canCommand(clan); const squadManager=canManageSquads(clan);
  if(!op) return <div className="card"><h2>Operation not found</h2><button className="btn" onClick={()=>navigate('/operations')}><ArrowLeft size={15}/> BACK</button></div>;
  const update=(patch)=>setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,...patch}:x)}));
  const nested=()=>{setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?makeOperation(x):x)}))};
  const attendanceValues=Object.values(op.attendanceByPlayer||{}); const going=attendanceValues.filter(v=>v==='going').length; const responded=attendanceValues.length;
  const playersWithIds=data.players.filter(p=>p.memberUserId||p.id);
  return <>
    <PageHead eyebrow={`OPERATION #${op.id}`} title={op.name} subtitle={`${op.map} · ${op.mode} · ${op.date} · ${op.time} · VS ${op.opponent}`} actions={<><Tag tone={op.status==='active'?'green':op.status==='archived'?'':'yellow'}>{op.status.toUpperCase()}</Tag>{command&&<button className="btn" onClick={()=>update({status:op.status==='draft'?'active':op.status==='active'?'archived':'draft'})}>{op.status==='draft'?'ACTIVATE':op.status==='active'?'ARCHIVE':'REOPEN'}</button>}<button className="btn" onClick={()=>navigate('/operations')}><ArrowLeft size={15}/> BACK</button></>}/>
    <div className="tabs">{['overview','attendance','squads','strategy','stage maps','briefings','aar'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
    {tab==='overview'&&(command?<><OperationReadiness op={op} data={data} command={command} onActivate={()=>update({status:'active'})}/><div className="grid g3">
      <Stat label="ATTENDANCE" value={`${going}/${responded}`} sub="RESPONDED / GOING" trend/><Stat label="SQUADS" value={(op.squads||[]).length} sub="ASSIGNMENT GROUPS"/><Stat label="BRIEFINGS" value={`${Object.values(op.briefingsByPlayer||{}).filter(b=>b?.published).length}/${data.players.length}`} sub="PUBLISHED"/>
      <div className="card section span2"><div className="section-head"><h3>Mission record</h3><span>EDITABLE</span></div><div className="form-grid"><Input label="OPERATION NAME" value={op.name} onChange={v=>update({name:v})}/><Input label="OPPONENT" value={op.opponent} onChange={v=>update({opponent:v})}/><Input label="MAP" value={op.map} onChange={v=>update({map:v})}/><Input label="MODE" value={op.mode} onChange={v=>update({mode:v})}/><label className="field"><span>DATE</span><input type="date" value={op.date} onChange={e=>update({date:e.target.value})}/></label><label className="field"><span>TIME</span><input type="time" value={op.time} onChange={e=>update({time:e.target.value})}/></label></div><div className="actions"><button className="btn" onClick={()=>update({status:op.status==='active'?'draft':'active'})}>{op.status==='active'?'SET DRAFT':'ACTIVATE OPERATION'}</button><button className="btn" onClick={nested}>PREPARE WORKSPACE</button></div></div>
      <div className="card section"><div className="section-head"><h3>Command flow</h3></div><div className="side-list">{[['1','Players sign up','attendance'],['2','Squads assigned','squads'],['3','Strategy locked','strategy'],['4','Stage maps','stage maps'],['5','Individual briefings','briefings'],['6','AAR','aar']].map(([n,label,t])=><button className="row row-button" key={t} onClick={()=>setTab(t)}><div><b>{n}. {label}</b><small>Open workspace</small></div><ArrowUpRight size={14}/></button>)}</div></div>
    </div></>:<PermissionCard clan={clan} title="COMMAND WORKSPACE" text="Use My Operation for your player view. Command roles can edit the operation record and workflow."/>)}
    {tab==='attendance'&&<OperationAttendance op={op} data={data} setData={setData} user={user} clan={clan}/>} 
    {tab==='squads'&&(squadManager?<OperationSquads op={op} data={data} setData={setData} clan={clan}/>:<PermissionCard clan={clan} title="SQUAD MANAGEMENT" text="Only Command and Squad Leads can assign players to squads."/>)} 
    {tab==='strategy'&&(command?<OperationStrategy op={op} setData={setData}/>:<PermissionCard clan={clan} title="STRATEGY CONTROLLED" text="Commander and CO roles can edit the operation strategy."/>)} 
    {tab==='stage maps'&&(command?<OperationStageMaps op={op} setData={setData}/>:<PermissionCard clan={clan} title="STAGE MAPS CONTROLLED" text="Commander and CO roles manage stage maps."/>)} 
    {tab==='briefings'&&(command?<OperationBriefings op={op} data={data} setData={setData} user={user}/>:<PermissionCard clan={clan} title="BRIEFINGS CONTROLLED" text="Commander and CO roles publish player briefings."/>)} 
    {tab==='aar'&&(command?<OperationAAR op={op} setData={setData}/>:<PermissionCard clan={clan} title="AAR CONTROLLED" text="Commander and CO roles own the official AAR."/>)} 
  </>
}

function currentPlayer(data,user,clan){
  return data.players.find(p=>p.memberUserId===user?.id)||data.players.find(p=>p.name===clan?.callsign)||null;
}

function playerSquadForOperation(op,pid){
  const s=(op?.squads||[]).find(q=>(q.playerIds||[]).includes(pid));
  return s?.name || 'Unassigned';
}

function OperationAttendance({op,data,setData,user,clan}){
  const player=currentPlayer(data,user,clan); const [name,setName]=useState(clan?.callsign||user?.email?.split('@')[0]||'Player');
  function join(){
    let pid=player?.id;
    if(!pid){pid=crypto.randomUUID?.()||Math.random().toString(36).slice(2); setData(d=>({...d,players:[...d.players,{id:pid,memberUserId:user.id,name:name.trim()||'Player',squad:'Unassigned',role:'Rifleman',status:'ready'}]}));}
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,attendanceByPlayer:{...(x.attendanceByPlayer||{}),[pid]:'going'}}:x)}));
    logActivity(clan?.id,'attendance_changed','Attendance updated',`${clan?.callsign||player?.name||'Player'} marked GOING for operation #${op.id}`,op.dbId||null,user?.id||null,{status:'going'});
  }
  const statuses=op.attendanceByPlayer||{};
  const roster=data.players.filter(p=>p.memberUserId||statuses[p.id]);
  return <div className="grid g2"><div className="card form"><div className="eyebrow">YOUR RESPONSE</div><h2>ATTENDANCE</h2><p className="subtitle">Confirm whether you will attend this operation.</p>{!player&&<label className="field"><span>IN-GAME NAME</span><input value={name} onChange={e=>setName(e.target.value)}/></label>}<div className="actions"><button className="btn primary" onClick={join}>GOING</button><button className="btn" onClick={()=>joinStatus('maybe')}>MAYBE</button><button className="btn" onClick={()=>joinStatus('declined')}>DECLINE</button></div><div className="callout"><Check size={15}/> Your response is saved to this operation.</div></div><div className="card"><div className="section-head"><h3>Attendance board</h3><span>{Object.values(statuses).filter(s=>s==='going').length} GOING</span></div><table className="table"><thead><tr><th>PLAYER</th><th>SQUAD</th><th>RESPONSE</th></tr></thead><tbody>{roster.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{playerSquadForOperation(op,p.id)}</td><td><Tag tone={statuses[p.id]==='going'?'green':statuses[p.id]==='declined'?'red':'yellow'}>{(statuses[p.id]||'PENDING').toUpperCase()}</Tag></td></tr>)}</tbody></table></div></div>;
  function joinStatus(status){ let pid=player?.id; if(!pid){pid=crypto.randomUUID?.()||Math.random().toString(36).slice(2); setData(d=>({...d,players:[...d.players,{id:pid,memberUserId:user.id,name:name.trim()||'Player',squad:'Unassigned',role:'Rifleman',status:'ready'}]}));} setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,attendanceByPlayer:{...(x.attendanceByPlayer||{}),[pid]:status}}:x)})); logActivity(clan?.id,'attendance_changed','Attendance updated',`${clan?.callsign||'Player'} marked ${status.toUpperCase()} for operation #${op.id}`,op.dbId||null,user?.id||null,{status}); }
}

function OperationSquads({op,data,setData,clan}){
  const manage=canManageSquads(clan);
  const squads=op.squads||[];
  const roster=data.players.filter(p=>p.memberUserId||p.id);
  const [selectedPlayer,setSelectedPlayer]=useState('');

  function currentSquad(pid){
    return squads.find(s=>(s.playerIds||[]).includes(pid));
  }

  function assign(pid,sid){
    if(!manage)return;
    const player=data.players.find(p=>p.id===pid);
    const from=currentSquad(pid);
    const to=squads.find(s=>s.id===sid);
    const action = sid ? `${player?.name||'Player'} → ${to?.name||'Squad'}` : `${player?.name||'Player'} unassigned`;
    const stamp={id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),action,time:new Date().toISOString()};
    setData(d=>({
      ...d,
      ops:d.ops.map(x=>x.id!==op.id?x:{...x,
        squads:(x.squads||[]).map(s=>({...s,playerIds:s.id===sid?[...new Set([...(s.playerIds||[]),pid])]:(s.playerIds||[]).filter(id=>id!==pid)})),
        squadChanges:[stamp,...(x.squadChanges||[])].slice(0,20)
      })
    }));
    logActivity(clan?.id,'squad_change','Squad assignment changed',action,op.dbId||null,player?.memberUserId||player?.id||null,{from:from?.name||'Unassigned',to:to?.name||'Unassigned'});
    setSelectedPlayer('');
  }

  function addSquad(){
    if(!manage)return;
    const name=`Squad ${squads.length+1}`;
    const newSquad={id:`s${Date.now()}`,name,lead:'',playerIds:[]};
    const stamp={id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),action:`Created ${name}`,time:new Date().toISOString()};
    setData(d=>({
      ...d,
      ops:d.ops.map(x=>x.id===op.id?{...x,squads:[...(x.squads||[]),newSquad],squadChanges:[stamp,...(x.squadChanges||[])].slice(0,20)}:x)
    }));
  }

  function renameSquad(sid,name){
    if(!manage)return;
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,squads:(x.squads||[]).map(q=>q.id===sid?{...q,name}:q)}:x)}));
  }

  const unassigned=roster.filter(p=>!currentSquad(p.id));
  const going=roster.filter(p=>op.attendanceByPlayer?.[p.id]==='going');

  return <>
    <PageHead
      eyebrow={`OPERATION #${op.id}`}
      title="LIVE SQUAD BOARD"
      subtitle="FLEXIBLE ASSIGNMENTS — CHANGE ANYTIME"
      actions={<><Tag tone="green">LIVE</Tag>{manage&&<button className="btn primary" onClick={addSquad}><Plus size={15}/> ADD SQUAD</button>}</>}
    />

    <div className="callout section-callout"><AlertTriangle size={15}/><div><b>NO HARD LOCK</b><span>Last-minute swaps are expected. Changes are tracked automatically so command can see what moved and when.</span></div></div>

    <div className="grid g4 section">
      <Stat label="GOING" value={going.length} sub="CONFIRMED FOR OP" trend/>
      <Stat label="ASSIGNED" value={going.filter(p=>currentSquad(p.id)).length} sub="GOING WITH SQUAD"/>
      <Stat label="UNASSIGNED" value={unassigned.length} sub="READY FOR PLACEMENT"/>
      <Stat label="SQUADS" value={squads.length} sub="ACTIVE GROUPS"/>
    </div>

    <div className="grid g2">
      <div className="card section">
        <div className="section-head"><h3>Squads</h3><span>LIVE BOARD</span></div>
        <div className="squad-board">
          {squads.map(s=>{
            const members=(s.playerIds||[]).map(pid=>data.players.find(p=>p.id===pid)).filter(Boolean);
            return <div className="squad-card" key={s.id}>
              <div className="squad-card-head">
                {manage ? <input className="squad-name-input" value={s.name} onChange={e=>renameSquad(s.id,e.target.value)}/> : <b>{s.name}</b>}
                <Tag tone="green">{members.length}</Tag>
              </div>
              <select value={s.lead||''} onChange={e=>setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,squads:(x.squads||[]).map(q=>q.id===s.id?{...q,lead:e.target.value}:q)}:x)}))}>
                <option value="">Squad Lead — unassigned</option>
                {members.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div className="player-list compact">
                {members.length?members.map(p=><div className="player-row" key={p.id}><div><b>{p.name}</b><small>{p.role||'Rifleman'} · {op.attendanceByPlayer?.[p.id]||'pending'}</small></div>{manage&&<button className="mini-btn" onClick={()=>assign(p.id,'')} title="Remove from squad">×</button>}</div>):<span className="muted">No players assigned.</span>}
              </div>
            </div>
          })}
          {!squads.length&&<div className="empty">No squads yet. Add one to start planning.</div>}
        </div>
      </div>

      <div className="card section">
        <div className="section-head"><h3>Quick assignment</h3><span>{unassigned.length} UNASSIGNED</span></div>
        <div className="quick-assign">
          <label className="field"><span>PLAYER</span><select value={selectedPlayer} onChange={e=>setSelectedPlayer(e.target.value)}><option value="">Select player</option>{roster.map(p=><option key={p.id} value={p.id}>{p.name} · {op.attendanceByPlayer?.[p.id]||'pending'}</option>)}</select></label>
          <div className="quick-grid">{squads.map(s=><button className="btn" key={s.id} disabled={!selectedPlayer} onClick={()=>assign(selectedPlayer,s.id)}>MOVE TO {s.name}</button>)}</div>
          <button className="btn" disabled={!selectedPlayer} onClick={()=>assign(selectedPlayer,'')}>UNASSIGN PLAYER</button>
        </div>
        <div className="section-head change-head"><h3>Last-minute change log</h3><span>{(op.squadChanges||[]).length} RECENT</span></div>
        <div className="change-log">{(op.squadChanges||[]).map(c=><div className="change-item" key={c.id}><div><b>{c.action}</b><small>{new Date(c.time).toLocaleString()}</small></div><Tag tone="green">LIVE</Tag></div>)}{!(op.squadChanges||[]).length&&<span className="muted">No squad changes recorded yet.</span>}</div>
      </div>
    </div>
  </>;
}

function OperationStrategy({op,setData}){const local=op.strategyData||{intent:'',orders:'',phases:DEFAULT_PHASES}; function updateStrategy(patch){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,strategyData:{...local,...patch},strategy:'ready'}:x)}));} function updatePhase(id,patch){const phases=local.phases.map(p=>p.id===id?{...p,...patch}:p);updateStrategy({phases});} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="STRATEGY" subtitle="COMMANDER'S INTENT → PHASES → TASKS" actions={<Tag tone={local.intent?'green':'yellow'}>{local.intent?'DRAFT READY':'INCOMPLETE'}</Tag>}/><div className="grid g2"><div className="card form"><Input label="COMMANDER'S INTENT" value={local.intent} onChange={v=>updateStrategy({intent:v})} placeholder="What must this operation achieve?"/><label className="field"><span>GLOBAL ORDERS</span><textarea value={local.orders} onChange={e=>updateStrategy({orders:e.target.value})} placeholder="Rules, priorities, triggers, fallback conditions…"/></label></div><div className="card"><div className="section-head"><h3>Battle phases</h3><span>4 PHASES</span></div><div className="side-list">{local.phases.map(p=><div className="row" key={p.id}><div><b>{String(p.no).padStart(2,'0')} — {p.name}</b><small>{p.intent||'No phase intent yet.'}</small></div><Tag tone={p.intent?'green':'yellow'}>{p.intent?'READY':'DRAFT'}</Tag></div>)}</div></div></div><div className="card section"><div className="section-head"><h3>Phase editor</h3><span>SAVE AS YOU TYPE</span></div>{local.phases.map(p=><div className="phase-editor" key={p.id}><div className="phase-title"><Tag tone="green">{String(p.no).padStart(2,'0')}</Tag><b>{p.name}</b></div><Input label="PHASE INTENT" value={p.intent} onChange={v=>updatePhase(p.id,{intent:v})}/><Input label="PRIMARY TASKS" value={(p.tasks||[]).join(' · ')} onChange={v=>updatePhase(p.id,{tasks:v.split('·').map(x=>x.trim()).filter(Boolean)})}/></div>)}</div></div>}

function OperationStageMaps({op,setData}){const maps=op.stageMaps||DEFAULT_PHASES.map(p=>({phaseNo:p.no,name:p.name,markers:[]})); const [phase,setPhase]=useState(1); const current=maps.find(m=>m.phaseNo===phase)||maps[0]; function setMap(patch){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,stageMaps:x.stageMaps.map(m=>m.phaseNo===current.phaseNo?{...m,...patch}:m)}:x)}));} function addMarker(){const markers=[...(current.markers||[]),{id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),label:`M${(current.markers||[]).length+1}`,x:50,y:50,type:'objective'}];setMap({markers});} function move(i,x,y){setMap({markers:current.markers.map((m,n)=>n===i?{...m,x,y}:m)});} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="STAGE MAPS" subtitle="BUILD THE PLAN PHASE BY PHASE" actions={<button className="btn primary" onClick={addMarker}><Plus size={15}/> ADD MARKER</button>}/><div className="tabs">{maps.map(m=><button key={m.phaseNo} className={phase===m.phaseNo?'active':''} onClick={()=>setPhase(m.phaseNo)}>{String(m.phaseNo).padStart(2,'0')} {m.name}</button>)}</div><div className="card map-wrap"><OperationMapCanvas map={current} onMove={move}/></div><div className="grid g3 section"><Stat label="MARKERS" value={current.markers?.length||0} sub="TACTICAL OBJECTS"/><Stat label="PHASE" value={String(current.phaseNo).padStart(2,'0')} sub={current.name}/><Stat label="STATUS" value={current.markers?.length?'READY':'DRAFT'} sub="SAVED TO OPERATION"/></div></div>}
function OperationMapCanvas({map,onMove}){const [drag,setDrag]=useState(null); return <div className="tactical-map" onPointerMove={e=>{if(drag===null)return;const r=e.currentTarget.getBoundingClientRect();const x=Math.max(2,Math.min(96,(e.clientX-r.left)/r.width*100));const y=Math.max(2,Math.min(96,(e.clientY-r.top)/r.height*100));onMove(drag,x,y)}} onPointerUp={()=>setDrag(null)}><div className="grid-overlay"/><div className="zone friendly"/><div className="zone contested"/><div className="zone rear"/><div className="river"/><div className="road road-a"/><div className="road road-b"/>{(map.markers||[]).map((m,i)=><div className="marker yellow" key={m.id} style={{left:`${m.x}%`,top:`${m.y}%`}} onPointerDown={()=>setDrag(i)}>{m.label}</div>)}<div className="legend"><span><i className="lg friend"/>FRIENDLY</span><span><i className="lg enemy"/>ENEMY</span><span><i className="lg obj"/>OBJECTIVE</span></div><div className="map-grid-label">GRID // OP-{map.phaseNo} · {map.name}</div></div>}

function OperationBriefings({op,data,setData,user}){const ids=data.players.map(p=>p.id); const [pid,setPid]=useState(ids[0]||''); const player=data.players.find(p=>p.id===pid)||data.players[0]; const existing=op.briefingsByPlayer?.[pid]||{title:'Mission briefing',body:'',checklist:['Know your route','Confirm role with SL','Report contact with grid'],published:false}; function update(patch){setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,briefingsByPlayer:{...(x.briefingsByPlayer||{}),[pid]:{...existing,...patch}}}:x)}));} function publish(){update({published:true,publishedAt:new Date().toISOString()});} return <div><PageHead eyebrow={`OPERATION #${op.id}`} title="INDIVIDUAL BRIEFINGS" subtitle="ONE BRIEF PER PLAYER" actions={<button className="btn primary" onClick={publish}><Save size={15}/> PUBLISH BRIEFING</button>}/><div className="grid g2"><div className="card form"><label className="field"><span>PLAYER</span><select value={pid} onChange={e=>setPid(e.target.value)}>{data.players.map(p=><option key={p.id} value={p.id}>{p.name} · {playerSquadForOperation(op,p.id)} · {p.role}</option>)}</select></label><Input label="TITLE" value={existing.title} onChange={v=>update({title:v})}/><label className="field"><span>MISSION</span><textarea value={existing.body} onChange={e=>update({body:e.target.value})} placeholder="What this player must do, where, and when…"/></label><div className="checklist"><span className="field-title">CHECKLIST</span>{existing.checklist.map((c,i)=><label key={i}><input type="checkbox" defaultChecked={false}/><span>{c}</span></label>)}</div></div><div className="card brief"><div className="eyebrow">PLAYER VIEW</div><h2>{player?.name||'PLAYER'}</h2><div className="subtitle">{player?.squad||'UNASSIGNED'} · {player?.role||'RIFLEMAN'}</div><Tag tone={existing.published?'green':'yellow'}>{existing.published?'PUBLISHED':'DRAFT'}</Tag><h4>{existing.title}</h4><p>{existing.body||'No individual briefing written yet.'}</p><div className="callout"><MessageSquare size={15}/> This is the exact briefing shown to the player.</div></div></div><div className="card section"><div className="section-head"><h3>Briefing coverage</h3><span>{data.players.filter(p=>op.briefingsByPlayer?.[p.id]?.published).length}/{data.players.length}</span></div><table className="table"><thead><tr><th>PLAYER</th><th>SQUAD</th><th>STATUS</th></tr></thead><tbody>{data.players.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{playerSquadForOperation(op,p.id)}</td><td><Tag tone={op.briefingsByPlayer?.[p.id]?.published?'green':'red'}>{op.briefingsByPlayer?.[p.id]?.published?'PUBLISHED':'PENDING'}</Tag></td></tr>)}</tbody></table></div></div>}

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

function Members({clan,user,data,setClan}){
  const [members,setMembers]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [copied,setCopied]=useState(false);
  useEffect(()=>{let live=true;(async()=>{if(!supabase||!clan?.id){setMembers(data.players.map(p=>({id:p.id,callsign:p.name,role:p.role,user_id:p.memberUserId,active:true})));setLoading(false);return;} const {data:rows,error:e}=await supabase.from('clan_members').select('id,user_id,callsign,role,active,created_at').eq('clan_id',clan.id).order('created_at',{ascending:true}); if(live){setMembers(rows||[]);setError(e?.message||'');setLoading(false);}})();return()=>{live=false}},[clan?.id,data.players.length]);
  const admin=canManageMembers(clan);
  async function updateRole(memberId,newRole){ if(!admin || !supabase) return; try{ const member=members.find(m=>m.id===memberId); if(!member) return; const {error:e}=await supabase.from('clan_members').update({role:newRole}).eq('id',memberId).eq('clan_id',clan.id); if(e)throw e; setMembers(ms=>ms.map(m=>m.id===memberId?{...m,role:newRole}:m)); if(member.user_id===user?.id && setClan) setClan(c=>c?{...c,role:newRole}:c); }catch(e){setError(e.message||'Could not update member role.');} }
  async function copyInvite(){if(!clan?.inviteCode)return;try{await navigator.clipboard.writeText(clan.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{setCopied(false)}}
  return <><PageHead eyebrow="PERSONNEL COMMAND" title="CLAN MEMBERS" subtitle="ACCOUNTS · ROLES · INVITE ACCESS" actions={<Tag tone={admin?"green":"yellow"}>{admin?"ROLE ADMIN":"READ ONLY"}</Tag>}/><div className="grid g3"><div className="card stat"><div className="k">MEMBERS</div><div className="v">{members.length}</div><div className="s">ACTIVE CLAN ACCOUNTS</div></div><div className="card stat"><div className="k">COMMANDERS</div><div className="v">{members.filter(m=>m.role==='commander'||m.role==='co').length}</div><div className="s">COMMAND ACCESS</div></div>{admin?<div className="card"><div className="section-head"><h3>Invite code</h3><span>COMMAND ONLY</span></div><div className="invite-code">{clan?.inviteCode||'—'}</div><button className="btn primary" onClick={copyInvite} disabled={!clan?.inviteCode}><Copy size={14}/> {copied?'COPIED':'COPY INVITE CODE'}</button></div>:<div className="card"><div className="section-head"><h3>Invite access</h3><span>LOCKED</span></div><p className="subtitle">Ask your commander for the current clan invite code.</p><Tag tone="yellow">COMMAND ONLY</Tag></div>}</div>{error&&<div className="error section">{error}</div>}<div className="card section"><div className="section-head"><h3>Member roster</h3><span>{loading?'LOADING…':'LIVE FROM SUPABASE'}</span></div><table className="table"><thead><tr><th>CALLSIGN</th><th>ROLE</th><th>STATUS</th><th>USER ID</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><b>{m.callsign||'Unnamed player'}</b></td><td>{admin?<select value={m.role||'player'} onChange={e=>updateRole(m.id,e.target.value)} disabled={m.user_id===user?.id&&m.role==='commander'}>{(m.user_id===user?.id&&m.role==='commander'?ROLE_ORDER:['co','squad_lead','player','recruit']).map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>:<Tag tone={m.role==='commander'?'green':m.role==='squad_lead'?'yellow':''}>{String(m.role||'player').replace('_',' ').toUpperCase()}</Tag>}</td><td><Tag tone={m.active?'green':'red'}>{m.active?'ACTIVE':'INACTIVE'}</Tag></td><td><small>{m.user_id===user?.id?'YOU':(m.user_id||'—').slice(0,8)}</small></td></tr>)}{!members.length&&!loading&&<tr><td colSpan="4">No clan members found.</td></tr>}</tbody></table></div></>
}

function Strategy({data,setData,embedded=false}){const [local,setLocal]=useState(data.strategy); useEffect(()=>setLocal(data.strategy),[data.strategy]); function save(){setData(d=>({...d,strategy:local}));alert('Strategy saved to local command database.')} return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="OPERATION 042" title="STRATEGY BUILDER" subtitle="COMMANDER'S INTENT → PHASES → TASKS" actions={<button className="btn primary" onClick={save}><Save size={15}/> SAVE STRATEGY</button>}/>}<div className="grid g2"><div className="card form"><div className="form-grid"><Input label="OPERATION NAME" value={local.name} onChange={v=>setLocal(x=>({...x,name:v}))}/><Input label="COMMANDER'S INTENT" value={local.intent} onChange={v=>setLocal(x=>({...x,intent:v}))}/></div><label className="field"><span>GLOBAL ORDERS</span><textarea value={local.orders} onChange={e=>setLocal(x=>({...x,orders:e.target.value}))}/></label><div className="callout"><Target size={15}/> Every phase should map to a stage map and at least one squad task.</div></div><div className="card"><div className="section-head"><h3>Battle phases</h3><span>4 PHASES</span></div><div className="side-list">{[['01 — SETUP','Garrisons, nodes, defensive positions','green'],['02 — CONTACT','Absorb first push, identify armor','green'],['03 — ROTATE','Shift Bravo north on center pressure','yellow'],['04 — FINAL','Fallback network, counterattack on call','']].map(([a,b,t])=><div className="row" key={a}><div><b>{a}</b><small>{b}</small></div><Tag tone={t}>{t==='green'?'READY':t==='yellow'?'DRAFT':'DRAFT'}</Tag></div>)}</div></div></div><div className="card section"><div className="section-head"><h3>Squad tasks</h3><span>LINKED TO PHASES</span></div><table className="table"><thead><tr><th>SQUAD</th><th>PRIMARY TASK</th><th>PHASE</th><th>DEPENDENCY</th></tr></thead><tbody><tr><td><b>ALPHA</b></td><td>Own western sector; protect G1</td><td>01–02</td><td>Supply + fallback</td></tr><tr><td><b>BRAVO</b></td><td>Center line + armor reserve</td><td>01–04</td><td>Commander release</td></tr><tr><td><b>CHARLIE</b></td><td>Southern fallback / counterattack</td><td>02–04</td><td>G2 integrity</td></tr><tr><td><b>DELTA</b></td><td>Recon + arty coordination</td><td>01–03</td><td>Grid reporting</td></tr></tbody></table></div></div>}

function Maps({embedded=false}){return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="TACTICAL PLANNING" title="STAGE MAP EDITOR" subtitle="01 SETUP · 02 CONTACT · 03 ROTATE · 04 FINAL" actions={<><button className="btn" onClick={()=>alert('Marker tool active — click the map to place a marker.')}><Plus size={15}/> ADD MARKER</button><button className="btn primary" onClick={()=>alert('Map saved locally.') }><Save size={15}/> SAVE MAP</button></>}/>}<div className="tabs"><button className="active">01 SETUP</button><button>02 CONTACT</button><button>03 ROTATE</button><button>04 FINAL</button></div><div className="card map-wrap"><TacticalMap editor/></div><div className="grid g3 section"><div className="card stat"><div className="k">FRIENDLY PLACEMENTS</div><div className="v">17</div><div className="s">6 GARRISON / 5 SQUADS / 6 OTHER</div></div><div className="card stat"><div className="k">ROUTES</div><div className="v">8</div><div className="s">3 ATTACK · 5 SUPPORT</div></div><div className="card stat"><div className="k">OBJECTIVES</div><div className="v">4</div><div className="s">2 PRIMARY · 2 FALLBACK</div></div></div></div>}

function TacticalMap({compact=false,editor=false}){const [markers,setMarkers]=useState([{x:18,y:34,label:'G1',tone:'green'},{x:26,y:48,label:'E1',tone:'red'},{x:70,y:62,label:'O1',tone:'yellow'},{x:77,y:49,label:'M1',tone:'blue'},{x:51,y:70,label:'G2',tone:'green'}]); const [drag,setDrag]=useState(null); function moveMarker(i,e){const rect=e.currentTarget.getBoundingClientRect(); const x=Math.max(2,Math.min(96,((e.clientX-rect.left)/rect.width)*100)); const y=Math.max(2,Math.min(96,((e.clientY-rect.top)/rect.height)*100));setMarkers(m=>m.map((a,n)=>n===i?{...a,x,y}:a))} return <div className={`tactical-map ${compact?'compact':''}`} onPointerMove={e=>{if(drag!=null)moveMarker(drag,e)}} onPointerUp={()=>setDrag(null)}><div className="grid-overlay"/><div className="zone friendly"/><div className="zone contested"/><div className="zone rear"/><div className="river"/><div className="road road-a"/><div className="road road-b"/><div className="route route-a"/><div className="route route-b"/>{markers.map((m,i)=><div key={i} className={`marker ${m.tone}`} style={{left:`${m.x}%`,top:`${m.y}%`}} onPointerDown={()=>setDrag(i)}>{m.label}</div>)}{editor&&<div className="map-tools"><button><ArrowUpRight size={14}/></button><button><X size={14}/></button><button><Settings size={14}/></button><button><Save size={14}/></button></div>}<div className="legend"><span><i className="lg friend"/>FRIENDLY</span><span><i className="lg enemy"/>ENEMY</span><span><i className="lg obj"/>OBJECTIVE</span><span><i className="lg sup"/>SUPPORT</span></div><div className="map-grid-label">GRID // 042-A · CARANTAN</div></div>}

function Briefings({data,setData,embedded=false}){
  const op=useMemo(()=>data.ops.find(o=>o.status==='active')||data.ops[0],[data.ops]);
  const players=data.players||[];
  const [player,setPlayer]=useState(players[0]?.id||'');
  const current=players.find(p=>p.id===player)||players[0];
  const existing=op?.briefingsByPlayer?.[current?.id]||{};
  const [text,setText]=useState(existing.body||'');
  const [title,setTitle]=useState(existing.title||'MISSION BRIEF');
  const [published,setPublished]=useState(!!existing.published);
  useEffect(()=>{setText(existing.body||'');setTitle(existing.title||'MISSION BRIEF');setPublished(!!existing.published)},[player,existing.body,existing.title,existing.published]);
  const receipt=existing;
  function publish(){
    if(!op||!current)return;
    const now=new Date().toISOString();
    setData(d=>({...d,ops:d.ops.map(x=>x.id===op.id?{...x,briefingsByPlayer:{...(x.briefingsByPlayer||{}),[current.id]:{...(x.briefingsByPlayer?.[current.id]||{}),title,body:text,checklist:existing.checklist||[],published:true,publishedAt:existing.publishedAt||now,read:existing.read||false,readAt:existing.readAt||null,acknowledged:existing.acknowledged||false,acknowledgedAt:existing.acknowledgedAt||null}}}:x)}));
    setPublished(true);
  }
  const stats=players.reduce((a,p)=>{const b=op?.briefingsByPlayer?.[p.id];if(b?.published)a.published++;if(b?.read)a.read++;if(b?.acknowledged)a.ack++;return a},{published:0,read:0,ack:0});
  return <div className={embedded?'embedded':''}>
    {!embedded&&<PageHead eyebrow="PLAYER COMMUNICATION" title="BRIEFING CENTER" subtitle="PUBLISH · TRACK · ACKNOWLEDGE" actions={<button className="btn primary" onClick={publish}><Save size={15}/> PUBLISH BRIEFING</button>}/>}
    {!op?<div className="card"><h2>NO OPERATION</h2><p className="subtitle">Create an operation before issuing player briefings.</p></div>:<>
      <div className="grid g4">
        <Stat label="PUBLISHED" value={`${stats.published}/${players.length}`} sub="BRIEFINGS ISSUED"/>
        <Stat label="READ" value={`${stats.read}/${stats.published||0}`} sub="PLAYERS OPENED"/>
        <Stat label="ACKNOWLEDGED" value={`${stats.ack}/${stats.published||0}`} sub="ORDERS CONFIRMED"/>
        <Stat label="UNREAD" value={Math.max(0,stats.published-stats.read)} sub="ACTION REQUIRED"/>
      </div>
      <div className="grid g2 section">
        <div className="card form">
          <div className="form-grid">
            <label className="field"><span>PLAYER</span><select value={current?.id||''} onChange={e=>setPlayer(e.target.value)}>{players.map(p=><option key={p.id} value={p.id}>{p.name} — {p.squad||'Unassigned'}</option>)}</select></label>
            <Input label="SQUAD" value={current?.squad||'Unassigned'} onChange={()=>{}}/>
          </div>
          <label className="field"><span>BRIEFING TITLE</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Alpha — G2 Defense"/></label>
          <label className="field"><span>MISSION</span><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write the player's exact mission, priorities and restrictions…"/></label>
          <div className="actions"><button className="btn primary" onClick={publish}><Save size={15}/> {published?'UPDATE BRIEFING':'PUBLISH BRIEFING'}</button></div>
          <div className="callout"><MessageSquare size={15}/> Published briefings appear in the player's My Operation view. Players can mark them READ and ACKNOWLEDGED.</div>
        </div>
        <div className="card brief">
          <div className="eyebrow">DELIVERY STATUS</div>
          <h2>{current?.name||'Player'}</h2>
          <div className="subtitle">{current?.squad?.toUpperCase()||'UNASSIGNED'} · {(current?.role||'RIFLEMAN').toUpperCase()}</div>
          <div className="status-line">
            <Tag tone={receipt.published?'green':'yellow'}>{receipt.published?'PUBLISHED':'DRAFT'}</Tag>
            <Tag tone={receipt.read?'green':'red'}>{receipt.read?'READ':'UNREAD'}</Tag>
            <Tag tone={receipt.acknowledged?'green':'yellow'}>{receipt.acknowledged?'ACKNOWLEDGED':'AWAITING ACK'}</Tag>
          </div>
          <h4>Your mission</h4><p>{text||'No briefing text yet.'}</p>
        </div>
      </div>
      <div className="card section">
        <div className="section-head"><h3>Briefing delivery</h3><span>{stats.ack}/{stats.published||0} ACKNOWLEDGED</span></div>
        <div className="brief-grid">{players.map(p=>{const b=op.briefingsByPlayer?.[p.id];return <button key={p.id} className="brief-row" onClick={()=>setPlayer(p.id)}><div className="avatar sm">{(p.name||'P').slice(0,1)}</div><div><b>{p.name}</b><small>{p.squad||'Unassigned'} · {p.role||'Rifleman'}</small></div><span className="status-line compact"><Tag tone={b?.published?'green':'red'}>{b?.published?'PUBLISHED':'PENDING'}</Tag><Tag tone={b?.acknowledged?'green':b?.read?'yellow':'red'}>{b?.acknowledged?'ACK':b?.read?'READ':'UNREAD'}</Tag></span></button>})}</div>
      </div>
    </>}
  </div>
}

function Wiki({data,setData}){const [q,setQ]=useState(''); const [title,setTitle]=useState(''); const filtered=data.wiki.filter(r=>r.join(' ').toLowerCase().includes(q.toLowerCase())); function add(){if(!title.trim())return;setData(d=>({...d,wiki:[[title.trim(),'SOP',new Date().toISOString().slice(0,10),'Command'],...d.wiki]}));setTitle('')}return <><PageHead eyebrow="KNOWLEDGE BASE" title="CLAN WIKI" subtitle="REUSABLE MAPS · SOPs · TACTICS" actions={<button className="btn primary" onClick={add}><Plus size={15}/> NEW ARTICLE</button>}/><div className="grid g3"><Stat label="MAP PLAYBOOKS" value="12" sub="4 UPDATED THIS MONTH"/><Stat label="SOPs" value="27" sub="COMMAND / INF / ARMOR"/><Stat label="TACTICAL NOTES" value="83" sub="SEARCHABLE"/></div><div className="card section"><div className="toolbar"><div className="search"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search knowledge base…"/></div><div className="add-inline"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New article title"/><button className="btn" onClick={add}><Plus size={14}/></button></div></div><table className="table"><thead><tr><th>ARTICLE</th><th>CATEGORY</th><th>UPDATED</th><th>OWNER</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={i}><td><b>{r[0]}</b></td><td><Tag>{r[1]}</Tag></td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody></table></div></>}

function AAR({data,setData,embedded=false}){const [local,setLocal]=useState(data.aar);function save(){setData(d=>({...d,aar:local}));alert('AAR saved.');}return <div className={embedded?'embedded':''}>{!embedded&&<PageHead eyebrow="POST-MATCH" title="AFTER ACTION REVIEW" subtitle="CAPTURE LESSONS → IMPROVE THE NEXT OPERATION" actions={<button className="btn primary" onClick={save}><Save size={15}/> SAVE AAR</button>}/>}<div className="grid g4"><Stat label="RESULT" value={local.result} sub={local.score} trend/><Stat label="ATTENDANCE" value="24/25" sub="96%"/><Stat label="GARRISON SCORE" value="8/10" sub="GOOD"/><Stat label="COMMS" value="7/10" sub="IMPROVE"/></div><div className="grid g2 section"><div className="card form"><label className="field"><span>WHAT WORKED?</span><textarea value={local.worked} onChange={e=>setLocal(x=>({...x,worked:e.target.value}))}/></label><label className="field"><span>WHAT FAILED?</span><textarea value={local.failed} onChange={e=>setLocal(x=>({...x,failed:e.target.value}))}/></label></div><div className="card"><div className="section-head"><h3>Squad evaluation</h3></div><table className="table"><tbody>{[['Alpha','9/10','EXCELLENT','green'],['Bravo','7/10','ROTATION','yellow'],['Charlie','8/10','SOLID','green'],['Delta','6/10','COMMS','red']].map(([a,b,c,t])=><tr key={a}><td>{a}</td><td>{b}</td><td><Tag tone={t}>{c}</Tag></td></tr>)}</tbody></table></div></div></div>}

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
