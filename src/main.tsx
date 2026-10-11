import {createRoot} from 'react-dom/client'
import {Capacitor} from '@capacitor/core'
import App from './App'
import '@fontsource/lexend/400.css'
import '@fontsource/lexend/700.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/700.css'
import './styles.css'
// Di APK, bersihkan service worker/cache lama agar tidak menahan versi aplikasi yang lama.
if(Capacitor.isNativePlatform()){
 void navigator.serviceWorker?.getRegistrations().then(r=>r.forEach(x=>void x.unregister()))
 void caches?.keys().then(k=>k.forEach(n=>void caches.delete(n)))
}
createRoot(document.getElementById('root')!).render(<App/>)
