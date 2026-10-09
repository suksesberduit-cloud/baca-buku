// Menyalin berkas OCR (worker, inti WASM, data bahasa) dari node_modules ke public/ocr agar OCR bisa jalan offline di APK.
// Dijalankan otomatis sebelum `npm run build` (skrip "prebuild"). Jika ada yang tidak ditemukan, OCR akan mengunduhnya dari internet.
import {existsSync,mkdirSync,readdirSync,copyFileSync,statSync} from 'node:fs'
import {join,basename} from 'node:path'
const out='public/ocr';mkdirSync(join(out,'core'),{recursive:true});mkdirSync(join(out,'lang'),{recursive:true})
function find(dir,test,acc=[]){if(!existsSync(dir))return acc
 for(const n of readdirSync(dir)){const p=join(dir,n);if(statSync(p).isDirectory())find(p,test,acc);else if(test(p))acc.push(p)}return acc}
let main=0
const w=find('node_modules/tesseract.js/dist',p=>/worker\.min\.js$/.test(p))[0]
if(w){copyFileSync(w,join(out,'worker.min.js'));main++}else console.warn('OCR: worker.min.js tidak ditemukan (akan memakai unduhan online).')
const cores=find('node_modules/tesseract.js-core',p=>/^tesseract-core.*\.(wasm\.js|wasm)$/.test(basename(p)))
const lstm=cores.filter(p=>/lstm/.test(basename(p)));const use=lstm.length?lstm:cores
for(const p of use)copyFileSync(p,join(out,'core',basename(p)))
for(const l of ['eng','ind']){
 const f=find(`node_modules/@tesseract.js-data/${l}`,p=>basename(p)===`${l}.traineddata.gz`)
 const pick=f.find(p=>/best_int/.test(p))??f.find(p=>/4\.0\.0/.test(p))??f[0]
 if(pick){copyFileSync(pick,join(out,'lang',`${l}.traineddata.gz`));main++}else console.warn(`OCR: data bahasa ${l} tidak ditemukan (akan memakai unduhan online).`)}
console.log(`OCR aset: ${main}/3 berkas utama, ${use.length} berkas inti disalin ke ${out}`)
