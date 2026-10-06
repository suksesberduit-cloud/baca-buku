// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest'
import {webcrypto} from 'node:crypto'
import {parseFb2} from './fb2'
if(!globalThis.crypto?.subtle)vi.stubGlobal('crypto',webcrypto)
const xml=(enc:string,body:string)=>`<?xml version="1.0" encoding="${enc}"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><author><first-name>Ani</first-name><last-name>Budi</last-name></author><book-title>Judul Uji</book-title></title-info></description>${body}</FictionBook>`
const buf=(s:string)=>new TextEncoder().encode(s).buffer as ArrayBuffer
describe('parseFb2',()=>{
 it('membaca metadata dan urutan bab/paragraf',async()=>{
  const b=await parseFb2(buf(xml('utf-8','<body><section><title><p>Satu</p></title><p>A</p><cite><p>Q</p></cite></section><section><p>B</p></section></body><body name="notes"><section><p>catatan</p></section></body>')))
  expect(b.title).toBe('Judul Uji');expect(b.author).toBe('Ani Budi')
  expect(b.chapters.map(c=>c.blocks.map(k=>k.kind+':'+k.text))).toEqual([['heading:Satu','paragraph:A','quote:Q'],['paragraph:B']])
 })
 it('menolak berkas bukan FB2',async()=>{await expect(parseFb2(buf('<html/>'))).rejects.toThrow()})
 it('membaca encoding windows-1251',async()=>{
  const head=new TextEncoder().encode(xml('windows-1251','<body><section><p>@@</p></section></body>'))
  const s=new TextDecoder().decode(head).split('@@');const mid=new Uint8Array([0xCF,0xF0,0xE8,0xE2,0xE5,0xF2])
  const a=new TextEncoder().encode(s[0]),c=new TextEncoder().encode(s[1]);const all=new Uint8Array(a.length+6+c.length);all.set(a);all.set(mid,a.length);all.set(c,a.length+6)
  expect((await parseFb2(all.buffer)).chapters[0].blocks[0].text).toBe('Привет')
 })
})
