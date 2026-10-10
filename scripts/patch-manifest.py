# Menambahkan intent-filter "Buka dengan" untuk EPUB, FB2, PDF, MOBI, AZW/AZW3 ke AndroidManifest hasil `cap add android`.
# Tiga filter: (1) berdasarkan tipe MIME (termasuk application/octet-stream yang dikirim banyak pengelola berkas untuk
# ekstensi yang tidak dikenal Android seperti .fb2/.azw3), (2) berdasarkan ekstensi pada nama berkas dengan tipe */*,
# (3) berdasarkan ekstensi tanpa tipe sama sekali (intent yang hanya membawa URI).
import sys,os
p='android/app/src/main/AndroidManifest.xml'
t=open(p,encoding='utf-8').read()
if 'application/epub+zip' in t: print('Manifest sudah berisi filter berkas.');sys.exit(0)
V=('<action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/>'
   '<category android:name="android.intent.category.BROWSABLE"/>')
S='<data android:scheme="content"/><data android:scheme="file"/>'
mimes=['application/epub+zip','application/epub','application/x-epub+zip',
 'application/x-fictionbook+xml','application/x-fictionbook','application/fb2','application/x-fb2','text/fb2+xml',
 'application/pdf',
 'application/x-mobipocket-ebook','application/vnd.amazon.ebook','application/vnd.amazon.mobi8-ebook','application/x-mobi8-ebook','application/x-kindle-ebook',
 'application/octet-stream','application/x-octet-stream','binary/octet-stream']
f1='<intent-filter>'+V+S+''.join(f'<data android:mimeType="{m}"/>' for m in mimes)+'</intent-filter>\n'
pats=[]
for ext in ('epub','fb2','pdf','mobi','azw3','azw','kf8'):
    for e in (ext,ext.upper()):
        for k in range(4): pats.append('.*'+('\\\\..*'*k)+'\\\\.'+e)
PP=''.join(f'<data android:pathPattern="{x}"/>' for x in pats)
f2='<intent-filter>'+V+S+'<data android:host="*"/><data android:mimeType="*/*"/>'+PP+'</intent-filter>\n'
f3='<intent-filter>'+V+S+'<data android:host="*"/>'+PP+'</intent-filter>\n'
# Filter luas: agar Baca Buku PASTI muncul untuk FB2/AZW3 berapa pun tipe yang dikirim pengelola berkas (konsekuensi: muncul juga untuk jenis berkas lain).
# Matikan dengan BROAD_OPEN=0 di workflow apk.yml.
broad=''
if os.environ.get('BROAD_OPEN','1')!='0':
    broad=('<intent-filter>'+V+S+'<data android:mimeType="*/*"/></intent-filter>\n'
           +'<intent-filter>'+V+S+'</intent-filter>\n')
if '</activity>' not in t: sys.exit('AndroidManifest tidak memiliki </activity>')
open(p,'w',encoding='utf-8').write(t.replace('</activity>',f1+f2+f3+broad+'</activity>',1))
print('Filter EPUB/FB2/PDF/MOBI/AZW3 ditambahkan (3 intent-filter + filter luas jika BROAD_OPEN!=0).')
