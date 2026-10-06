import {useEffect,useState} from 'react'
import {nativeOnly,getKey,setKey,getUsage,buildProvider} from './providers/config'
import type {Cfg} from './providers/config'
export default function ApiPanel({cfg,onSave}:{cfg:Cfg;onSave:(c:Cfg)=>void}){
 const[c,setC]=useState(cfg);const[key,setK]=useState('');const[has,setHas]=useState(false);const[used,setU]=useState(0);const[test,setTest]=useState('')
 async function runTest(){setTest('Menguji…')
  try{if(key&&c.id!=='mock'&&c.id!=='mlkit'){await setKey(c.id,key);setK('');setHas(true)}
   const p=await buildProvider(c);const r=await p.translate(['Hello, world. This is a short test.'],new AbortController().signal)
   setTest('Berhasil: '+r[0]);setU(await getUsage(c.id))}catch(e){setTest('Gagal: '+(e instanceof Error?e.message:String(e)))}}
 useEffect(()=>{if(c.id==='mock')return;void getKey(c.id).then(k=>setHas(!!k));void getUsage(c.id).then(setU)},[c.id])
 if(!nativeOnly)return<p className="muted small">Terjemahan nyata hanya tersedia di aplikasi Android (APK). Di PWA kunci API tidak bisa dijaga kerahasiaannya, jadi hanya penyedia MOCK yang aktif.</p>
 return<>
  <label>Penyedia<select value={c.id} onChange={e=>setC({...c,id:e.target.value as Cfg['id']})}><option value="mock">MOCK (uji)</option><option value="mlkit">ML Kit (offline, gratis)</option><option value="google">Google Cloud Translation</option><option value="azure">Azure AI Translator</option></select></label>
  {c.id==='mlkit'&&<small className="muted">Terjemahan di perangkat memakai Google ML Kit. Model bahasa Inggris dan Indonesia diunduh sekali (unduhan pertama butuh internet dan ruang penyimpanan), setelah itu bisa offline. Teks tidak dikirim ke server. Kualitas cocok untuk terjemahan sederhana; untuk hasil lebih halus gunakan penyedia cloud.</small>}
  {c.id!=='mock'&&c.id!=='mlkit'&&<>
   <label>Kunci API {has?'(tersimpan)':''}<input type="password" autoComplete="off" value={key} placeholder={has?'••••••':'tempel kunci'} onChange={e=>setK(e.target.value)}/></label>
   {c.id==='azure'&&<label>Region<input value={c.region} placeholder="mis. southeastasia" onChange={e=>setC({...c,region:e.target.value})}/></label>}
   <label>Batas karakter (0 = tanpa batas)<input type="number" min="0" value={c.limit} onChange={e=>setC({...c,limit:+e.target.value})}/></label>
   <small className="muted">Terpakai lewat aplikasi ini: {used.toLocaleString('id-ID')} karakter. Teks yang diterjemahkan dikirim ke penyedia dan diproses sesuai kebijakannya. Cek biaya dan kuota di akun penyedia.</small></>}
  <button className="btn sm" onClick={()=>void runTest()}>Tes koneksi</button>{test&&<small className="muted">{test}</small>}
  <button className="btn" onClick={()=>{void (async()=>{if(key&&c.id!=='mock')await setKey(c.id,key);setK('');setHas(true);onSave(c)})()}}>Simpan</button></>
}
