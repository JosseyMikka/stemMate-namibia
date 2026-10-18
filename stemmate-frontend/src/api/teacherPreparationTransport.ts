import {request} from './stemmateApi';
// Allow the provider's 45-second call plus one retry, but never lock the form
// indefinitely on a stalled browser connection. No automatic retries or saving.
export async function prepareTeachingDraft<T>(body:unknown,timeoutMs=100000):Promise<T>{
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await request<T>('/teacher/preparation','POST',body,undefined,undefined,controller.signal);}
 catch(error){
  if(controller.signal.aborted)throw new Error('Preparation took too long. Your writing and any previous draft are still here. Try again when connected. The previous request may still count towards your AI allowance.',{cause:error});
  throw error;
 }finally{clearTimeout(timer);}
}
