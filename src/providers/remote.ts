import {Fatal} from '../core/translate'
import type {TranslationProvider} from '../core/translate'
async function post(url:string,headers:Record<string,string>,body:unknown,s:AbortSignal):Promise<unknown>{
 const c=new AbortController();const to=setTimeout(()=>c.abort(),30000);s.addEventListener('abort',()=>c.abort(),{once:true})
 try{
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:c.signal})
  if(r.status===400||r.status===401||r.status===403)throw new Fatal(`Ditolak penyedia (HTTP ${r.status}). Periksa kunci, region, dan layanan yang aktif di akun.`)
  if(!r.ok)throw new Error('HTTP '+r.status) // 429 dan 5xx: dicoba ulang oleh antrean
  return await r.json()
 }finally{clearTimeout(to)}
}
export const google=(key:string):TranslationProvider=>({id:'google',label:'Google Cloud Translation (Basic v2)',maxChars:4500,async translate(t,s){
 if(!key)throw new Fatal('Kunci API belum diisi.')
 const j=await post('https://translation.googleapis.com/language/translate/v2',{'X-goog-api-key':key},{q:t,source:'en',target:'id',format:'text'},s) as {data?:{translations?:{translatedText:string}[]}}
 const r=j.data?.translations?.map(x=>x.translatedText)
 if(!r)throw new Fatal('Respons Google tidak dikenali.')
 return r}})
export const azure=(key:string,region:string):TranslationProvider=>({id:'azure',label:'Microsoft Azure AI Translator',maxChars:10000,async translate(t,s){
 if(!key)throw new Fatal('Kunci API belum diisi.')
 const h:Record<string,string>={'Ocp-Apim-Subscription-Key':key};if(region)h['Ocp-Apim-Subscription-Region']=region
 const j=await post('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=id&textType=plain',h,t.map(Text=>({Text})),s) as {translations:{text:string}[]}[]
 if(!Array.isArray(j))throw new Fatal('Respons Azure tidak dikenali.')
 return j.map(x=>x.translations[0].text)}})
