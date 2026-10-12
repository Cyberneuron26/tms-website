import { z } from 'zod';
import type { SiteData } from './types';
const txt = z.string().default('');
const url = z.union([z.literal(''), z.url().refine(v=>v.startsWith('https://'), 'HTTPS required')]).default('');
const date = z.union([z.literal(''), z.iso.date()]).default('');
const yn = z.enum(['TRUE','FALSE','true','false','1','0','']).transform(v=>v==='TRUE'||v==='true'||v==='1');
const student = z.object({student_id:z.string().min(1),display_name:z.string().min(1),class:txt,section:txt,academic_year:txt,photo_url:url,is_public:yn,updated_at:txt});
const teacher = z.object({teacher_id:z.string().min(1),name:z.string().min(1),designation:txt,subjects:txt,classes:txt,biography:txt,photo_url:url,official_contact:txt,is_public:yn,updated_at:txt});
const notice = z.object({notification_id:z.string().min(1),title:z.string().min(1),message:txt,category:txt,publish_date:date,expiry_date:date,attachment_url:url,is_pinned:yn,status:txt,updated_at:txt});
const event = z.object({event_id:z.string().min(1),title:z.string().min(1),description:txt,start_date:date,end_date:date,location:txt,status:txt});
export function objects(rows:string[][]):Record<string,string>[] { const [head,...body]=rows; if (!head) return []; return body.filter(r=>r.some(v=>v?.trim())).map(r=>Object.fromEntries(head.map((h,i)=>[h.trim(),r[i]?.trim()??'']))); }
export function records<T>(rows:string[][],schema:z.ZodType<T>,key:keyof T):T[] { const seen=new Set<string>();const result:T[]=[];for(const raw of objects(rows)){const parsed=schema.safeParse(raw);if(!parsed.success){console.warn('Skipping invalid record',parsed.error.issues.map(i=>i.path.join('.')));continue;}const id=String(parsed.data[key]);if(seen.has(id)){console.warn('Duplicate record omitted',id);continue;}seen.add(id);result.push(parsed.data);}return result; }
export function parseWorkbook(sheets:Record<string,string[][]>):SiteData {
 const kv=(name:string)=>Object.fromEntries(objects(sheets[name]??[]).filter(r=>r.field).map(r=>[r.field,r.value??'']));
 return {school:kv('SchoolInfo'),settings:kv('SiteSettings'),students:records(sheets.Students??[],student,'student_id'),teachers:records(sheets.Teachers??[],teacher,'teacher_id'),notices:records(sheets.Notifications??[],notice,'notification_id'),events:records(sheets.Events??[],event,'event_id')};
}
export function activeNotices(notices:SiteData['notices'], today=new Date().toISOString().slice(0,10)){return notices.filter(n=>n.status.toLowerCase()==='published'&&(!n.publish_date||n.publish_date<=today)&&(!n.expiry_date||n.expiry_date>=today)).sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned)||b.publish_date.localeCompare(a.publish_date));}
export function visibleStudents(d:SiteData){return d.settings.public_student_directory==='TRUE'?d.students.filter(s=>s.is_public):[];}
export function searchRows<T>(rows:T[],q:string,extract:(x:T)=>string){return rows.filter(x=>extract(x).toLowerCase().includes(q.toLowerCase()));}
