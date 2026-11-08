import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';

export interface ListenOptions {
 host:string;
 port:number;
 strictPort?:boolean;
 rememberedPort?:number;
 onRetry?:(port:number,code:string)=>void;
}
/** Bind the real server directly; no separate port probe and no race with another app. */
export async function listenWithFallback(server:Server,options:ListenOptions):Promise<number>{
 if(!Number.isInteger(options.port)||options.port<0||options.port>65535)throw new Error('PORT must be an integer from 0 to 65535.');
 const cached=options.rememberedPort;
 const cachedPorts=typeof cached==='number'&&Number.isInteger(cached)&&cached>0&&cached<=65535?[cached]:[];
 const candidates=options.strictPort||options.port===0?[options.port]:[...cachedPorts,options.port,0];
 const ports=[...new Set(candidates)];
 for(let i=0;i<ports.length;i++){
  try{return await new Promise<number>((resolve,reject)=>{
   const cleanup=()=>{server.removeListener('error',onError);server.removeListener('listening',onListening);};
   const onError=(error:Error)=>{cleanup();reject(error);};
   const onListening=()=>{cleanup();resolve((server.address() as AddressInfo).port);};
   server.once('error',onError);server.once('listening',onListening);
   try{server.listen(ports[i],options.host);}catch(e){cleanup();reject(e);}
  });}catch(e){const code=(e as NodeJS.ErrnoException).code||'UNKNOWN';
   if(!['EACCES','EADDRINUSE'].includes(code)||i===ports.length-1)throw e;
   options.onRetry?.(ports[i],code);
  }
 }
 throw Error('No usable port');
}
