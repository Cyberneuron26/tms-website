export type Student = { student_id:string; display_name:string; class:string; section:string; academic_year:string; photo_url:string; is_public:boolean; updated_at:string };
export type Teacher = { teacher_id:string; name:string; designation:string; subjects:string; classes:string; biography:string; photo_url:string; official_contact:string; is_public:boolean; updated_at:string };
export type Notice = { notification_id:string; title:string; message:string; category:string; publish_date:string; expiry_date:string; attachment_url:string; is_pinned:boolean; status:string; updated_at:string };
export type Event = { event_id:string; title:string; description:string; start_date:string; end_date:string; location:string; status:string };
export type SiteData = { school:Record<string,string>; settings:Record<string,string>; students:Student[]; teachers:Teacher[]; notices:Notice[]; events:Event[] };
