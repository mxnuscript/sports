const ids=['sport','source','book','region','market','side','propbook','aisport','aimodel'];
let preferences={};try{preferences=JSON.parse(localStorage.getItem('edge-workspace')||'{}')||{};}catch{}
export function restoreSelect(id){const element=document.getElementById(id),value=preferences[id];if(typeof value==='string'&&element&&[...element.options].some(o=>o.value===value))element.value=value;}
export function setupWorkspace(){
 for(const id of ids){const element=document.getElementById(id);if(!element)continue;if(id==='aimodel'&&typeof preferences[id]==='string'&&/^gemini-[a-z0-9.-]+$/.test(preferences[id])&&![...element.options].some(o=>o.value===preferences[id])){const option=document.createElement('option');option.value=preferences[id];option.textContent='Saved choice: '+preferences[id];element.append(option);}restoreSelect(id);element.addEventListener('change',()=>{preferences[id]=element.value;try{localStorage.setItem('edge-workspace',JSON.stringify(preferences));document.getElementById('workspacestatus').textContent='Workspace saved locally · no API keys stored';}catch{document.getElementById('workspacestatus').textContent='Browser storage unavailable';}});}
}
