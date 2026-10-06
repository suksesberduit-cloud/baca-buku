# Membuat ikon Baca Buku (buku terbuka, pita burgundy, tepi emas). Butuh Pillow + numpy.
# Jalankan: python3 scripts/make-icons.py  -> menulis public/icon-*.png dan assets/android-res/**
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
B=2048; K=B/1024
def bez(p0,p1,p2,n=80):
    return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in (i/n for i in range(n+1))]
def poly(side,grow=1.0,dy=0):
    top=bez((0,405),(150,330),(285,372)); bot=bez((285,640),(150,610),(0,676))
    pts=[(512+side*x,y) for x,y in top+bot]
    if grow!=1.0 or dy: pts=[(512+(x-512)*grow,520+(y-520)*grow+dy) for x,y in pts]
    return [(x*K,y*K) for x,y in pts]
def gradient(size,c1,c2,glow=True):
    y=np.linspace(0,1,size)[:,None]; x=np.linspace(-1,1,size)[None,:]
    c1=np.array(c1,float); c2=np.array(c2,float)
    img=c1[None,None,:]*(1-y[...,None])+c2[None,None,:]*y[...,None]
    img=np.broadcast_to(img,(size,size,3)).copy()
    if glow:
        r=np.sqrt(x**2+(y*1.6-0.35)**2); g=np.clip(1-r/1.1,0,1)**2*38
        img+=g[...,None]
    return Image.fromarray(np.clip(img,0,255).astype('uint8'),'RGB').convert('RGBA')
def book(scale):
    L=Image.new('RGBA',(B,B),(0,0,0,0))
    # bayangan
    sh=Image.new('RGBA',(B,B),(0,0,0,0)); d=ImageDraw.Draw(sh)
    d.ellipse([int(215*K),int(668*K),int(809*K),int(742*K)],fill=(0,0,0,110)); sh=sh.filter(ImageFilter.GaussianBlur(26*K/2))
    L=Image.alpha_composite(L,sh)
    d=ImageDraw.Draw(L)
    for s in (-1,1): d.polygon(poly(s,1.075,16),fill=(190,148,58,255))             # sampul emas
    d.rectangle([int(500*K),int(428*K),int(524*K),int(702*K)],fill=(150,112,38,255))
    for s in (-1,1):                                                              # halaman bergradasi
        m=Image.new('L',(B,B),0); ImageDraw.Draw(m).polygon(poly(s),fill=255)
        xs=np.abs(np.linspace(-1,1,B)[None,:])**1.5
        c=np.array([247,240,222])[None,None,:]*xs[...,None]+np.array([214,200,168])[None,None,:]*(1-xs[...,None])
        c=np.broadcast_to(c,(B,B,3)).astype('uint8')
        pg=Image.fromarray(c,'RGB').convert('RGBA'); pg.putalpha(m); L=Image.alpha_composite(L,pg)
    d=ImageDraw.Draw(L)
    for s in (-1,1):                                                              # garis teks
        for i,xe in enumerate((235,235,235,235,150)):
            y0=448+i*46
            x1,x2=48,xe
            p1=(512+s*x1,y0-0.115*x1); p2=(512+s*x2,y0-0.115*x2)
            d.line([(p1[0]*K,p1[1]*K),(p2[0]*K,p2[1]*K)],fill=(203,189,156,255),width=int(9*K))
            for p in (p1,p2): d.ellipse([p[0]*K-4.5*K,p[1]*K-4.5*K,p[0]*K+4.5*K,p[1]*K+4.5*K],fill=(203,189,156,255))
    rib=[(488,386),(536,386),(536,748),(512,716),(488,748)]                       # pita
    d.polygon([(x*K,y*K) for x,y in rib],fill=(142,42,54,255))
    d.polygon([(x*K,y*K) for x,y in [(488,386),(500,386),(500,730),(488,748)]],fill=(168,58,70,255))
    if scale!=1.0:
        n=int(B*scale); L=L.resize((n,n),Image.LANCZOS); C=Image.new('RGBA',(B,B),(0,0,0,0)); o=(B-n)//2; C.paste(L,(o,o)); L=C
    return L
def save(img,size,path):
    os.makedirs(os.path.dirname(path),exist_ok=True); img.resize((size,size),Image.LANCZOS).save(path)
bg=gradient(B,(40,60,100),(13,20,38)); bg_noglow=gradient(B,(40,60,100),(13,20,38),glow=False)
full=Image.alpha_composite(bg,book(1.12)); fg=book(0.95)
def mask(kind):
    m=Image.new('L',(B,B),0); d=ImageDraw.Draw(m)
    (d.ellipse([0,0,B-1,B-1],fill=255) if kind=='round' else d.rounded_rectangle([0,0,B-1,B-1],radius=int(B*0.22),fill=255)); return m
def masked(img,kind):
    o=img.copy(); o.putalpha(mask(kind)); return o
save(full,192,'public/icon-192.png'); save(full,512,'public/icon-512.png')
R='assets/android-res'
for d,(l,a) in {'mdpi':(48,108),'hdpi':(72,162),'xhdpi':(96,216),'xxhdpi':(144,324),'xxxhdpi':(192,432)}.items():
    save(masked(full,'rounded'),l,f'{R}/mipmap-{d}/ic_launcher.png')
    save(masked(full,'round'),l,f'{R}/mipmap-{d}/ic_launcher_round.png')
    save(fg,a,f'{R}/mipmap-{d}/bb_fg.png'); save(bg_noglow,a,f'{R}/mipmap-{d}/bb_bg.png')
os.makedirs(f'{R}/mipmap-anydpi-v26',exist_ok=True)
xml='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@mipmap/bb_bg"/><foreground android:drawable="@mipmap/bb_fg"/></adaptive-icon>\n'
for n in ('ic_launcher','ic_launcher_round'): open(f'{R}/mipmap-anydpi-v26/{n}.xml','w').write(xml)
os.makedirs('/mnt/user-data/outputs',exist_ok=True)
pv=Image.new('RGBA',(1100,560),(24,24,28,255)); pv.paste(masked(full,'rounded').resize((480,480),Image.LANCZOS),(30,40),masked(full,'rounded').resize((480,480),Image.LANCZOS))
pv.paste(masked(full,'round').resize((300,300),Image.LANCZOS),(560,40),masked(full,'round').resize((300,300),Image.LANCZOS))
pv.paste(masked(full,'rounded').resize((120,120),Image.LANCZOS),(900,40),masked(full,'rounded').resize((120,120),Image.LANCZOS))
pv.paste(masked(full,'round').resize((72,72),Image.LANCZOS),(920,200),masked(full,'round').resize((72,72),Image.LANCZOS))
pv.convert('RGB').save('/mnt/user-data/outputs/ikon-baca-buku.png')
print('ok')
