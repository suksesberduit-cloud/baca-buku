import {useEffect,useState} from 'react'
import {imgGet} from './core/db'
export default function Img({book,path,alt,cls}:{book:string;path:string;alt:string;cls?:string}){
 const[u,setU]=useState('')
 useEffect(()=>{let url='',dead=false
  void imgGet(book,path).then(v=>{if(dead||!v)return;url=URL.createObjectURL(new Blob([v.data],{type:v.type}));setU(url)})
  return()=>{dead=true;if(url)URL.revokeObjectURL(url)}},[book,path])
 return u?<img className={cls} src={u} alt={alt} loading="lazy"/>:null
}
