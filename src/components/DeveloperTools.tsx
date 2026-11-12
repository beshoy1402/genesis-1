'use client';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, GraduationCap, LoaderCircle, Mail, Plus, RefreshCw, ShieldCheck, Users, UserPlus } from 'lucide-react';

type Account={id:string;role:string;username:string|null;full_name:string;email:string;is_active:boolean;created_at:string};
type SchoolClass={id:string;name:string;grade_level:string;academic_year:string;room:string|null};
type Subject={id:string;name:string;code:string|null};
type Teacher={id:string;profile_id:string;employee_number:string|null;department:string|null;full_name:string;email:string;is_active:boolean};
type Student={id:string;profile_id:string;admission_number:string;class_id:string|null;full_name:string;email:string;is_active:boolean};
type TeacherLink={id:string;teacher_id:string;class_id:string;subject_id:string};
type Data={accounts:Account[];classes:SchoolClass[];subjects:Subject[];teachers:Teacher[];students:Student[];teacherLinks:TeacherLink[]};
const empty:Data={accounts:[],classes:[],subjects:[],teachers:[],students:[],teacherLinks:[]};

export function DeveloperTools(){
 const sb=useMemo(()=>createClient(),[]);
 const [data,setData]=useState<Data>(empty);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [editing,setEditing]=useState<SchoolClass|null>(null);
 const [accountSearch,setAccountSearch]=useState('');
 const [passwordDrafts,setPasswordDrafts]=useState<Record<string,string>>({});

 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  try {
   const {data:result,error:invokeError}=await sb.functions.invoke('developer-management',{body:{action:'list'}});
   if(invokeError){let detail='';try{detail=(await invokeError.context?.clone().json())?.error||'';}catch{}setError(detail||invokeError.message||'Could not load accounts.');}
   else if(result?.error)setError(result.error);
   else setData({...empty,...result});
  } catch {setError('Could not connect to the school system. Check your connection and try again.');}
  finally {setLoading(false);}
 },[sb]);
 useEffect(()=>{void refresh();},[refresh]);

 async function action(payload:Record<string,unknown>,success:string){
  setBusy(true);setError('');setMessage('');
  try {
   const {data:result,error:invokeError}=await sb.functions.invoke('developer-management',{body:payload});
   if(invokeError||result?.error){let detail=result?.error||'';try{detail=detail||(await invokeError?.context?.clone().json())?.error||'';}catch{}setError(detail||invokeError?.message||'The action could not be completed.');setBusy(false);return false;}
   setMessage(result?.message||success);await refresh();setBusy(false);return true;
  } catch {setError('The request could not reach the school system. Please try again.');setBusy(false);return false;}
 }
 async function saveClass(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const formElement=event.currentTarget;const form=new FormData(formElement);
  const payload={action:editing?'update_class':'create_class',...(editing?{id:editing.id}:{}),name:String(form.get('name')),grade_level:String(form.get('grade_level')),academic_year:String(form.get('academic_year')),room:String(form.get('room')||'')};
  if(await action(payload,editing?'Class updated.':'Class created.')){setEditing(null);formElement.reset();}
 }
 async function createMember(event:FormEvent<HTMLFormElement>,role:'teacher'|'student'){
  event.preventDefault();const formElement=event.currentTarget;const form=new FormData(formElement);
  const payload:Record<string,unknown>={action:'create_account',role,email:String(form.get('email')),username:String(form.get('username')),password:String(form.get('password')),full_name:String(form.get('full_name'))};
  if(role==='teacher'){payload.employee_number=String(form.get('employee_number')||'');payload.department=String(form.get('department')||'');payload.class_id=String(form.get('class_id')||'');payload.subject_id=String(form.get('subject_id')||'');}
  else{payload.admission_number=String(form.get('admission_number'));payload.class_id=String(form.get('class_id')||'');payload.date_of_birth=String(form.get('date_of_birth')||'');}
  if(await action(payload,role==='teacher'?'Teacher account created. They can sign in immediately.':'Student account created. They can sign in immediately.'))formElement.reset();
 }
 async function saveAccount(event:FormEvent<HTMLFormElement>,id:string){
  event.preventDefault();const form=new FormData(event.currentTarget);
  await action({action:'set_account',id,role:String(form.get('role')),is_active:form.get('is_active')==='on'},'Account permissions updated.');
 }
 return <div className="developer-tools">
  <section id="developer-classes" className="content-card admin-tools">
   <div className="section-heading"><div><p className="eyebrow">ACADEMIC STRUCTURE</p><h2>Classes</h2><p className="muted">Create, edit, review, and safely remove empty classes.</p></div><BookOpen size={20} className="heading-icon"/></div>
   <form key={editing?.id||"new-class"} className="admin-forms" onSubmit={saveClass}><h3>{editing?'Edit class':'Create a class'}</h3><div className="form-row"><input name="name" required placeholder="Class name" defaultValue={editing?.name||''}/><input name="grade_level" required placeholder="Grade level" defaultValue={editing?.grade_level||''}/><input name="academic_year" required placeholder="Academic year" defaultValue={editing?.academic_year||''}/><input name="room" placeholder="Room" defaultValue={editing?.room||''}/></div><div className="developer-actions"><button className="small-primary" disabled={busy}><Plus size={14}/>{editing?'Save changes':'Create class'}</button>{editing&&<button type="button" className="small-secondary" onClick={()=>setEditing(null)}>Cancel</button>}</div></form>
   <div className="developer-list">{data.classes.map(item=><div className="developer-row" key={item.id}><div><strong>{item.name}</strong><small>{item.grade_level} · {item.academic_year}{item.room?' · Room '+item.room:''}</small></div><div className="developer-actions"><button type="button" className="small-secondary" onClick={()=>{setEditing(item);document.getElementById('developer-classes')?.scrollIntoView({behavior:'smooth'});}}>Edit</button><button type="button" className="small-danger" disabled={busy} onClick={()=>{if(window.confirm('Delete this class only if it has no linked students or school records?'))void action({action:'delete_class',id:item.id},'Class deleted.');}}>Delete</button></div></div>)}</div>
   {!loading&&!data.classes.length&&<p className="inline-note">No classes have been created yet.</p>}
  </section>
  <section id="developer-teachers" className="content-card admin-tools">
   <div className="section-heading"><div><p className="eyebrow">STAFF DIRECTORY</p><h2>Teachers</h2><p className="muted">Create teacher accounts immediately, assign classes and subjects, or deactivate a teacher without deleting academic history.</p></div><Users size={20} className="heading-icon"/></div>
   <form className="admin-forms" onSubmit={e=>void createMember(e,'teacher')}><h3><UserPlus size={16}/> Add a teacher</h3><div className="form-row"><input name="full_name" required placeholder="Full name"/><input name="email" type="email" required placeholder="Email address"/><input name="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" placeholder="Username"/><input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Temporary password (8+ characters)"/><input name="employee_number" placeholder="Employee number"/><input name="department" placeholder="Department"/></div><div className="form-row"><select name="class_id" defaultValue=""><option value="">No class assignment</option>{data.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="subject_id" defaultValue=""><option value="">No subject assignment</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><button className="small-primary" disabled={busy}>Add teacher</button></form>
   <div className="developer-list">{data.teachers.map(t=><div className="developer-row" key={t.id}><div><strong>{t.full_name||'Teacher'} <span className={t.is_active?'status-active':'status-inactive'}>{t.is_active?'Active':'Inactive'}</span></strong><small>{t.email}{t.employee_number?' · '+t.employee_number:''}{t.department?' · '+t.department:''}</small><small>Assigned: {data.teacherLinks.filter(l=>l.teacher_id===t.id).map(l=>(data.classes.find(x=>x.id===l.class_id)?.name||'Class')+' / '+(data.subjects.find(x=>x.id===l.subject_id)?.name||'Subject')).join(', ')||'No classes yet'}</small></div><div className="developer-actions">{t.is_active&&<button type="button" className="small-danger" disabled={busy} onClick={()=>void action({action:'remove_member',id:t.profile_id,role:'teacher'},'Teacher deactivated. Academic records were preserved.')}>Remove</button>}</div></div>)}</div>
   <form className="admin-forms" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void action({action:'assign_teacher',teacher_id:String(f.get('teacher_id')),class_id:String(f.get('class_id')),subject_id:String(f.get('subject_id'))},'Teacher assigned.');}}><h3>Assign a teacher to a class</h3><div className="form-row"><select name="teacher_id" required>{data.teachers.filter(t=>t.is_active).map(t=><option key={t.id} value={t.id}>{t.full_name||t.email}</option>)}</select><select name="class_id" required>{data.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="subject_id" required>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><button className="small-primary" disabled={busy}>Assign teacher</button></form>
   {data.teacherLinks.map(link=><div className="developer-row compact-row" key={link.id}><small>{data.teachers.find(t=>t.id===link.teacher_id)?.full_name||'Teacher'} · {data.classes.find(c=>c.id===link.class_id)?.name||'Class'} · {data.subjects.find(s=>s.id===link.subject_id)?.name||'Subject'}</small><button type="button" className="small-danger" disabled={busy} onClick={()=>void action({action:'remove_teacher_assignment',id:link.id},'Teacher assignment removed.')}>Unassign</button></div>)}
  </section>
  <section id="developer-students" className="content-card admin-tools">
   <div className="section-heading"><div><p className="eyebrow">STUDENT DIRECTORY</p><h2>Students</h2><p className="muted">Create student accounts immediately, place them in classes, or deactivate an account while preserving school records.</p></div><GraduationCap size={20} className="heading-icon"/></div>
   <form className="admin-forms" onSubmit={e=>void createMember(e,'student')}><h3><UserPlus size={16}/> Add a student</h3><div className="form-row"><input name="full_name" required placeholder="Full name"/><input name="email" type="email" required placeholder="Email address"/><input name="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" placeholder="Username"/><input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Temporary password (8+ characters)"/><input name="admission_number" required placeholder="Admission number"/><input name="date_of_birth" type="date"/></div><div className="form-row"><select name="class_id" defaultValue=""><option value="">Not assigned yet</option>{data.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button className="small-primary" disabled={busy}>Add student</button></form>
   <div className="developer-list">{data.students.map(s=><div className="developer-row" key={s.id}><div><strong>{s.full_name||'Student'} <span className={s.is_active?'status-active':'status-inactive'}>{s.is_active?'Active':'Inactive'}</span></strong><small>{s.email} · {s.admission_number}</small></div><div className="developer-actions"><select aria-label={'Assign class to '+s.full_name} value={s.class_id||''} disabled={busy} onChange={e=>void action({action:'assign_student_class',student_id:s.id,class_id:e.target.value},'Student class updated.')}><option value="">Unassigned</option>{data.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{s.is_active&&<button type="button" className="small-danger" disabled={busy} onClick={()=>void action({action:'remove_member',id:s.profile_id,role:'student'},'Student deactivated. Academic records were preserved.')}>Remove</button>}</div></div>)}</div>
  </section>
  <section id="platform-access" className="content-card admin-tools platform-access">
   <div className="section-heading"><div><p className="eyebrow">SECURITY & ACCOUNTS</p><h2>Platform Access</h2><p className="muted">Manage who can sign in, their school role, and their password.</p></div><ShieldCheck size={20} className="heading-icon"/></div>
   <div className="account-toolbar">
    <div className="account-search"><input value={accountSearch} onChange={e=>setAccountSearch(e.target.value)} placeholder="Search by name, email, or username" aria-label="Search accounts"/></div>
    <button type="button" className="small-secondary" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCw size={14}/> Refresh</button>
   </div>
   <div className="account-overview"><strong>{data.accounts.length} accounts</strong><span>{data.accounts.filter(a=>a.is_active).length} active</span><span>{data.accounts.filter(a=>!a.is_active).length} inactive</span><small>Developer accounts are protected.</small></div>
   <div className="account-list">{data.accounts.filter(a=>[a.full_name,a.email,a.username||'',a.role].join(' ').toLowerCase().includes(accountSearch.toLowerCase())).map(account=><article className="account-card" key={account.id}>
    <div className="account-identity"><div className="account-avatar">{(account.full_name||account.email||'?').trim().charAt(0).toUpperCase()}</div><div><strong>{account.full_name||'Unnamed account'} <span className={account.is_active?'status-active':'status-inactive'}>{account.is_active?'Active':'Inactive'}</span></strong><small>{account.email||'No email'}</small><small>{account.username?'Username: '+account.username:'No username assigned'}</small></div></div>
    <form className="account-permissions" onSubmit={e=>void saveAccount(e,account.id)}>
     <label>School role<select name="role" defaultValue={account.role} disabled={account.role==='developer'} aria-label={'Role for '+(account.full_name||account.email)}><option value="student">Student</option><option value="parent">Parent</option><option value="teacher">Teacher</option><option value="admin">Administrator</option><option value="developer">Developer</option></select></label>
     <label className="account-active-control"><input name="is_active" type="checkbox" defaultChecked={account.is_active} disabled={account.role==='developer'}/> Account active</label>
     <button className="small-primary" disabled={busy||account.role==='developer'}>Save changes</button>
    </form>
    <form className="account-password" onSubmit={e=>{e.preventDefault();const password=passwordDrafts[account.id]||'';if(password.length<8){setError('Password must be at least 8 characters.');return;}void action({action:'set_password',id:account.id,password},'Password updated. The user can keep using this password.').then(ok=>{if(ok)setPasswordDrafts(current=>({...current,[account.id]:''}));});}}>
     <label>Set password<input type="password" autoComplete="new-password" minLength={8} required value={passwordDrafts[account.id]||''} onChange={e=>setPasswordDrafts(current=>({...current,[account.id]:e.target.value}))} placeholder="Enter a new password"/></label>
     <button type="submit" className="small-secondary" disabled={busy||account.role==='developer'}>Update password</button>
    </form>
    {account.role==='developer'&&<p className="account-protected">Developer account — protected from changes here.</p>}
   </article>)}</div>
   {!loading&&!data.accounts.length&&<p className="inline-note">No accounts found.</p>}
   {!loading&&data.accounts.length>0&&!data.accounts.some(a=>[a.full_name,a.email,a.username||'',a.role].join(' ').toLowerCase().includes(accountSearch.toLowerCase()))&&<p className="inline-note">No accounts match that search.</p>}
  </section>
  {loading&&<div className="loading-row"><LoaderCircle size={17} className="spin"/> Loading developer records…</div>}
  {message&&<p className="form-success" role="status">{message}</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <p className="inline-note">New accounts are activated immediately. Give each person their username and password securely. They can keep the password assigned by the developer; changing it is optional. Passwords are never displayed after creation. Removing a teacher or student deactivates access and preserves academic history.</p>
 </div>;
}
