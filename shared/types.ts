import type {Permissions} from './access.js';
import type {Appointment,Catalogs,Clinic,DoctorAssignment,PatientProfile,PrescriptionItem,OrderItem,VisitLink,Tariff} from './workflow.js';
export type Role='admin'|'doctor'|'accountant'|'reception'|'pharmacist'|'lab'|'radiology'|'nurse'|'hr';
export interface User {id:string;username:string;role:Role;branch_id:string;password?:string;active?:number;display_name?:string;branch_ids?:string[];permissions?:Permissions}
export interface Branch {id:string;name:string;company:string}
export interface Patient extends Partial<PatientProfile> {id:string;name:string;phone:string;birth_date:string;allergies:string;created_at:string;age_years?:number|null}
export interface VisitNotes {complaint:string;diagnosis:string;examination:string;treatment:string;prescription:string;lab_request:string;radiology_request:string;follow_up:string;allergies:string;patient_name?:string;patient_birth_date?:string;patient_age_years?:number|null;diagnosis_id?:string;diagnosis_notes?:string;prescriptions?:PrescriptionItem[];lab_orders?:OrderItem[];radiology_orders?:OrderItem[]}
export interface Visit {id:string;branch_id:string;patient_id:string;doctor_id:string;payload:string;created_at:string;link?:VisitLink}
export interface Service {id:string;name:string;category:string;price:number;doctor_bp:number;code?:string;active?:number}
export interface Plan {id:string;name:string;payload:string}
export interface PlanRules {rates:Record<string,[number,number]>;valid_from:string;valid_to:string;insurer_id?:string;active?:number}
export interface Account {id:string;name:string;category:string;parent_id:string;postable:number}
export interface Journal {id:string;branch_id:string;source_id:string;memo:string;created_at:string}
export interface JournalLine {id:string;journal_id:string;account_id:string;debit:number;credit:number;party:string}
export interface Payment {id:string;document_id:string;branch_id:string;payer:'patient'|'insurer';amount:number;created_at:string}
export interface Audit {id:string;user_id:string;action:string;entity_id:string;branch_id:string;created_at:string}
export interface Settings {logo?:string;theme?:string;skin?:string;facility:string;closed_through:string;modules:string[]}
export interface QuoteItem {service_id:string;name:string;qty:number;unit_price:number;total:number;patient_due:number;insurer_due:number;doctor_bp:number;doctor_due:number}
export interface Quote {items:QuoteItem[];gross:number;discount:number;total:number;patient_due:number;insurer_due:number;doctor_due:number;plan_id:string}
export interface Invoice {id:string;branch_id:string;kind:string;party:string;visit_id:string;payload:string;total:number;patient_due:number;insurer_due:number;doctor_due:number;status:string;created_at:string}
export interface DoctorProfile {id:string;name:string;code:string;specialty_id:string;phone:string;user_id:string;active:number}
export interface ServiceResult {request_id:string;payload:string;status:'draft'|'submitted'|'approved';version:number;entered_by:string;entered_name:string;reviewed_by:string;reviewed_name:string;review_note:string;approved_at:string;updated_at:string}
export interface LabParameter {id?:string;parameter:string;unit:string;reference:string}
export interface ExamDefinition {schema_version?:number;managed?:boolean;source_url?:string;source_checked?:string;published_adult?:boolean;kind:string;description:string;reference_context:string;rows:LabParameter[]}
export interface RequestDetails {source:string;definition:ExamDefinition;booking_id?:string;scheduled_at?:string;notes?:string;patient_name?:string}
export interface ServiceRequest {patient_age_years?:number|null;details?:RequestDetails;attachments?:{id:string;filename:string;mime:string;bytes:number}[];clinic_name?:string;doctor_name?:string;result?:ServiceResult;id:string;visit_id:string;branch_id:string;patient_id:string;department:'lab'|'radiology';catalog_id:string;name:string;status:'requested'|'received'|'in_progress'|'completed';created_at:string;updated_at:string}
export interface Snapshot {external_patients?:{id:string;name:string;phone:string}[];exam_definitions?:Record<string,ExamDefinition>;service_requests?:ServiceRequest[];tariffs?:Tariff[];doctor_profiles?:DoctorProfile[];csrf:string;branch_id:string;settings:Settings;engine:string;demo:boolean;user:User;branches:Branch[];patients:Patient[];patient_names:Pick<Patient,'id'|'name'>[];visits:Visit[];services:Service[];plans:Plan[];documents:Invoice[];accounts:Account[];journals:Journal[];lines:JournalLine[];payments:Payment[];audit:Audit[];doctors:(Pick<User,'id'|'username'|'branch_id'> & {display_name?:string})[];catalogs:Catalogs;clinics:Clinic[];assignments:DoctorAssignment[];appointments:Appointment[];archived_patients:Patient[]}
export interface InvoiceInput {branch_id:string;visit_id:string;plan_id:string;discount:string|number;items:{service_id:string;qty:number}[]}
export type JsonInput=Record<string,unknown>;
