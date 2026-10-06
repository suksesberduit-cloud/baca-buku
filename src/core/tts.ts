import {Capacitor} from '@capacitor/core'
import {TextToSpeech} from '@capacitor-community/text-to-speech'
import {split} from './translate'
const native=Capacitor.isNativePlatform()
let run=0
let wl:WakeLockSentinel|null=null
const lock=async()=>{try{wl=(await navigator.wakeLock?.request('screen'))??null}catch{wl=null}}
const unlock=()=>{void wl?.release().catch(()=>undefined);wl=null}
const st={texts:[] as string[],i:0,lang:'',rate:1,onIdx:(_:number)=>{},onEnd:()=>{}}
export async function hasVoice(l:string){
 if(native){try{return (await TextToSpeech.isLanguageSupported({lang:l==='id'?'id-ID':l})).supported}catch{return false}}
 return speechSynthesis.getVoices().some(v=>v.lang.toLowerCase().startsWith(l))
}
function webSpeak(id:number){
 if(id!==run)return
 if(st.i>=st.texts.length)return st.onEnd()
 const u=new SpeechSynthesisUtterance(st.texts[st.i])
 if(st.lang){u.lang=st.lang;const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(st.lang.slice(0,2)));if(v)u.voice=v}
 u.rate=st.rate;st.onIdx(st.i)
 u.onend=()=>{if(id===run){st.i++;webSpeak(id)}}
 u.onerror=e=>{if(id===run&&e.error!=='canceled'&&e.error!=='interrupted')st.onEnd()}
 speechSynthesis.speak(u)
}
async function nativeLoop(id:number){
 while(id===run&&st.i<st.texts.length){
  st.onIdx(st.i)
  try{for(const piece of split(st.texts[st.i],3500)){if(id!==run)return
   await TextToSpeech.speak({text:piece,lang:st.lang||'en-US',rate:st.rate,category:'playback',queueStrategy:0})}}
  catch{if(id===run)st.onEnd();return}
  if(id!==run)return
  st.i++
 }
 if(id===run)st.onEnd()
}
function start(){const id=++run;void lock();if(native)void nativeLoop(id);else webSpeak(id)}
export function speak(texts:string[],lang:string,rate:number,onIdx:(i:number)=>void,onEnd:()=>void){
 stop();Object.assign(st,{texts,i:0,lang,rate,onIdx,onEnd:()=>{unlock();onEnd()}});start()
}
export function stop(){run++;unlock();if(native)void TextToSpeech.stop().catch(()=>undefined);else speechSynthesis.cancel()}
// Native tidak punya jeda sungguhan: berhenti di paragraf berjalan, lanjut mengulang paragraf itu.
export function pause(){unlock();if(native){run++;void TextToSpeech.stop().catch(()=>undefined)}else speechSynthesis.pause()}
export function resume(){if(native)start();else speechSynthesis.resume()}
