import 'dotenv/config';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {openDatabase} from './db.js';
import {Core} from './core.js';
const db=await openDatabase();await db.init();const io=createInterface({input:stdin,output:stdout});
try{const username=await io.question('Administrator username: ');console.log('The password is entered visibly in this CLI. The web first-setup screen masks it.');const password=await io.question('Password (4+ characters): ');await db.transaction(()=>new Core(db).setup(username,password));console.log('Administrator created. Start the web server.');}finally{io.close();await db.close();}
