import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api/recipe.js';
export default defineConfig({plugins:[react(),{name:'recipe-api',configureServer(server){server.middlewares.use('/api/recipe',(req,res)=>{req.query=Object.fromEntries(new URL(req.url,'http://localhost').searchParams);res.status=n=>{res.statusCode=n;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};handler(req,res);});}}]});
