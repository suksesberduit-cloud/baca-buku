# Menambahkan intent-filter "Buka dengan" untuk EPUB/FB2 ke AndroidManifest hasil `cap add android`.
import sys
p='android/app/src/main/AndroidManifest.xml'
t=open(p,encoding='utf-8').read()
if 'application/epub+zip' in t: print('Manifest sudah berisi filter berkas.');sys.exit(0)
V=('<action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/>'
   '<category android:name="android.intent.category.BROWSABLE"/>')
mimes=['application/epub+zip','application/x-fictionbook+xml','application/x-fictionbook','application/fb2','application/x-fb2','text/fb2+xml','application/pdf','application/x-mobipocket-ebook','application/vnd.amazon.ebook','application/vnd.amazon.mobi8-ebook','application/x-mobi8-ebook']
f1='<intent-filter>'+V+'<data android:scheme="content"/><data android:scheme="file"/>'+''.join(f'<data android:mimeType="{m}"/>' for m in mimes)+'</intent-filter>\n'
pats=[]
for ext in ('epub','fb2','pdf','mobi','azw3','azw'):
    for e in (ext,ext.upper()):
        for k in range(4): pats.append('.*'+('\\\\..*'*k)+'\\\\.'+e)
f2=('<intent-filter>'+V+'<data android:scheme="content"/><data android:scheme="file"/><data android:host="*"/><data android:mimeType="*/*"/>'
    +''.join(f'<data android:pathPattern="{x}"/>' for x in pats)+'</intent-filter>\n')
if '</activity>' not in t: sys.exit('AndroidManifest tidak memiliki </activity>')
open(p,'w',encoding='utf-8').write(t.replace('</activity>',f1+f2+'</activity>',1))
print('Filter EPUB/FB2 ditambahkan.')
