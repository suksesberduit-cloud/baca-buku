import {useEffect,useRef,useState} from 'react'
import type {Book,Chapter} from './core/model'
import {sha} from './core/epub'
import {importFile} from './core/import'
import {listBooks,saveBook,loadChapter,deleteBook,kvGet,kvSet,dump,restore} from './core/db'
import {saveText} from './core/files'
import {mock,translateChapter,loadTr,estimate,bookTodo,translateBook} from './core/translate'
import type {TranslationProvider} from './core/translate'
import ApiPanel from './ApiPanel'
import Img from './Img'
import {App as CapApp} from '@capacitor/app'
import {Capacitor} from '@capacitor/core'
import {searchBook} from './core/search'
import type {Hit} from './core/search'
import {getBms,addBm,delBm} from './core/bookmarks'
import type {Bm} from './core/bookmarks'
import {buildProvider} from './providers/config'
import type {Cfg} from './providers/config'
import {speak,stop,pause,resume,hasVoice} from './core/tts'
type Mode='asli'|'terjemah'|'dua'
interface S{theme:string;size:number;lh:number;gap:number;font:string;width:number}
const DEF:S={theme:'sepia',size:19,lh:1.7,gap:0.9,font:'serif',width:40}
const FONTS:Record<string,string>={serif:'Georgia,"Noto Serif",serif',sans:'system-ui,Roboto,sans-serif',mono:'ui-monospace,Menlo,monospace'}
const THEMES:[string,string][]=[['putih','Putih'],['sepia','Sepia'],['abu','Abu-abu'],['gelap','Gelap'],['hitam','Hitam OLED']]
const errMsg=(e:unknown)=>e instanceof DOMException&&e.name==='QuotaExceededError'?'Penyimpanan perangkat penuh. Hapus buku atau data lain, lalu coba lagi.':e instanceof Error?e.message:String(e)
export default function App(){
 const[books,setBooks]=useState<Book[]>([]);const[cur,setCur]=useState<Book|null>(null)
 const[ci,setCi]=useState(0);const[ch,setCh]=useState<Chapter|null>(null);const[tr,setTr]=useState<Record<string,string>>({})
 const[mode,setMode]=useState<Mode>('asli');const[s,setS]=useState<S>(DEF);const[panel,setPanel]=useState<''|'toc'|'tampil'|'api'|'cari'|'tanda'>('')
 const[busy,setBusy]=useState(false);const[prog,setProg]=useState<[number,number]|null>(null)
 const[playing,setPlaying]=useState(-1);const[paused,setPaused]=useState(false);const[rate,setRate]=useState(1)
 const[cfg,setCfg]=useState<Cfg>({id:'mock',region:'',limit:0});const[prov,setProv]=useState<TranslationProvider>(mock)
 const[bms,setBms]=useState<Bm[]>([]);const[q,setQ]=useState('');const[hits,setHits]=useState<Hit[]|null>(null);const[searching,setSearching]=useState(false);const[hit,setHit]=useState('')
 const[stor,setStor]=useState('');const[bprog,setBprog]=useState<[number,number,number,number]|null>(null);const[pg,setPg]=useState<Record<string,number>>({});const[filter,setFilter]=useState('');const[last,setLast]=useState('')
 const backRef=useRef<()=>boolean>(()=>false)
 const pendBlock=useRef('')
 const ac=useRef<AbortController|null>(null),main=useRef<HTMLDivElement>(null),pendY=useRef(0),ready=useRef(false),tm=useRef(0)
 useEffect(()=>{void navigator.storage?.persist?.();listBooks().then(setBooks);kvGet<S>('settings').then(v=>{if(v)setS({...DEF,...v});ready.current=true});kvGet<Cfg>('cfg').then(c=>{if(c){setCfg(c);void buildProvider(c).then(setProv)}})},[])
 useEffect(()=>{document.documentElement.dataset.theme=s.theme;if(ready.current)void kvSet('settings',s)},[s])
 useEffect(()=>{if(!cur)return;let dead=false
  loadChapter(cur.id,ci).then(async c=>{if(dead||!c)return;setCh(c);setTr(await loadTr(cur.id,c,prov.id))
   requestAnimationFrame(()=>{if(pendBlock.current){document.getElementById('b'+pendBlock.current)?.scrollIntoView({block:'center'});pendBlock.current=''}else if(main.current)main.current.scrollTop=pendY.current;pendY.current=0})})
  return()=>{dead=true}},[cur,ci,prov])
 useEffect(()=>{void navigator.storage?.estimate?.().then(e=>setStor(`Penyimpanan terpakai: ${((e.usage??0)/1048576).toFixed(1)} MB dari kuota sekitar ${((e.quota??0)/1073741824).toFixed(1)} GB.`))},[books])
 useEffect(()=>{void (async()=>{const o:Record<string,number>={};for(const b of books){const p=await kvGet<{ci:number}>('pos:'+b.id);if(p)o[b.id]=p.ci};setPg(o);setLast((await kvGet<string>('last'))??'')})()},[books,cur])
 useEffect(()=>{if(!Capacitor.isNativePlatform())return;const h=CapApp.addListener('backButton',()=>{if(!backRef.current())void CapApp.exitApp()});return()=>{void h.then(x=>x.remove())}},[])
 async function doBook(){if(!cur)return;if(bprog){ac.current?.abort();return}
  const{chars,blocks}=await bookTodo(cur,prov.id);if(!blocks)return alert('Seluruh buku sudah diterjemahkan dengan penyedia ini.')
  if(!confirm(`Akan menerjemahkan ${blocks} paragraf (${chars.toLocaleString('id-ID')} karakter) memakai ${prov.label}. ${prov.id==='mock'?'Ini hasil tiruan, bukan terjemahan sungguhan.':'Teks dikirim ke penyedia dan bisa dikenai biaya sesuai akun Anda.'} Lanjutkan?`))return
  const a=new AbortController();ac.current=a;setBprog([0,cur.toc.length,0,0])
  try{await translateBook(cur,prov,(c,n,d,t)=>setBprog([c,n,d,t]),a.signal)}catch(e){if(!a.signal.aborted)alert(errMsg(e))}
  setBprog(null);if(ch)setTr(await loadTr(cur.id,ch,prov.id))}
 async function doExport(full:boolean){try{await saveText(`bacabuku-${full?'penuh':'ringan'}-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(await dump(full)))}catch(e){alert('Gagal ekspor: '+errMsg(e))}}
 async function doImport(f?:File){if(!f)return;try{const o:unknown=JSON.parse(await f.text());if(!confirm('Gabungkan cadangan ini ke data di perangkat? Data dengan kunci sama akan ditimpa.'))return;await restore(o);alert('Cadangan dipulihkan. Aplikasi dimuat ulang.');location.reload()}catch(e){alert('Gagal impor: '+errMsg(e))}}
 async function onFile(f?:File){if(!f)return
  setBusy(true)
  try{const p=await importFile(f);const id=await sha(p.buf)
   await saveBook({id,title:p.title,author:p.author,toc:p.chapters.map(c=>c.title),addedAt:Date.now(),cover:p.cover||undefined},p.chapters,p.images);setBooks(await listBooks())
  }catch(e){alert(errMsg(e))}finally{setBusy(false)}}
 async function open(b:Book){void kvSet('last',b.id);setBms(await getBms(b.id));setHits(null);setQ('');setHit('');const p=await kvGet<{ci:number;y:number}>('pos:'+b.id);pendY.current=p?.y??0;setCh(null);setCi(p?.ci??0);setCur(b);setMode('asli')}
 function close(){stop();setPlaying(-1);ac.current?.abort();setCur(null);setCh(null);setPanel('')}
 function go(n:number){if(!cur||n<0||n>=cur.toc.length)return;stop();setPlaying(-1);pendY.current=0;setCi(n);setPanel('');void kvSet('pos:'+cur.id,{ci:n,y:0})}
 function onScroll(){if(!cur)return;clearTimeout(tm.current);const y=main.current?.scrollTop??0;tm.current=window.setTimeout(()=>void kvSet('pos:'+cur.id,{ci,y}),400)}
 async function doTr(){if(!cur||!ch)return;const a=new AbortController();ac.current=a;setProg([0,ch.blocks.filter(k=>k.kind!=='image').length])
  try{await translateChapter(cur.id,ch,prov,(d,t)=>setProg([d,t]),a.signal)}catch(e){if(!a.signal.aborted)alert(errMsg(e))}
  setTr(await loadTr(cur.id,ch,prov.id));setProg(null);setMode(m=>m==='asli'?'terjemah':m)}
 async function play(){if(!ch)return;const useTr=mode!=='asli'
  const idx=ch.blocks.map((_,i)=>i).filter(i=>ch.blocks[i].kind!=='image'&&(!useTr||tr[ch.blocks[i].id]))
  const texts=idx.map(i=>useTr?tr[ch.blocks[i].id]:ch.blocks[i].text)
  if(!texts.length)return alert('Belum ada terjemahan untuk dibacakan.')
  if(useTr&&!(await hasVoice('id')))alert('Suara Bahasa Indonesia belum terpasang. Pasang lewat Pengaturan Android › Output text-to-speech.')
  setPaused(false)
  speak(texts,useTr?'id-ID':'en-US',rate,i=>{setPlaying(idx[i]);document.getElementById('b'+ch.blocks[idx[i]].id)?.scrollIntoView({block:'center',behavior:'smooth'})},()=>setPlaying(-1))}
 function jump(n:number,id:string){stop();setPlaying(-1);setHit(id);setPanel('')
  if(n===ci)document.getElementById('b'+id)?.scrollIntoView({block:'center'})
  else if(cur){pendBlock.current=id;pendY.current=0;setCi(n);void kvSet('pos:'+cur.id,{ci:n,y:0})}}
 async function doSearch(){if(!cur)return;setSearching(true);try{setHits(await searchBook(cur,q,mode==='asli'?null:prov.id))}finally{setSearching(false)}}
 async function mark(){if(!cur||!ch)return;const top=main.current?.getBoundingClientRect().top??0
  const k=ch.blocks.find(b=>{const e=document.getElementById('b'+b.id);return !!e&&e.getBoundingClientRect().bottom>top+8});if(!k)return
  setBms(await addBm(cur.id,{id:k.id,ci,snip:k.text.slice(0,90),at:Date.now()}))}
 const upd=(k:keyof S,v:string|number)=>setS(o=>({...o,[k]:v}))
 backRef.current=()=>{if(panel){setPanel('');return true}if(cur){close();return true}return false}
 if(!cur)return(<div className="lib"><h1>Baca Buku</h1>
  <label className="btn big">{busy?'Mengimpor…':'Impor buku (EPUB, FB2)'}<input type="file" accept=".epub,.fb2,application/epub+zip,application/x-fictionbook+xml" hidden onChange={e=>{void onFile(e.target.files?.[0]);e.target.value=''}}/></label>
  {books.length===0&&<p className="muted">Belum ada buku. Impor berkas EPUB atau FB2 dari penyimpanan HP untuk mulai membaca.</p>}
  {books.length>0&&<input className="srch" placeholder="Cari judul atau penulis" value={filter} onChange={e=>setFilter(e.target.value)}/>}
  {(()=>{const lb=books.find(b=>b.id===last);return lb&&!filter?<button className="btn big" onClick={()=>void open(lb)}>Lanjutkan: {lb.title}{pg[lb.id]!==undefined?` (bab ${pg[lb.id]+1}/${lb.toc.length})`:''}</button>:null})()}
  {books.filter(b=>(b.title+' '+b.author).toLowerCase().includes(filter.toLowerCase())).map(b=><div className="book" key={b.id}>{b.cover&&<Img book={b.id} path={b.cover} alt="" cls="cov"/>}<button className="bt" onClick={()=>void open(b)}><b>{b.title}</b><span>{b.author} · {pg[b.id]!==undefined?`bab ${pg[b.id]+1} dari ${b.toc.length}`:`${b.toc.length} bab`}</span></button>
   <button className="btn sm" onClick={()=>{if(confirm('Hapus buku dan terjemahannya dari perangkat?'))void deleteBook(b.id).then(async()=>setBooks(await listBooks()))}}>Hapus</button></div>)}
  <div className="bk"><b>Cadangan data</b>
   <div className="chips"><button className="btn sm" onClick={()=>void doExport(false)}>Ekspor ringan</button><button className="btn sm" onClick={()=>void doExport(true)}>Ekspor penuh</button>
   <label className="btn sm">Impor cadangan<input type="file" accept=".json,application/json" hidden onChange={e=>{void doImport(e.target.files?.[0]);e.target.value=''}}/></label></div>
   <small className="muted">Ringan: terjemahan, posisi baca, penanda, pengaturan. Setelah dipulihkan, impor ulang berkas EPUB yang sama agar buku muncul. Penuh: termasuk teks buku. Kunci API tidak pernah ikut diekspor. {stor}</small></div>
  <p className="muted small">Buku dan terjemahan disimpan hanya di perangkat ini. Hapus data situs atau copot aplikasi akan menghapusnya.</p></div>)
 const total=cur.toc.length
 return(<div className="rd">
  <header><button className="btn sm" onClick={close}>Kembali</button><span className="ttl">{cur.title}</span>
   <button className="btn sm" onClick={()=>setPanel(panel==='toc'?'':'toc')}>Isi</button><button className="btn sm" onClick={()=>setPanel(panel==='cari'?'':'cari')}>Cari</button><button className="btn sm" onClick={()=>setPanel(panel==='tanda'?'':'tanda')}>Tanda{bms.length?` (${bms.length})`:''}</button><button className="btn sm" onClick={()=>setPanel(panel==='tampil'?'':'tampil')}>Tampilan</button><button className="btn sm" onClick={()=>setPanel(panel==='api'?'':'api')}>Terjemah</button></header>
  {panel==='toc'&&<div className="panel">{cur.toc.map((t,i)=><button key={i} className={'row'+(i===ci?' on':'')} onClick={()=>go(i)}>{t}</button>)}</div>}
  {panel==='tampil'&&<div className="panel">
   <div className="chips">{THEMES.map(([k,l])=><button key={k} className={'btn sm'+(s.theme===k?' on':'')} onClick={()=>upd('theme',k)}>{l}</button>)}</div>
   <label>Huruf <select value={s.font} onChange={e=>upd('font',e.target.value)}><option value="serif">Serif</option><option value="sans">Sans</option><option value="mono">Mono</option></select></label>
   <label>Ukuran {s.size}<input type="range" min="14" max="30" value={s.size} onChange={e=>upd('size',+e.target.value)}/></label>
   <label>Tinggi baris {s.lh}<input type="range" min="1.2" max="2.4" step="0.1" value={s.lh} onChange={e=>upd('lh',+e.target.value)}/></label>
   <label>Jarak paragraf {s.gap}<input type="range" min="0" max="2" step="0.1" value={s.gap} onChange={e=>upd('gap',+e.target.value)}/></label>
   <label>Lebar teks {s.width}<input type="range" min="28" max="70" value={s.width} onChange={e=>upd('width',+e.target.value)}/></label></div>}
  {panel==='cari'&&<div className="panel"><div className="chips"><input className="grow" value={q} placeholder={mode==='asli'?'Cari di teks asli':'Cari di terjemahan'} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void doSearch()}}/><button className="btn sm" onClick={()=>void doSearch()}>Cari</button></div>
   {searching&&<small className="muted">Mencari…</small>}
   {hits&&!searching&&<small className="muted">{hits.length>=100?'100 hasil pertama (dibatasi)':hits.length+' hasil'}</small>}
   {hits?.map(h=><button key={h.id} className="row" onClick={()=>jump(h.ci,h.id)}><small className="muted">{cur.toc[h.ci]}</small><br/>{h.snip}</button>)}</div>}
  {panel==='tanda'&&<div className="panel">{bms.length===0&&<small className="muted">Belum ada penanda. Gulir ke bagian yang ingin ditandai, lalu tekan Tandai di bawah.</small>}
   {bms.map(m=><div className="book" key={m.id}><button className="row grow" onClick={()=>jump(m.ci,m.id)}><small className="muted">{cur.toc[m.ci]}</small><br/>{m.snip}</button><button className="btn sm" onClick={()=>void delBm(cur.id,m.id).then(setBms)}>Hapus</button></div>)}</div>}
  {panel==='api'&&<div className="panel"><ApiPanel cfg={cfg} onSave={c=>{setCfg(c);void kvSet('cfg',c);void buildProvider(c).then(setProv);setPanel('')}}/>
   <div className="bk"><b>Terjemahkan seluruh buku</b><button className="btn sm" onClick={()=>void doBook()}>{bprog?`Batal (bab ${bprog[0]+1}/${bprog[1]}, paragraf ${bprog[2]}/${bprog[3]})`:'Hitung dan mulai'}</button><small className="muted">Bisa dihentikan lalu dilanjutkan; paragraf yang sudah diterjemahkan tidak diulang.</small></div></div>}
  <div className="main" ref={main} onScroll={onScroll}><article style={{fontSize:s.size,lineHeight:s.lh,fontFamily:FONTS[s.font],maxWidth:s.width+'ch','--gap':s.gap+'em'} as React.CSSProperties}>
   {ch?<><small className="muted">Bab {ci+1} dari {total}</small>
    {ch.blocks.map((k,i)=>{const t=tr[k.id];const Tag=k.kind==='heading'?'h2':k.kind==='quote'?'blockquote':'p'
     if(k.kind==='image')return<div id={'b'+k.id} key={k.id} className="img"><Img book={cur.id} path={k.src??''} alt={k.text}/></div>
     return<div id={'b'+k.id} key={k.id} className={(playing===i||hit===k.id?'hl':'')+(bms.some(m=>m.id===k.id)?' bm':'')}>
      {(mode!=='terjemah'||!t)&&<Tag className={mode==='terjemah'?'blm':''}>{k.text}</Tag>}
      {mode!=='asli'&&t&&<Tag className={mode==='dua'?'tr':''}>{t}</Tag>}</div>})}
    <div className="nav"><button className="btn" disabled={ci===0} onClick={()=>go(ci-1)}>Bab sebelumnya</button><button className="btn" disabled={ci>=total-1} onClick={()=>go(ci+1)}>Bab berikutnya</button></div></>:<p className="muted">Memuat bab…</p>}</article></div>
  <footer>
   <select value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="asli">Teks asli</option><option value="terjemah">Terjemahan</option><option value="dua">Asli + terjemahan</option></select>
   {prog?<button className="btn sm" onClick={()=>ac.current?.abort()}>Batal {prog[0]}/{prog[1]}</button>
    :<button className="btn sm" onClick={()=>void doTr()}>Terjemahkan bab ({prov.id.toUpperCase()}, {ch?estimate(ch):0} karakter)</button>}
   {playing<0?<button className="btn sm" onClick={play}>Bacakan</button>
    :<><button className="btn sm" onClick={()=>{if(paused){resume()}else{pause()};setPaused(!paused)}}>{paused?'Lanjut':'Jeda'}</button><button className="btn sm" onClick={()=>{stop();setPlaying(-1)}}>Berhenti</button></>}
   <button className="btn sm" onClick={()=>void mark()}>Tandai</button>
   <label className="rate">Kecepatan {rate}<input type="range" min="0.6" max="1.6" step="0.1" value={rate} onChange={e=>setRate(+e.target.value)}/></label>
  </footer></div>)
}
