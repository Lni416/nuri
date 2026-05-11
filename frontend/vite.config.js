import { defineConfig } from "vite";

export default defineConfig({
  server: {
    /** LAN(예: http://192.168.0.5:5173) 접속 허용. NCP Web 서비스 URL에 같은 origin 등록 필요 */
    host: true,
    port: 5173,
    /** 5173이 비어 있어야 함. 다른 포트로 뜨면 Naver Maps Web URL 등록과 달라져 스크립트가 막힐 수 있음 */
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
