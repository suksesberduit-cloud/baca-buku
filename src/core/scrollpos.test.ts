import {describe,it,expect} from 'vitest'
import {buildTops,pageAt,GAP} from './scrollpos'
describe('scrollpos',()=>{
 it('menyusun posisi atas halaman dengan jarak antar halaman',()=>{
  const t=buildTops([2,1,2],100);expect(t.hs).toEqual([200,100,200]);expect(t.tops).toEqual([0,200+GAP,300+2*GAP]);expect(t.total).toBe(500+2*GAP)})
 it('pageAt menemukan halaman untuk posisi gulir',()=>{
  const t=buildTops([2,1,2],100);expect(pageAt(t.tops,0)).toBe(0);expect(pageAt(t.tops,199)).toBe(0);expect(pageAt(t.tops,200+GAP)).toBe(1);expect(pageAt(t.tops,299+GAP)).toBe(1);expect(pageAt(t.tops,99999)).toBe(2);expect(pageAt(t.tops,-5)).toBe(0)})
 it('rasio tak valid memakai A4 dan daftar kosong aman',()=>{expect(buildTops([0],100).hs).toEqual([141]);expect(pageAt([],10)).toBe(0)})
})
