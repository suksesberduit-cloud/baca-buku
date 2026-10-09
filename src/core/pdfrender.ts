// Merender halaman PDF ke canvas (untuk OCR dan sampul).
export async function renderPage(doc:any,n:number,width:number):Promise<HTMLCanvasElement>{
 const page=await doc.getPage(n);const v1=page.getViewport({scale:1})
 const vp=page.getViewport({scale:Math.min(4,Math.max(0.2,width/v1.width))})
 const cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height)
 const ctx=cv.getContext('2d');if(!ctx)throw new Error('Canvas tidak tersedia di perangkat ini.')
 await page.render({canvasContext:ctx,viewport:vp}).promise;page.cleanup();return cv
}
export async function pageJpeg(doc:any,n:number,width:number,q=0.75):Promise<{type:string;data:ArrayBuffer}|null>{
 try{const cv=await renderPage(doc,n,width)
  const blob:Blob|null=await new Promise(r=>cv.toBlob(r,'image/jpeg',q));if(!blob)return null
  return{type:'image/jpeg',data:await blob.arrayBuffer()}}catch{return null}
}
