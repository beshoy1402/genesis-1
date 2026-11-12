'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, FilePenLine, FileText, LoaderCircle, Search, Trash2, UploadCloud, X, Replace } from 'lucide-react';
import type { Role } from '@/lib/roles';

type Material = { id: string; title: string; description: string | null; storage_path: string; original_filename: string; file_type: string; file_size: number; category: string; folder:string|null; uploaded_at: string; is_published: boolean; subject_id: string; class_id: string; teacher_id: string | null; subjectName?: string; className?: string; teacherName?: string };
type Choice = { id: string; name: string };
const categoryNames: Record<string,string> = { lecture_notes:'Lecture notes', worksheets:'Worksheets', homework:'Homework', revision:'Revision materials', presentations:'Presentations', exam_papers:'Exam papers', study_guides:'Study guides', other:'Other resources' };
const extensions = new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx','jpg','jpeg','png','txt','zip']);
const mimeTypes:Record<string,string>={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',txt:'text/plain',zip:'application/zip'};
const maxSize = 50 * 1024 * 1024;

function formatBytes(value: number) { return value > 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1,Math.round(value / 1024))} KB`; }

export function MaterialLibrary({ role }: { role: Role }) {
  const [materials,setMaterials] = useState<Material[]>([]); const [classes,setClasses] = useState<Choice[]>([]); const [subjects,setSubjects] = useState<Choice[]>([]);
  const [teacherId,setTeacherId] = useState(''); const [loading,setLoading] = useState(true); const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [error,setError] = useState(''); const [search,setSearch] = useState('');
  const sb = useMemo(() => createClient(), []);

  const refresh=useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from('learning_materials').select('*').order('uploaded_at',{ascending:false});
    const rows=(data||[]) as Material[];
    const subjectIds=[...new Set(rows.map((row)=>row.subject_id))]; const classIds=[...new Set(rows.map((row)=>row.class_id))]; const teacherIds=[...new Set(rows.map((row)=>row.teacher_id).filter((id):id is string=>Boolean(id)))];
    const [{data:subjectRows},{data:classRows},{data:teacherRows}]=await Promise.all([
      subjectIds.length?sb.from('subjects').select('id,name').in('id',subjectIds):Promise.resolve({data:[]}),
      classIds.length?sb.from('school_classes').select('id,name').in('id',classIds):Promise.resolve({data:[]}),
      teacherIds.length?sb.from('teachers').select('id,profile_id').in('id',teacherIds):Promise.resolve({data:[]}),
    ]);
    const profileIds=[...new Set((teacherRows||[]).map((row)=>row.profile_id))];
    const {data:profiles}=profileIds.length?await sb.from('profiles').select('id,full_name').in('id',profileIds):{data:[]};
    const subjectNames=new Map((subjectRows||[]).map((row)=>[row.id,row.name])); const classNames=new Map((classRows||[]).map((row)=>[row.id,row.name]));
    const profileNames=new Map((profiles||[]).map((row)=>[row.id,row.full_name])); const teacherNames=new Map((teacherRows||[]).map((row)=>[row.id,profileNames.get(row.profile_id)||'Teacher']));
    setMaterials(rows.map((row)=>({...row,subjectName:subjectNames.get(row.subject_id)||'Subject',className:classNames.get(row.class_id)||'Class',teacherName:row.teacher_id?teacherNames.get(row.teacher_id)||'Teacher':'School'}))); setLoading(false);
  },[sb]);
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { user } } = await sb.auth.getUser();
      if (!alive || !user) { setLoading(false); return; }
      const { data: teacher } = await sb.from('teachers').select('id').eq('profile_id',user.id).maybeSingle();
      if (teacher && alive) {
        setTeacherId(teacher.id);
        const { data: links } = await sb.from('teacher_class_subjects').select('class_id,subject_id').eq('teacher_id',teacher.id);
        const classIds = [...new Set((links || []).map((link) => link.class_id))]; const subjectIds = [...new Set((links || []).map((link) => link.subject_id))];
        if (classIds.length) { const { data } = await sb.from('school_classes').select('id,name').in('id',classIds).order('name'); if (alive) setClasses(data || []); }
        if (subjectIds.length) { const { data } = await sb.from('subjects').select('id,name').in('id',subjectIds).order('name'); if (alive) setSubjects(data || []); }
      } else if (role==='admin' && alive) {
        const [{data:classRows},{data:subjectRows}]=await Promise.all([sb.from('school_classes').select('id,name').order('name'),sb.from('subjects').select('id,name').order('name')]);
        if(alive){setClasses(classRows||[]);setSubjects(subjectRows||[]);}
      }
      await refresh();
    }
    void load(); return () => { alive = false; };
  },[sb,role,refresh]);

  const visible = materials.filter((item) => `${item.title} ${item.description || ''} ${item.original_filename} ${categoryNames[item.category] || ''}`.toLowerCase().includes(search.toLowerCase()));

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget); const classId = String(form.get('class_id') || ''); const subjectId = String(form.get('subject_id') || '');
    const title = String(form.get('title') || '').trim(); const description = String(form.get('description') || '').trim(); const category = String(form.get('category') || 'other'); const folder=String(form.get('folder')||'').trim()||null; const fileInput=event.currentTarget.elements.namedItem('files') as HTMLInputElement; const files = Array.from(fileInput.files || []);
    if (!files.length || !classId || !subjectId || !title || (role==='teacher'&&!teacherId)) { setError('Choose an assigned class, subject, title, and at least one file.'); setBusy(false); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Your session has expired. Sign in again.'); setBusy(false); return; }
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!extensions.has(ext) || file.size > maxSize || file.size === 0) { setError(`${file.name} is unsupported or exceeds the 50 MB limit.`); setBusy(false); return; }
    }
    let saved = 0;
    for (const file of files) {
      const ext=file.name.split('.').pop()?.toLowerCase()||'';
      const contentType=file.type||mimeTypes[ext]||'application/octet-stream';
      const id = crypto.randomUUID(); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path = `${classId}/${user.id}/${id}/${safeName}`;
      const { error: uploadError } = await sb.storage.from('learning-materials').upload(path,file,{contentType,upsert:false});
      if (uploadError) { setError(`Could not upload ${file.name}: ${uploadError.message}`); break; }
      const published = form.get('publish') === 'on';
      const { error: rowError } = await sb.from('learning_materials').insert({ id,title: files.length > 1 ? `${title} · ${file.name}` : title,description,folder,storage_path:path,original_filename:file.name,file_type:contentType,file_size:file.size,category,subject_id:subjectId,class_id:classId,teacher_id:role==='admin'?null:teacherId,is_published:published,published_at:published ? new Date().toISOString() : null });
      if (rowError) { await sb.storage.from('learning-materials').remove([path]); setError(`File saved but its record could not be created: ${rowError.message}`); break; }
      saved++;
    }
    setBusy(false);
    if (saved) { setMessage(`${saved} learning material${saved===1?'':'s'} ${form.get('publish') === 'on'?'published':'saved as draft'}.`); (event.currentTarget as HTMLFormElement).reset(); await refresh(); }
  }

  async function download(item: Material) {
    setError(''); const { data,error: urlError } = await sb.storage.from('learning-materials').createSignedUrl(item.storage_path,60);
    if (urlError || !data?.signedUrl) { setError('This file is unavailable or your account does not have access.'); return; }
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }

  async function edit(item:Material){const title=window.prompt('Material title',item.title);if(title===null)return;const description=window.prompt('Description',item.description||'');if(description===null)return;if(!title.trim()){setError('Title cannot be empty.');return;}setBusy(true);const {error:editError}=await sb.from('learning_materials').update({title:title.trim(),description:description.trim()||null}).eq('id',item.id);setBusy(false);if(editError)setError(`Could not update this material: ${editError.message}`);else{setMessage('Material details updated.');await refresh();}}

  async function replaceFile(item:Material,file:File){setBusy(true);setError('');setMessage('');const ext=file.name.split('.').pop()?.toLowerCase()||'';if(!extensions.has(ext)||file.size===0||file.size>maxSize){setError('Choose a supported file no larger than 50 MB.');setBusy(false);return;}const {data:{user}}=await sb.auth.getUser();if(!user){setError('Your session has expired. Sign in again.');setBusy(false);return;}const id=crypto.randomUUID();const filename=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${item.class_id}/${user.id}/${id}/${filename}`;const type=file.type||mimeTypes[ext]||'application/octet-stream';const {error:uploadError}=await sb.storage.from('learning-materials').upload(path,file,{contentType:type,upsert:false});if(uploadError){setError(`Could not upload the replacement: ${uploadError.message}`);setBusy(false);return;}const {error:updateError}=await sb.from('learning_materials').update({storage_path:path,original_filename:file.name,file_type:type,file_size:file.size,uploaded_at:new Date().toISOString()}).eq('id',item.id);if(updateError){await sb.storage.from('learning-materials').remove([path]);setError(`The material record could not be updated: ${updateError.message}`);setBusy(false);return;}const {error:cleanupError}=await sb.storage.from('learning-materials').remove([item.storage_path]);setBusy(false);if(cleanupError)setError(`The replacement is active, but the old file could not be cleaned up: ${cleanupError.message}`);else setMessage('Learning material replaced.');await refresh();}

  async function remove(item: Material) {
    if (!window.confirm(`Delete “${item.title}” and its stored file?`)) return;
    setBusy(true); const { error: fileError } = await sb.storage.from('learning-materials').remove([item.storage_path]);
    if (fileError) { setError(`The stored file could not be removed: ${fileError.message}`); setBusy(false); return; }
    const { error: rowError } = await sb.from('learning_materials').delete().eq('id',item.id);
    if (rowError) setError(`The file was removed but the record could not be deleted: ${rowError.message}`); else { setMessage('Learning material deleted.'); await refresh(); }
    setBusy(false);
  }

  return <section id="learning-materials" className="content-card materials-section">
    <div className="section-heading"><div><p className="eyebrow">THE RESOURCE LIBRARY</p><h2>{role === 'teacher' || role === 'admin' ? 'Learning Materials & Files' : 'Learning Materials'}</h2><p className="muted">Private, class-based resources from your school community.</p></div><span className="section-count">{materials.length} files</span></div>
    {(role === 'teacher' || role === 'admin') && <form className="upload-panel" onSubmit={upload}>
      <div className="upload-title"><UploadCloud size={19}/><strong>Share a learning resource</strong><span>50 MB maximum · PDF, Office, images, TXT, ZIP</span></div>
      <div className="upload-grid"><div><label htmlFor="material-title">Title</label><input id="material-title" name="title" required maxLength={120} placeholder="e.g. Fractions — practice sheet"/></div>
        <div><label htmlFor="material-class">Class</label><select id="material-class" name="class_id" required defaultValue=""><option value="" disabled>Select assigned class</option>{classes.map((c)=><option value={c.id} key={c.id}>{c.name}</option>)}</select></div>
        <div><label htmlFor="material-subject">Subject</label><select id="material-subject" name="subject_id" required defaultValue=""><option value="" disabled>Select subject</option>{subjects.map((s)=><option value={s.id} key={s.id}>{s.name}</option>)}</select></div>
        <div><label htmlFor="material-category">Category</label><select id="material-category" name="category" defaultValue="other">{Object.entries(categoryNames).map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></div>
        <div className="upload-description"><label htmlFor="material-description">Description <span className="muted">(optional)</span></label><input id="material-description" name="description" maxLength={500} placeholder="What students will learn or practise"/></div>
        <div><label htmlFor="material-folder">Folder <span className="muted">(optional)</span></label><input id="material-folder" name="folder" maxLength={80} placeholder="e.g. Week 3 / Revision"/></div>
        <div className="file-picker"><label htmlFor="material-files">Files</label><input id="material-files" name="files" type="file" multiple required accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"/></div>
      </div>
      <label className="publish-check"><input type="checkbox" name="publish" defaultChecked/><span>Publish now and notify students and linked parents</span></label>
      <button className="small-primary" disabled={busy || !classes.length || !subjects.length}>{busy ? <><LoaderCircle size={15} className="spin"/> Uploading</> : <><UploadCloud size={15}/> Upload files</>}</button>
      {(!classes.length || !subjects.length) && <p className="inline-note">Your account needs an assigned class and subject before you can upload.</p>}
    </form>}
    <div className="material-search"><Search size={16}/><input aria-label="Search learning materials" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search resources"/>{search&&<button aria-label="Clear search" onClick={()=>setSearch('')}><X size={14}/></button>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
    {loading ? <div className="loading-row"><LoaderCircle size={18} className="spin"/> Loading resources…</div> : visible.length === 0 ? <div className="empty-state"><FileText size={24}/><strong>{search ? 'No matching resources' : 'No learning materials yet'}</strong><span>New resources shared with your class will appear here.</span></div> : <div className="material-list">{visible.map((item)=><article className="material-row" key={item.id}>
      <div className="file-icon"><FileText size={19}/></div><div className="material-info"><div className="material-title-row"><strong>{item.title}</strong>{!item.is_published&&<span className="draft-pill">Draft</span>}</div><p>{item.description || item.original_filename}</p><div className="material-meta"><span>{item.subjectName}</span><span>{item.teacherName}</span><span>{categoryNames[item.category]||'Resource'}</span>{item.folder&&<span>{item.folder}</span>}<span>{new Date(item.uploaded_at).toLocaleDateString()}</span><span>{formatBytes(Number(item.file_size))}</span></div></div>
      <div className="material-actions"><button className="icon-button" onClick={()=>void download(item)} aria-label={`Download ${item.title}`}><Download size={17}/></button>{(role==='teacher'||role==='admin')&&<><button className="icon-button" onClick={()=>void edit(item)} aria-label={`Edit ${item.title}`} disabled={busy}><FilePenLine size={16}/></button><label className="icon-button replace-button" aria-label={`Replace ${item.title}`}><Replace size={16}/><input type="file" hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip" onChange={(event)=>{const file=event.currentTarget.files?.[0];if(file)void replaceFile(item,file);event.currentTarget.value='';}}/></label><button className="icon-button danger-icon" onClick={()=>void remove(item)} aria-label={`Delete ${item.title}`} disabled={busy}><Trash2 size={16}/></button></>}</div>
    </article>)}</div>}
  </section>;
}
