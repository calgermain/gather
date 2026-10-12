import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { parseIngredient } from '../src/ingredients.js';

export function publicAddress(ip){if(isIP(ip)===6)return /^(2|3)[0-9a-f]{3}:/i.test(ip)&&!/^2001:(db8|0):/i.test(ip);if(isIP(ip)!==4)return false;const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19)));}
export function pinnedLookup(addresses){return (_host,opts,cb)=>opts?.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family);}
async function retrieve(url,redirects=0){
 const target=new URL(url);if(target.protocol!=='https:'||target.username||target.password||(target.port&&target.port!=='443'))throw new Error('Use a public HTTPS recipe URL.');
 const addresses=await lookup(target.hostname,{all:true});if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw new Error('This URL is not a public recipe website.');
 return new Promise((resolve,reject)=>{const req=https.get(target,{headers:{'User-Agent':'GatherRecipeImporter/1.0','Accept':'text/html'},lookup:pinnedLookup(addresses)},res=>{
 if([301,302,303,307,308].includes(res.statusCode)){res.resume();if(redirects>=3||!res.headers.location)return reject(new Error('Too many redirects.'));retrieve(new URL(res.headers.location,target).href,redirects+1).then(resolve,reject);return;}
 if(res.statusCode!==200){res.resume();return reject(new Error('Recipe website blocked the request or is unavailable.'));}
 if(!/text\/html|application\/xhtml/i.test(res.headers['content-type']||'')){res.resume();return reject(new Error('The URL must point to a recipe web page.'));}
 let bytes=0,body='';res.setEncoding('utf8');res.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>2000000)req.destroy(new Error('Recipe page is too large.'));else body+=chunk;});res.on('end',()=>resolve(body));res.on('error',reject);
 });req.setTimeout(8000,()=>req.destroy(new Error('Recipe website timed out.')));req.on('error',reject);});
}
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').trim();
export function extractRecipe(html){
 const nodes=[];function walk(x){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(walk);return;}if([].concat(x['@type']||[]).some(t=>String(t).split('/').pop()==='Recipe'))nodes.push(x);Object.values(x).forEach(walk);}
 for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){if(!/type\s*=\s*["']application\/ld\+json["']/i.test(script[1]))continue;try{walk(JSON.parse(script[2]));}catch{}}
 const recipe=nodes.find(x=>Array.isArray(x.recipeIngredient)&&x.recipeIngredient.length);if(!recipe)throw new Error('No structured recipe found on this page. Enter it manually.');
 const steps=x=>Array.isArray(x)?x.flatMap(steps):typeof x==='string'?[clean(x)]:x?.itemListElement?steps(x.itemListElement):x?.text?[clean(x.text)]:[];
 const yieldText=String([].concat(recipe.recipeYield||[])[0]||'');const servings=Number(yieldText.match(/\d+(?:\.\d+)?/)?.[0])||4;
 return {name:clean(recipe.name),servings,ingredients:recipe.recipeIngredient.map(x=>parseIngredient(clean(x))),instructions:steps(recipe.recipeInstructions).join('\n')};
}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Use GET.'});const url=req.query?.url;if(typeof url!=='string'||url.length>2048)return res.status(400).json({error:'Provide a recipe URL.'});try{return res.status(200).json(extractRecipe(await retrieve(url)));}catch(e){return res.status(422).json({error:e.message});}}
