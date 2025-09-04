import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: { target: 'es2020' } // top-level await 이슈 방지
})