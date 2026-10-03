import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // Pelo proxy a página e a API têm a mesma origem para o navegador. Sem remover o Origin,
        // o Spring trata cada POST/PUT/PATCH/DELETE como CORS e recusa quem acessa pelo IP da rede
        // (ex.: celular no pátio). Sem risco de CSRF: a autenticação é por token no cabeçalho, não cookie.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
});
