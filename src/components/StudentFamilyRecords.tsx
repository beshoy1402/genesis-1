'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ClipboardCheck, GraduationCap, LoaderCircle, Wallet } from 'lucide-react';
import type { Role } from '@/lib/roles';

type Child={id:string;profile_id:string;class_id:string|null;admission_number:string;name:string};
type Row=Record<string,unknown>;
type RecordSet={grades:Row[];attendance:Row[];assignments:Row[];exams:Row[];timetable:Row[];fees:Row[];subjects:Map<string,string>;className:string};
const blank:RecordSet={grades:[],attendance:[],assignments:[],exams:[],timetable:[],fees:[],subjects:new Map(),className:''};
function val(row:Row,key:string){return typeof row[key]==='string'?row[key] as string:'';}

export function StudentFamilyRecords({role}:{role:Extract<Role,'student'|'parent'>}){
  const sb=useMemo(()=>createClient(),[]);const [children,setChildren]=useState<Child[]>([]);const [selected,setSelected]=useState('');const [records,setRecords]=useState<RecordSet>(blank);const [loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;async function load(){const {data:{user}}=await sb.auth.getUser();if(!user)return;let rows:Child[]=[];
    if(role==='student'){const {data}=await sb.from('students').select('id,profile_id,class_id,admission_number').eq('profile_id',user.id);rows=(data||[]) as Child[];}
    else {const {data:parent}=await sb.from('parents').select('id').eq('profile_id',user.id).maybeSingle();if(parent){const {data:links}=await sb.from('parent_students').select('student_id').eq('parent_id',parent.id);const ids=(links||[]).map((link)=>link.student_id);if(ids.length){const {data}=await sb.from('students').select('id,profile_id,class_id,admission_number').in('id',ids);rows=(data||[]) as Child[];}}}
    const profileIds=rows.map((r)=>r.profile_id);const {data:profiles}=profileIds.length?await sb.from('profiles').select('id,full_name').in('id',profileIds):{data:[]};const names=new Map((profiles||[]).map((p)=>[p.id,p.full_name]));rows=rows.map((r)=>({...r,name:names.get(r.profile_id)||r.admission_number}));
    if(live){setChildren(rows);setSelected(rows[0]?.id||'');if(!rows.length)setLoading(false);}
  }void load();return()=>{live=false;};},[sb,role]);
  useEffect(()=>{let live=true;async function loadRecords(){const child=children.find((r)=>r.id===selected);if(!child){setRecords(blank);return;}setLoading(true);
    const [grades,attendance,assignments,exams,timetable,fees,classRow]=await Promise.all([
      sb.from('grades').select('id,title,score,max_score,recorded_at,subject_id').eq('student_id',child.id).order('recorded_at',{ascending:false}).limit(10),
      sb.from('attendance').select('id,status,attendance_date,subject_id').eq('student_id',child.id).order('attendance_date',{ascending:false}).limit(10),
      child.class_id?sb.from('assignments').select('id,title,description,due_at,subject_id').eq('class_id',child.class_id).order('due_at',{ascending:true}).limit(10):Promise.resolve({data:[]}),
      child.class_id?sb.from('exams').select('id,title,starts_at,room,subject_id').eq('class_id',child.class_id).eq('published',true).order('starts_at',{ascending:true}).limit(10):Promise.resolve({data:[]}),
      child.class_id?sb.from('timetables').select('id,weekday,starts_at,ends_at,room,subject_id').eq('class_id',child.class_id).order('weekday',{ascending:true}).order('starts_at',{ascending:true}):Promise.resolve({data:[]}),
      sb.from('school_fees').select('id,description,amount,due_date,academic_year').eq('student_id',child.id).order('due_date',{ascending:true}),
      child.class_id?sb.from('school_classes').select('name').eq('id',child.class_id).maybeSingle():Promise.resolve({data:null}),
    ]);
    const subjectIds=[...new Set([...(grades.data||[]),...(attendance.data||[]),...(assignments.data||[]),...(exams.data||[]),...(timetable.data||[])].map((row)=>row.subject_id).filter(Boolean))];const {data:subjectRows}=subjectIds.length?await sb.from('subjects').select('id,name').in('id',subjectIds):{data:[]};const subjectMap=new Map((subjectRows||[]).map((s)=>[s.id,s.name]));
    const feeRows=(fees.data||[]) as Row[];const feeIds=feeRows.map((row)=>String(row.id));const {data:payments}=feeIds.length?await sb.from('payment_records').select('fee_id,amount,paid_at,reference').in('fee_id',feeIds):{data:[]};const paidTotals=new Map<string,number>();for(const payment of payments||[])paidTotals.set(payment.fee_id,(paidTotals.get(payment.fee_id)||0)+Number(payment.amount));
    const feeSummary=feeRows.map((row)=>({...row,paid:paidTotals.get(String(row.id))||0,balance:Math.max(0,Number(row.amount)-(paidTotals.get(String(row.id))||0))}));
    if(live){setRecords({grades:(grades.data||[]) as Row[],attendance:(attendance.data||[]) as Row[],assignments:(assignments.data||[]) as Row[],exams:(exams.data||[]) as Row[],timetable:(timetable.data||[]) as Row[],fees:feeSummary,subjects:subjectMap,className:classRow.data?.name||'Class not assigned'});setLoading(false);}
  }void loadRecords();return()=>{live=false;};},[sb,children,selected]);
  const present=records.attendance.filter((r)=>r.status==='present').length;const absent=records.attendance.filter((r)=>r.status==='absent').length;
  const scheduleRows:Row[]=[...records.assignments.map((r)=>({...r,kind:'Assignment',date:r.due_at})),...records.exams.map((r)=>({...r,kind:'Exam',date:r.starts_at}))].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  return <section id="academic-records" className="content-card records-section"><div className="section-heading"><div><p className="eyebrow">ACADEMIC LIFE</p><h2>{role==='parent'?'Your child’s school records':'My school records'}</h2><p className="muted">Grades, classwork, attendance, and the school week.</p></div><GraduationCap size={20} className="heading-icon"/></div>
    {role==='parent'&&children.length>0&&<label className="child-switch">Child<select value={selected} onChange={(e)=>setSelected(e.target.value)}>{children.map((child)=><option value={child.id} key={child.id}>{child.name} · {child.admission_number}</option>)}</select></label>}
    {!loading&&!children.length?<div className="empty-state compact"><strong>{role==='parent'?'No children are linked to this account yet':'Your student profile is not set up yet'}</strong><span>Contact the school office to connect your school records.</span></div>:loading?<div className="loading-row"><LoaderCircle size={17} className="spin"/> Loading school records…</div>:<>
      <div className="record-summary"><span>{records.className}</span><span><ClipboardCheck size={14}/> {present} present · {absent} absent in recent records</span></div>
      <div className="records-grid"><RecordPanel icon={<GraduationCap size={16}/>} title="Recent grades" empty="No grades have been published yet.">{records.grades.map((row)=><div className="record-line" key={String(row.id)}><span><strong>{val(row,'title')}</strong><small>{records.subjects.get(String(row.subject_id))||'Subject'} · {new Date(String(row.recorded_at)).toLocaleDateString()}</small></span><b>{String(row.score)} / {String(row.max_score)}</b></div>)}</RecordPanel>
        <RecordPanel icon={<ClipboardCheck size={16}/>} title="Attendance" empty="No attendance records have been entered.">{records.attendance.map((row)=><div className="record-line" key={String(row.id)}><span><strong>{records.subjects.get(String(row.subject_id))||'School day'}</strong><small>{new Date(String(row.attendance_date)).toLocaleDateString()}</small></span><b className={`attendance-tag ${val(row,'status')}`}>{val(row,'status')}</b></div>)}</RecordPanel>
        <RecordPanel icon={<CalendarDays size={16}/>} title="Assignments & exams" empty="Nothing upcoming has been published.">{scheduleRows.map((row)=><div className="record-line" key={`${String(row.kind)}-${String(row.id)}`}><span><strong>{val(row,'title')}</strong><small>{String(row.kind)} · {records.subjects.get(String(row.subject_id))||'Subject'}</small></span><b>{row.date?new Date(String(row.date)).toLocaleDateString():'—'}</b></div>)}</RecordPanel>
        <RecordPanel icon={<CalendarDays size={16}/>} title="Weekly timetable" empty="Your timetable will appear when it is published.">{records.timetable.map((row)=><div className="record-line" key={String(row.id)}><span><strong>{['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][Number(row.weekday)]||'School day'} · {records.subjects.get(String(row.subject_id))||'Subject'}</strong><small>{String(row.starts_at).slice(0,5)}–{String(row.ends_at).slice(0,5)}{row.room?` · ${String(row.room)}`:''}</small></span></div>)}</RecordPanel>
      </div>
      {role==='parent'&&<RecordPanel icon={<Wallet size={16}/>} title="School fees" empty="No fee records are available.">{records.fees.map((row)=><div className="record-line" key={String(row.id)}><span><strong>{val(row,'description')}</strong><small>{val(row,'academic_year')} · {row.due_date?`Due ${new Date(String(row.due_date)).toLocaleDateString()}`:'No due date'} · Paid {Number(row.paid||0).toLocaleString()}</small></span><b>Balance {Number(row.balance||0).toLocaleString()}</b></div>)}</RecordPanel>}
    </>}
  </section>;
}

function RecordPanel({icon,title,empty,children}:{icon:React.ReactNode;title:string;empty:string;children:React.ReactNode[]}){return <section className="record-panel"><h3>{icon}{title}</h3>{children.length?children:<p className="record-empty">{empty}</p>}</section>}
