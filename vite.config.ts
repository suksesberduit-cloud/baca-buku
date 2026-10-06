import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'
export default defineConfig({base:'./',plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'Baca Buku',short_name:'Baca Buku',lang:'id',display:'standalone',start_url:'.',scope:'.',background_color:'#f3ead8',theme_color:'#f3ead8',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}})]})
