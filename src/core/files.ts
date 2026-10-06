import {Capacitor} from '@capacitor/core'
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem'
import {Share} from '@capacitor/share'
const CH=400_000
export async function saveText(name:string,text:string){
 if(Capacitor.isNativePlatform()){
  let i=0,first=true
  while(i<text.length||first){let e=Math.min(i+CH,text.length);const c=text.charCodeAt(e-1);if(e<text.length&&c>=0xd800&&c<=0xdbff)e--
   const o={path:name,data:text.slice(i,e),directory:Directory.Cache,encoding:Encoding.UTF8}
   if(first)await Filesystem.writeFile(o);else await Filesystem.appendFile(o)
   first=false;i=e}
  const {uri}=await Filesystem.getUri({path:name,directory:Directory.Cache})
  await Share.share({title:name,url:uri,dialogTitle:'Simpan cadangan'});return
 }
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click()
 setTimeout(()=>URL.revokeObjectURL(a.href),5000)
}
