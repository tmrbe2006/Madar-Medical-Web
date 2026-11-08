import type {Role} from './types.js';
export const screens=['external-services','result-approval','lab-work','radiology-work','dashboard','patients','bookings','visits','clinics','doctors','catalogs','services','billing','insurance','accounting','users','settings','roadmap'] as const;
export type Screen=typeof screens[number];
export type AccessAction='view'|'add'|'edit'|'delete';
export type Permissions=Record<Screen,Record<AccessAction,boolean>>;
export function defaultPermissions(role:Role):Permissions{
 const p=Object.fromEntries(screens.map(s=>[s,{view:false,add:false,edit:false,delete:false}])) as Permissions;
 const grant=(s:Screen,...actions:AccessAction[])=>actions.forEach(a=>p[s][a]=true);
 if(role==='lab')grant('lab-work','view','edit');if(role==='radiology')grant('radiology-work','view','edit');grant('dashboard','view');grant('roadmap','view');
 if(role==='admin'){for(const s of screens)grant(s,'view','add','edit','delete');return p;}
 if(['doctor','reception'].includes(role))grant('patients','view','add','edit');
 if(role==='reception'){grant('external-services','view','add');grant('patients','delete');grant('bookings','view','add','edit','delete');grant('visits','view');}
 if(role==='doctor')grant('visits','view','add','edit');
 if(['accountant','reception'].includes(role)){grant('billing','view','add');grant('insurance','view');}
 if(role==='accountant'){grant('billing','delete');grant('accounting','view','add');}
 return p;
}
