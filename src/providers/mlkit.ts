import {Translation,Language} from '@capacitor-mlkit/translation'
import {Fatal} from '../core/translate'
import type {TranslationProvider} from '../core/translate'
let ready:Promise<void>|null=null
async function ensureModels(){
 const {languages}=await Translation.getDownloadedModels()
 for(const l of [Language.English,Language.Indonesian])if(!languages.includes(l))await Translation.downloadModel({language:l})
}
// Terjemahan di perangkat (Google ML Kit). Model diunduh sekali, setelah itu bisa offline.
export const mlkit:TranslationProvider={id:'mlkit',label:'ML Kit (offline, gratis)',maxChars:3000,async translate(t,s){
 try{await (ready??=ensureModels())}catch(e){ready=null;throw new Fatal('Gagal menyiapkan model bahasa ML Kit. Pastikan internet aktif untuk unduhan pertama dan ruang penyimpanan cukup. '+(e instanceof Error?e.message:''))}
 const out:string[]=[]
 for(const x of t){
  if(s.aborted)throw new DOMException('batal','AbortError')
  out.push((await Translation.translate({text:x,sourceLanguage:Language.English,targetLanguage:Language.Indonesian})).text)}
 return out}}
