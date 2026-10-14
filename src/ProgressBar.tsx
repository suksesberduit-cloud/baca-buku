import {useRef,useState} from 'react'
interface P{value:number;total:number;approx?:boolean;sub?:string;onLive?:(v:number)=>void;onCommit:(v:number)=>void;onAct?:(down:boolean)=>void}
const nf=(n:number)=>n.toLocaleString('id-ID')
/** Bar progres panjang: geser untuk loncat, tombol ‹ › untuk halaman sebelum/sesudah, angka halaman sekarang / total. */
export default function ProgressBar({value,total,approx,sub,onLive,onCommit,onAct}:P){
 const[drag,setDrag]=useState<number|null>(null);const dr=useRef<number|null>(null)
 const max=Math.max(1,total),shown=Math.min(max,Math.max(1,drag??value))
 const end=()=>{const v=dr.current;dr.current=null;setDrag(null);if(v!==null&&v!==value)onCommit(v)}
 const step=(d:number)=>{const v=Math.min(max,Math.max(1,shown+d));if(v!==shown)onCommit(v)}
 const stop=(e:React.SyntheticEvent)=>e.stopPropagation()
 return(<div className="prog" onTouchStart={stop} onTouchEnd={stop} onPointerDown={()=>onAct?.(true)} onPointerUp={()=>onAct?.(false)} onPointerCancel={()=>onAct?.(false)}>
  <div className="plab"><b>Hal. {nf(shown)}</b> / {approx?'~':''}{nf(max)}{sub?<small className="muted"> · {sub}</small>:null}</div>
  <div className="prow"><button className="btn sm" disabled={shown<=1} aria-label="Halaman sebelumnya" onClick={()=>step(-1)}>‹</button>
   <input type="range" min={1} max={max} step={1} value={shown} aria-label="Posisi baca"
    onChange={e=>{const v=+e.target.value;dr.current=v;setDrag(v);onLive?.(v)}}
    onPointerUp={end} onPointerCancel={end} onTouchEnd={end} onKeyUp={end} onBlur={end}/>
   <button className="btn sm" disabled={shown>=max} aria-label="Halaman berikutnya" onClick={()=>step(1)}>›</button></div></div>)
}
