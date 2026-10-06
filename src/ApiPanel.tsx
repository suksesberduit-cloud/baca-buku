import {useEffect,useState} from 'react'
import {nativeOnly,getKey,setKey,getUsage} from './providers/config'
import type {Cfg} from './providers/config'
export default function ApiPanel({cfg,onSave}:{cfg:Cfg;onSave:(c:Cfg)=>void}){
 const[c,setC]=useState(cfg);const[key,setK]=useState('');const[has,setHas]=useState(false);const[used,setU]=useState(0)
 useEffect(()=>{if(c.id==='mock')return;void getKey(c.id).then(k=>setHas(!!k));void getUsage(c.id).then(setU)},[c.id])
 if(!nativeOnly)return<p className="muted small">Terjemahan nyata hanya tersedia di aplikasi Android (APK). Di PWA kunci API tidak bisa dijaga kerahasiaannya, jadi hanya penyedia MOCK yang aktif.</p>
 return<>
  <label>Penyedia<select value={c.id} onChange={e=>setC({...c,id:e.target.value as Cfg['id']})}><option value="mock">MOCK (uji)</option><option value="google">Google Cloud Translation</option><option value="azure">Azure AI Translator</option></select></label>
  {c.id!=='mock'&&<>
   <label>Kunci API {has?'(tersimpan)':''}<input type="password" autoComplete="off" value={key} placeholder={has?'••••••':'tempel kunci'} onChange={e=>setK(e.target.value)}/></label>
   {c.id==='azure'&&<label>Region<input value={c.region} placeholder="mis. southeastasia" onChange={e=>setC({...c,region:e.target.value})}/></label>}
   <label>Batas karakter (0 = tanpa batas)<input type="number" min="0" value={c.limit} onChange={e=>setC({...c,limit:+e.target.value})}/></label>
   <small className="muted">Terpakai lewat aplikasi ini: {used.toLocaleString('id-ID')} karakter. Teks yang diterjemahkan dikirim ke penyedia dan diproses sesuai kebijakannya. Cek biaya dan kuota di akun penyedia.</small></>}
  <button className="btn" onClick={()=>{void (async()=>{if(key&&c.id!=='mock')await setKey(c.id,key);setK('');setHas(true);onSave(c)})()}}>Simpan</button></>
}
