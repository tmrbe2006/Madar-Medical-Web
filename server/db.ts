import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import type {Connection,RowDataPacket} from 'mysql2/promise';
import type {ConnectionPool,Transaction} from 'mssql';
import {schema,tables} from './schema.js';
export type Engine='sqlite'|'mysql'|'sqlserver';
export type Param=string|number|null;
const numericColumns=new Set(['bytes','version','value','active','price','doctor_bp','total','patient_due','insurer_due','doctor_due','postable','debit','credit','amount']);
export function normalizeRows(rows:Record<string,unknown>[]){return rows.map(row=>{for(const key of Object.keys(row))if(numericColumns.has(key)){const value=Number(row[key]);if(!Number.isSafeInteger(value))throw Error('Unsafe database integer');row[key]=value;}return row;});}
export interface DB {
 engine:Engine;all<T>(sql:string,args?:Param[]):Promise<T[]>;run(sql:string,args?:Param[]):Promise<void>;insert(table:string,data:object):Promise<void>;transaction<T>(fn:()=>Promise<T>):Promise<T>;init():Promise<void>;close():Promise<void>;
}
export async function openDatabase(options:{engine?:Engine;path?:string}={}):Promise<DB>{
 const engine=options.engine||(process.env.DB_ENGINE as Engine)||'sqlite';
 let sqlite:DatabaseSync|undefined,mysql:Connection|undefined,pool:ConnectionPool|undefined,tx:Transaction|undefined;
 if(engine==='sqlite'){const file=options.path||process.env.DB_PATH||'data/madar-web.db';if(file!==':memory:')mkdirSync(dirname(resolve(file)),{recursive:true});sqlite=new DatabaseSync(file);sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000');
  if(file!==':memory:'&&sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get()&&sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()&&sqlite.prepare('SELECT id FROM users').get()&&(!sqlite.prepare('SELECT id FROM settings WHERE id=?').get('workflow-v1')||!sqlite.prepare('SELECT id FROM settings WHERE id=?').get('administration-v1')||!sqlite.prepare('SELECT id FROM settings WHERE id=?').get('pricing-v1')||!sqlite.prepare('SELECT id FROM settings WHERE id=?').get('service-work-v1')||!sqlite.prepare('SELECT id FROM settings WHERE id=?').get('results-v1')||!sqlite.prepare('SELECT id FROM settings WHERE id=?').get('exams-v1'))){
   const folder=resolve(dirname(resolve(file)),'backups');mkdirSync(folder,{recursive:true});const destination=resolve(folder,(sqlite.prepare('SELECT id FROM settings WHERE id=?').get('results-v1')?'before-0.9.0-':sqlite.prepare('SELECT id FROM settings WHERE id=?').get('service-work-v1')?'before-0.8.0-':sqlite.prepare('SELECT id FROM settings WHERE id=?').get('pricing-v1')?'before-0.7.0-':sqlite.prepare('SELECT id FROM settings WHERE id=?').get('administration-v1')?'before-0.5.0-':sqlite.prepare('SELECT id FROM settings WHERE id=?').get('workflow-v1')?'before-0.4.0-':'before-0.3.0-')+Date.now()+'.db');await backup(sqlite,destination);const saved=new DatabaseSync(destination);try{saved.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE');}finally{saved.close();}
  }
 }

 else if(engine==='mysql'){const m=await import('mysql2/promise');mysql=await m.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4',supportBigNumbers:true,bigNumberStrings:false});}
 else if(engine==='sqlserver'){const m=(await import('mssql')).default;pool=await new m.ConnectionPool({server:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||1433),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,options:{encrypt:process.env.DB_ENCRYPT!=='false',trustServerCertificate:process.env.DB_TRUST_CERT==='true',tdsVersion:'7_3_A'}}).connect();}
 else throw Error('Unknown database engine');
 async function query(sql:string,args:Param[]=[]):Promise<Record<string,unknown>[]>{
  if(sqlite){const stmt=sqlite.prepare(sql);return stmt.columns().length?stmt.all(...args) as Record<string,unknown>[]:(stmt.run(...args),[]);}
  if(mysql){const [result]=await mysql.execute<RowDataPacket[]>(sql,args);return Array.isArray(result)?result:[];}
  const m=(await import('mssql')).default;const request=tx?new m.Request(tx):pool!.request();let i=0;sql=sql.replace(/\?/g,()=>`@p${i++}`);args.forEach((v,n)=>request.input(`p${n}`,typeof v==='number'?m.BigInt:m.NVarChar(m.MAX),v));const r=await request.query(sql);return r.recordset||[];
 }
 const db:DB={engine,all:async<T>(sql:string,args:Param[]=[])=>normalizeRows(await query(sql,args)) as T[],run:async(sql,args=[])=>{await query(sql,args);},insert:async(table,data)=>{if(!tables[table])throw Error('Unknown table');const entries=Object.entries(data);if(entries.some(([k])=>!/^\w+$/.test(k)))throw Error('Invalid column');await query(`INSERT INTO ${table} (${entries.map(([k])=>k).join(',')}) VALUES (${entries.map(()=>'?').join(',')})`,entries.map(([,v])=>v as Param));},transaction:async<T>(fn:()=>Promise<T>)=>{try{if(sqlite)sqlite.exec('BEGIN IMMEDIATE');if(mysql)await mysql.beginTransaction();if(pool){const m=(await import('mssql')).default;tx=new m.Transaction(pool);await tx.begin();}const result=await fn();if(sqlite)sqlite.exec('COMMIT');if(mysql)await mysql.commit();if(tx)await tx.commit();return result;}catch(e){if(sqlite)sqlite.exec('ROLLBACK');if(mysql)await mysql.rollback();if(tx)await tx.rollback();throw e;}finally{tx=undefined;}},init:async()=>{for(const sql of schema(engine))await query(sql);},close:async()=>{sqlite?.close();await mysql?.end();await pool?.close();}};return db;
}
// One process owns each branch DB connection; serialize even awaited provider operations.
export class Mutex {private tail:Promise<void>=Promise.resolve();async use<T>(fn:()=>Promise<T>):Promise<T>{const prev=this.tail;let done!:()=>void;this.tail=new Promise(r=>{done=r;});await prev;try{return await fn();}finally{done();}}}
