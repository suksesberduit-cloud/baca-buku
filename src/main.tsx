import {createRoot} from 'react-dom/client'
import {Capacitor} from '@capacitor/core'
import App from './App'
import './styles.css'
// Di APK, bersihkan service worker/cache lama agar tidak menahan versi aplikasi yang lama.
if(Capacitor.isNativePlatform()){
 void navigator.serviceWorker?.getRegistrations().then(r=>r.forEach(x=>void x.unregister()))
 void caches?.keys().then(k=>k.forEach(n=>void caches.delete(n)))
}
createRoot(document.getElementById('root')!).render(<App/>)
