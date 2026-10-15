import {Capacitor} from '@capacitor/core'
import {TextToSpeech} from '@capacitor-community/text-to-speech'
import {sentences} from './sentences'
const native=Capacitor.isNativePlatform()
let run=0
let wl:WakeLockSentinel|null=null
const lock=async()=>{try{wl=(await navigator.wakeLock?.request('screen'))??null}catch{wl=null}}
const unlock=()=>{void wl?.release().catch(()=>undefined);wl=null}
interface Unit{p:number;a:number;b:number;text:string}
const st={units:[] as Unit[],i:0,lang:'',rate:1,onIdx:(_p:number,_a:number,_b:number)=>{},onEnd:()=>{}}
export async function hasVoice(l:string){
 if(native){try{return (await TextToSpeech.isLanguageSupported({lang:l==='id'?'id-ID':l})).supported}catch{return false}}
 return speechSynthesis.getVoices().some(v=>v.lang.toLowerCase().startsWith(l))
}
function webSpeak(id:number){
 if(id!==run)return
 if(st.i>=st.units.length)return st.onEnd()
 const un=st.units[st.i],u=new SpeechSynthesisUtterance(un.text)
 if(st.lang){u.lang=st.lang;const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(st.lang.slice(0,2)));if(v)u.voice=v}
 u.rate=st.rate;st.onIdx(un.p,un.a,un.b)
 u.onend=()=>{if(id===run){st.i++;webSpeak(id)}}
 u.onerror=e=>{if(id===run&&e.error!=='canceled'&&e.error!=='interrupted')st.onEnd()}
 speechSynthesis.speak(u)
}
async function nativeLoop(id:number){
 // Antrekan beberapa paragraf (per kalimat) sekaligus ke mesin TTS supaya terus berbicara walau JavaScript ditahan saat layar mati.
 const W=20,pending=new Map<number,Promise<unknown>>();let first=true,nx=st.i
 const enqueue=(i:number)=>{if(i>=st.units.length||pending.has(i))return
  const qs=first?0:1;first=false
  const p=TextToSpeech.speak({text:st.units[i].text,lang:st.lang||'en-US',rate:st.rate,category:'playback',queueStrategy:qs}) as Promise<unknown>
  p.catch(()=>undefined);pending.set(i,p)}
 const ahead=()=>{if(st.i>=st.units.length)return;const lim=st.units[st.i].p+W;while(nx<st.units.length&&st.units[nx].p<lim)enqueue(nx++)}
 ahead()
 while(id===run&&st.i<st.units.length){
  const u=st.units[st.i];st.onIdx(u.p,u.a,u.b)
  try{await pending.get(st.i)}catch{if(id===run)st.onEnd();return}
  if(id!==run)return
  pending.delete(st.i);st.i++;ahead()
 }
 if(id===run)st.onEnd()
}
function start(){const id=++run;void lock();if(native)void nativeLoop(id);else webSpeak(id)}
/** Membaca per kalimat. onIdx(p,a,b): kalimat teks[p].slice(a,b) mulai dibacakan. */
export function speak(texts:string[],lang:string,rate:number,onIdx:(p:number,a:number,b:number)=>void,onEnd:()=>void){
 const units=texts.flatMap((t,p)=>sentences(t).map(g=>({p,a:g.a,b:g.b,text:t.slice(g.a,g.b)})))
 stop();Object.assign(st,{units,i:0,lang,rate,onIdx,onEnd:()=>{unlock();onEnd()}});start()
}
export function stop(){run++;unlock();if(native)void TextToSpeech.stop().catch(()=>undefined);else speechSynthesis.cancel()}
// Native tidak punya jeda sungguhan: berhenti di kalimat berjalan, lanjut mengulang kalimat itu.
export function pause(){unlock();if(native){run++;void TextToSpeech.stop().catch(()=>undefined)}else speechSynthesis.pause()}
export function resume(){if(native)start();else speechSynthesis.resume()}
