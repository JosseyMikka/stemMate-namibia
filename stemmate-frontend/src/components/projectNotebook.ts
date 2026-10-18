export interface SavedNotebook {format:'stemmate-project-v1';project_id:number;revision:number;stage:number;entries:string[]}
export function readNotebook(raw:string,projectId:number|undefined,revision:number):SavedNotebook{
 if(raw.length>300000)throw new Error('Notebook file is too large.');
 const value=JSON.parse(raw);
 if(!value||value.format!=='stemmate-project-v1'||value.project_id!==projectId||value.revision!==revision||!Number.isInteger(value.stage)||value.stage<0||value.stage>7||!Array.isArray(value.entries)||value.entries.length!==7||value.entries.some((e:unknown)=>typeof e!=='string'||e.length>6000)||value.entries.slice(0,value.stage).some((e:string)=>!e.trim()))throw new Error('Choose a saved notebook for this exact project and brief version.');
 return {format:'stemmate-project-v1',project_id:value.project_id,revision:value.revision,stage:value.stage,entries:value.entries};
}
