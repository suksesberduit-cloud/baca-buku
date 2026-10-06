import {readdirSync,readFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
export const RULES=[
 ['Google API key',/AIza[0-9A-Za-z_-]{35}/],
 ['Kunci privat PEM',/-----BEGIN [A-Z ]*PRIVATE KEY-----/],
 ['Kunci/rahasia hex di kode',/(key|secret|token)['"]?\s*[:=]\s*['"][0-9a-fA-F]{32,}['"]/i],
 ['Token (sk-, ghp_)',/\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36})\b/],
 ['Kata sandi keystore',/(storePassword|keyPassword)\s*[=:]\s*\S+/]]
export const scan=(text)=>RULES.filter(([,re])=>re.test(text)).map(([n])=>n)
function* walk(d){for(const n of readdirSync(d)){if(['node_modules','.git','build'].includes(n))continue;const p=join(d,n);if(statSync(p).isDirectory())yield* walk(p);else yield p}}
const BIN=/\.(png|jpe?g|webp|zip|apk|ico|woff2?)$/i
function main(dirs){
 let bad=0
 for(const d of dirs)for(const f of walk(d)){
  if(/\.(keystore|jks)$/i.test(f)){console.error('Berkas keystore ada di repo:',f);bad++;continue}
  if(BIN.test(f)||statSync(f).size>8e6)continue
  for(const h of scan(readFileSync(f,'utf8'))){console.error(`${f}: ${h}`);bad++}}
 if(bad){console.error(`Ditemukan ${bad} potensi kebocoran rahasia.`);process.exit(1)}
 console.log('Pemindaian kunci: bersih.')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2))
