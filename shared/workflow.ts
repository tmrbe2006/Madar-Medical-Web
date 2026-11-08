export type VisitType='consultation'|'advice'|'followup'|'other';
export type CatalogKind='specialties'|'diagnoses'|'medicines'|'lab_tests'|'radiology_tests'|'referral_sources'|'insurance_companies'|'doses'|'routes'|'frequencies'|'durations';
export interface CatalogEntry {id:string;name:string;code:string;active:number;service_id:string}
export type Catalogs=Record<CatalogKind,CatalogEntry[]>;
export interface PatientProfile {patient_id:string;payer_type:'normal'|'insurance';insurer_id:string;plan_id:string;referral_source_id:string;referral_notes:string;deleted_at:string}
export interface Clinic {id:string;branch_id:string;name:string;specialty_id:string;active:number}
export interface DoctorAssignment {id:string;branch_id:string;clinic_id:string;doctor_id:string;active:number}
export interface BookingDetails {tariff?:Tariff;clinic_name:string;specialty_name:string;doctor_name:string;payer_type:'normal'|'insurance';insurer_id:string;insurer_name:string;plan_id:string;plan_name:string}
export interface Appointment {id:string;branch_id:string;patient_id:string;clinic_id:string;doctor_id:string;assignment_id:string;visit_type:VisitType;scheduled_at:string;status:'booked'|'in_progress'|'completed'|'cancelled';notes:string;details:string;created_by:string;created_at:string;started_at:string;completed_at:string}
export interface PrescriptionItem {medicine_id:string;name:string;strength:string;dose:string;route:string;frequency:string;duration:string}
export interface OrderItem {id:string;name:string;service_id:string}
export interface VisitLink {visit_id:string;appointment_id:string;clinic_id:string;visit_type:VisitType;details:string}
export function ageYears(birthDate:string,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date())):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||!Number.isFinite(Date.parse(birthDate))||new Date(birthDate).toISOString().slice(0,10)!==birthDate||birthDate>today)return null;
 const [y,m,d]=birthDate.split('-').map(Number),[ty,tm,td]=today.split('-').map(Number);return ty-y-(tm<m||(tm===m&&td<d)?1:0);
}
export function cairoInputDate(iso:string){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function cairoDateTimeToISO(value:string){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Invalid Cairo date and time / موعد غير صالح');const target=Date.parse(value+':00Z');if(!Number.isFinite(target)||new Date(target).toISOString().slice(0,16)!==value)throw Error('Invalid date');let instant=target;for(let i=0;i<4;i++){const displayed=Date.parse(cairoInputDate(new Date(instant).toISOString())+':00Z');instant+=target-displayed;if(cairoInputDate(new Date(instant).toISOString())===value)return new Date(instant).toISOString();}throw Error('This local time is unavailable because of a clock change / الموعد غير متاح بسبب تغيير الساعة');}

export interface Tariff {contract_price?:number;patient_bp?:number;id:string;assignment_id:string;visit_type:VisitType;service_id:string;price:number;doctor_bp:number}
