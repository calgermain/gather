import React, {useEffect, useRef, useState} from 'react';
import {Plus, Trash2} from 'lucide-react';
import {normalizeIngredient} from './ingredientNames.js';
import {scaleIngredients} from './ingredients.js';

export function RecipeStart({onReview,onManual}) {
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function submit(e){
  e.preventDefault();setError('');
  let target;try{target=new URL(url.trim());if(target.protocol!=='https:')throw new Error();}catch{setError('Enter a complete HTTPS recipe URL.');return;}
  const controller=new AbortController();request.current=controller;setBusy(true);
  const timer=setTimeout(()=>controller.abort(),25000);
  try {
   const response=await fetch(`${import.meta.env.VITE_RECIPE_API_URL||'/api/recipe'}?url=${encodeURIComponent(target.href)}`,{signal:controller.signal});
   const recipe=await response.json().catch(()=>null);
   if(!response.ok||!recipe?.name||!Array.isArray(recipe.ingredients)||!recipe.ingredients.length)throw new Error(recipe?.error||`Recipe import returned an unexpected response (${response.status}). Please try another URL or enter it manually.`);
   onReview({...recipe,url:target.href});
  }catch(e){if(request.current===controller)setError(e.name==='AbortError'?'Import timed out. Try again or enter the recipe manually.':e.message);}
  finally{clearTimeout(timer);if(request.current===controller){request.current=null;setBusy(false);}}
 }
 return <form className="form-stack" onSubmit={submit}>
  <label>Recipe URL<input type="url" autoFocus required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.recipetineats.com/…" disabled={busy}/></label>
  <button className="primary-btn full" disabled={busy||!url.trim()}>{busy?'Importing recipe…':'Import and review'}</button>
  {error&&<p className="warning" role="alert">{error}</p>}
  <button type="button" className="text-btn manual-recipe-link" onClick={()=>{request.current?.abort();request.current=null;onManual();}}>Manually enter recipe</button>
 </form>;
}

export function RecipeReview({initial,onSave,onDelete,isExisting,onBack}) {
 const [recipe,setRecipe]=useState(()=>({...initial,ingredients:(initial.ingredients||[]).map(normalizeIngredient)}));
 const [servingInput,setServingInput]=useState(String(initial.servings||''));
 const [error,setError]=useState('');
 const set=(key,value)=>setRecipe(r=>({...r,[key]:value}));
 function changeServings(value){setServingInput(value);const next=Number(value);if(next>0&&Number.isFinite(next)){setRecipe(r=>({...r,servings:next,ingredients:scaleIngredients(r.ingredients,r.servings,next)}));}}
 function changeIngredient(index,key,value){setRecipe(r=>({...r,ingredients:r.ingredients.map((i,n)=>n===index?{...i,[key]:value}:i)}));}
 function submit(e){e.preventDefault();const servings=Number(servingInput);if(!recipe.name.trim()||!Number.isFinite(servings)||servings<=0){setError('Enter a recipe name and a positive serving size.');return;}
  const ingredients=recipe.ingredients.map(i=>({...i,name:i.name.trim(),qty:i.qty===''?0:Number(i.qty),unit:i.unit.trim()||'each'}));
  if(!ingredients.length||ingredients.some(i=>!i.name||!Number.isFinite(i.qty)||i.qty<0)){setError('Add at least one ingredient and check its name and quantity.');return;}
  onSave({...recipe,name:recipe.name.trim(),servings,ingredients});
 }
 return <form className="form-stack" onSubmit={submit}>
  {!isExisting&&<button type="button" className="text-btn" onClick={onBack}>← Back to recipe URL</button>}
  <label>Recipe name<input autoFocus value={recipe.name} onChange={e=>set('name',e.target.value)} required placeholder="Recipe name"/></label>
  <label>Servings<input type="number" min="0.25" step="any" value={servingInput} onChange={e=>changeServings(e.target.value)} required/></label>
  <p className="fine-print">Changing servings scales the quantities below. You can edit each ingredient before saving.</p>
  <div className="recipe-ingredient-heading"><b>Ingredients</b><button type="button" className="text-btn" onClick={()=>set('ingredients',[...recipe.ingredients,{name:'',qty:'',unit:'each'}])}><Plus size={14}/> Add ingredient</button></div>
  <div className="recipe-ingredient-list">{recipe.ingredients.map((i,index)=><div className="recipe-ingredient-row" key={index}>
   <label>Quantity<input type="number" min="0" step="any" value={i.qty||''} placeholder="To taste" onChange={e=>changeIngredient(index,'qty',e.target.value)}/></label>
   <label>Unit<input value={i.unit} placeholder="cup, lb, each…" onChange={e=>changeIngredient(index,'unit',e.target.value)}/></label>
   <label>Ingredient{i.originalName&&i.originalName!==i.name&&<small className="original-ingredient">Original: {i.originalName}</small>}<input required value={i.name} placeholder="Ingredient name" onChange={e=>changeIngredient(index,'name',e.target.value)}/></label>
   <button type="button" className="icon-btn danger-icon" aria-label={`Remove ingredient ${index+1}`} onClick={()=>set('ingredients',recipe.ingredients.filter((_,n)=>n!==index))}><Trash2 size={16}/></button>
  </div>)}</div>
  <label>Cooking steps<textarea rows="6" value={recipe.instructions||''} onChange={e=>set('instructions',e.target.value)} placeholder="Enter cooking steps, one per line"/></label>
  <label>Source URL <small>Optional</small><input type="url" value={recipe.url||''} onChange={e=>set('url',e.target.value)} placeholder="https://…"/></label>
  {error&&<p className="warning" role="alert">{error}</p>}
  <div className="modal-actions">{isExisting&&<button type="button" className="delete-btn" onClick={()=>onDelete(recipe)}><Trash2 size={15}/> Delete</button>}<span className="grow"/><button className="primary-btn">Save recipe</button></div>
 </form>;
}
