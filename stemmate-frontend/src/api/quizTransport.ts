import {request} from './stemmateApi';
// The provider has a 45-second timeout. A stalled browser connection must also
// release the form; numbered server actions make a subsequent retry safe.
export async function quizApi<T>(path:string,method:string,body?:unknown,token?:string,timeoutMs=55000):Promise<T>{
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await request<T>(path,method,body,undefined,token,controller.signal);}
 catch(error){if(controller.signal.aborted)throw new Error('The quiz connection took too long. Please retry.',{cause:error});throw error;}
 finally{clearTimeout(timer);}
}
