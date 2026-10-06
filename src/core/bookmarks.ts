import {kvGet,kvSet} from './db'
export interface Bm{id:string;ci:number;snip:string;at:number}
export const getBms=async(b:string)=>(await kvGet<Bm[]>('bm:'+b))??[]
export async function addBm(b:string,m:Bm){const l=await getBms(b);if(l.some(x=>x.id===m.id))return l;const n=[...l,m];await kvSet('bm:'+b,n);return n}
export async function delBm(b:string,id:string){const n=(await getBms(b)).filter(x=>x.id!==id);await kvSet('bm:'+b,n);return n}
