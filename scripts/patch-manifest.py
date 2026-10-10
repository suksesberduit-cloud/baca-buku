# Menambahkan intent-filter "Buka dengan" untuk EPUB, FB2, PDF, MOBI, AZW/AZW3 ke AndroidManifest hasil `cap add android`.
# Tiga filter: (1) berdasarkan tipe MIME (termasuk application/octet-stream yang dikirim banyak pengelola berkas untuk
# ekstensi yang tidak dikenal Android seperti .fb2/.azw3), (2) berdasarkan ekstensi pada nama berkas dengan tipe */*,
# (3) berdasarkan ekstensi tanpa tipe sama sekali (intent yang hanya membawa URI).
import sys,os,glob,re
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
share=('<intent-filter><action android:name="android.intent.action.SEND"/><category android:name="android.intent.category.DEFAULT"/><data android:mimeType="*/*"/></intent-filter>\n'
       '<intent-filter><action android:name="android.intent.action.SEND_MULTIPLE"/><category android:name="android.intent.category.DEFAULT"/><data android:mimeType="*/*"/></intent-filter>\n')
if '</activity>' not in t: sys.exit('AndroidManifest tidak memiliki </activity>')
open(p,'w',encoding='utf-8').write(t.replace('</activity>',f1+f2+f3+broad+share+'</activity>',1))
print('Filter EPUB/FB2/PDF/MOBI/AZW3 ditambahkan (3 intent-filter + filter luas jika BROAD_OPEN!=0).')

# MainActivity: berkas yang dikirim lewat "Bagikan" (ACTION_SEND) diubah menjadi ACTION_VIEW + data agar sampai ke aplikasi sebagai appUrlOpen.
JAVA="""package __PKG__;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
  private Intent fixShare(Intent i) {
    if (i == null) return i;
    String a = i.getAction();
    if (Intent.ACTION_SEND.equals(a) || Intent.ACTION_SEND_MULTIPLE.equals(a)) {
      Uri u = null;
      if (Intent.ACTION_SEND.equals(a)) {
        u = i.getParcelableExtra(Intent.EXTRA_STREAM);
      } else {
        ArrayList<Uri> l = i.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        if (l != null && !l.isEmpty()) u = l.get(0);
      }
      if (u != null) {
        Intent v = new Intent(i);
        v.setAction(Intent.ACTION_VIEW);
        v.setData(u);
        v.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return v;
      }
    }
    return i;
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    setIntent(fixShare(getIntent()));
    super.onCreate(savedInstanceState);
  }

  @Override
  protected void onNewIntent(Intent intent) {
    Intent f = fixShare(intent);
    setIntent(f);
    super.onNewIntent(f);
  }
}
"""
files=glob.glob('android/app/src/main/java/**/MainActivity.java',recursive=True)
if not files:
    print('PERINGATAN: MainActivity.java tidak ditemukan; fitur Bagikan tidak aktif.')
else:
    src=open(files[0],encoding='utf-8').read();m=re.search(r'^package\s+([\w.]+);',src,re.M)
    if m: open(files[0],'w',encoding='utf-8').write(JAVA.replace('__PKG__',m.group(1)));print('MainActivity diperbarui untuk Bagikan:',files[0])
    else: print('PERINGATAN: paket MainActivity tidak terbaca; fitur Bagikan tidak aktif.')
