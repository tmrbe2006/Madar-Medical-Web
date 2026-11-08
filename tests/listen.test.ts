import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createServer,type Server} from 'node:http';
import {once} from 'node:events';
import type {AddressInfo} from 'node:net';
import {listenWithFallback} from '../server/listen.js';
class FakeServer extends EventEmitter {
 attempts:number[]=[];selected=0;
 constructor(private failures:(string|undefined)[]){super();}
 listen(port:number,_host:string){this.attempts.push(port);const code=this.failures.shift();queueMicrotask(()=>{if(code)this.emit('error',Object.assign(Error(code),{code}));else{this.selected=port||54321;this.emit('listening');}});return this;}
 address(){return {port:this.selected};}
}
const fake=(failures:(string|undefined)[])=>new FakeServer(failures);
test('EACCES on Windows preferred port falls back without an unhandled error',async()=>{const s=fake(['EACCES',undefined]),retries:string[]=[];assert.equal(await listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port:3000,onRetry:(_,code)=>retries.push(code)}),54321);assert.deepEqual(s.attempts,[3000,0]);assert.deepEqual(retries,['EACCES']);assert.equal(s.listenerCount('error'),0);assert.equal(s.listenerCount('listening'),0);});
test('uses a remembered fallback first to preserve the PWA origin',async()=>{const s=fake([undefined]);assert.equal(await listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port:3000,rememberedPort:54321}),54321);assert.deepEqual(s.attempts,[54321]);});
test('remembered and preferred ports both blocked still falls back',async()=>{const s=fake(['EADDRINUSE','EACCES',undefined]);await listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port:3000,rememberedPort:54320});assert.deepEqual(s.attempts,[54320,3000,0]);});
test('strict preview/configuration honors exact port instead of silently changing it',async()=>{const s=fake(['EACCES']);await assert.rejects(listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port:3000,rememberedPort:54321,strictPort:true}),{code:'EACCES'});assert.deepEqual(s.attempts,[3000]);});
test('unrelated host error is not hidden by retries',async()=>{const s=fake(['EADDRNOTAVAIL']);await assert.rejects(listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port:3000}),{code:'EADDRNOTAVAIL'});assert.deepEqual(s.attempts,[3000]);});
test('invalid port fails before attempting to bind',async()=>{for(const port of [-1,65536,NaN,1.5]){const s=fake([]);await assert.rejects(listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port}));assert.deepEqual(s.attempts,[]);}});
test('port zero remains explicitly ephemeral even if a remembered port exists',async()=>{const s=fake([undefined]);await listenWithFallback(s as unknown as Server,{host:'127.0.0.1',port:0,rememberedPort:54321});assert.deepEqual(s.attempts,[0]);});
test('a genuinely occupied TCP port starts the real web server on an available port',async()=>{const occupied=createServer();occupied.listen(0,'127.0.0.1');await once(occupied,'listening');const port=(occupied.address() as AddressInfo).port;const app=createServer((_req,res)=>res.end('Madar fallback works'));try{const actual=await listenWithFallback(app,{host:'127.0.0.1',port});assert.notEqual(actual,port);assert.equal(await (await fetch(`http://127.0.0.1:${actual}`)).text(),'Madar fallback works');}finally{app.closeAllConnections();await new Promise<void>(r=>app.close(()=>r()));await new Promise<void>(r=>occupied.close(()=>r()));}});
