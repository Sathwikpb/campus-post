const prefix='campus-mail-session-';
export function boundedMessages(messages,maxBytes=3_000_000,maxCount=500){
 const saved=[];let bytes=0;
 for(const mail of messages){const size=new TextEncoder().encode(JSON.stringify(mail)).length;if(saved.length>=maxCount)break;if(bytes+size>maxBytes)continue;saved.push(mail);bytes+=size;}
 return saved;
}
export async function saveMailSession(area,tabId,accountKey,messages,selectedKey,lastScan=0){
 if(!area||!tabId||!accountKey)return;
 const key=prefix+tabId,all=await area.get(null),payload={accountKey,messages:boundedMessages(messages),selectedKey,lastScan,updatedAt:Date.now()};
 const other=Object.entries(all).filter(([k])=>k.startsWith(prefix)&&k!==key).sort((a,b)=>(a[1].updatedAt||0)-(b[1].updatedAt||0));
 let total=new TextEncoder().encode(JSON.stringify(payload)+JSON.stringify(other)).length;
 while(total>6_000_000&&other.length){const [old,value]=other.shift();await area.remove(old);total-=new TextEncoder().encode(JSON.stringify(value)).length;}
 await area.set({[key]:payload});
}
export async function restoreMailSession(area,tabId,accountKey){
 if(!area||!tabId||!accountKey)return null;
 const key=prefix+tabId,saved=(await area.get(key))[key];
 return saved?.accountKey===accountKey&&Array.isArray(saved.messages)?saved:null;
}
