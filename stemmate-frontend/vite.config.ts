import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env=loadEnv(mode,process.cwd(),'');
  if(env.STEMMATE_ENV==='production'){
    let api:URL;
    try{api=new URL(env.VITE_API_URL);}catch{throw new Error('Production requires an HTTPS VITE_API_URL.');}
    if(api.protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(api.hostname)||api.username||api.password||api.pathname!=='/'||api.search||api.hash||env.VITE_API_URL.endsWith('/'))throw new Error('VITE_API_URL must be an exact HTTPS API origin without a trailing slash.');
  }
  return {plugins:[react()]};
})
