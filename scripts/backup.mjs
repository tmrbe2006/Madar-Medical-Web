import 'dotenv/config';
import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
if(process.env.DB_ENGINE&&process.env.DB_ENGINE!=='sqlite')throw Error('Use native MySQL / SQL Server backup tools for this provider.');
const path=resolve(process.env.DB_PATH||'data/madar-web.db');
if(!existsSync(path))throw Error('No database yet. Complete first setup before backup.');
mkdirSync('backups',{recursive:true});
const destination=join('backups','madar-web-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');
const db=new DatabaseSync(path,{readOnly:true});
try{await backup(db,destination);const saved=new DatabaseSync(destination);try{saved.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE');}finally{saved.close();}console.log('Consistent backup saved:',resolve(destination));}finally{db.close();}
