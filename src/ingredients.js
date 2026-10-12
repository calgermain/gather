const aliases = {cups:'cup', tablespoons:'tbsp', tablespoon:'tbsp', teaspoons:'tsp', teaspoon:'tsp', pounds:'lb', pound:'lb', lbs:'lb', ounces:'oz', ounce:'oz', grams:'g', gram:'g', kilograms:'kg', liters:'l', milliliters:'ml', cloves:'clove', cans:'can', jars:'jar', boxes:'box', bags:'bag'};
export function scaleIngredients(ingredients,from,to){const factor=Number(to)/Number(from);if(!Number.isFinite(factor)||factor<=0)return ingredients;return ingredients.map(i=>({...i,qty:i.qty===''?'':Number((Number(i.qty)*factor).toPrecision(12))}));}
export const canonicalUnit = u => aliases[String(u||'each').toLowerCase().trim()] || String(u||'each').toLowerCase().trim();
export function normalize(s){const text=String(s||'').toLowerCase().trim().replace(/\s+/g,' ');return ({carrots:'carrot',onions:'onion','yellow onions':'yellow onion',potatoes:'potato',tomatoes:'tomato',eggs:'egg','garlic cloves':'garlic'})[text]||text;}
const units={tsp:['volume',4.92892159375],tbsp:['volume',14.78676478125],cup:['volume',236.5882365],ml:['volume',1],l:['volume',1000],oz:['weight',28.349523125],lb:['weight',453.59237],g:['weight',1],kg:['weight',1000]};
export function convert(qty,from,to){from=canonicalUnit(from);to=canonicalUnit(to);if(from===to)return qty;const a=units[from],b=units[to];return a&&b&&a[0]===b[0]?qty*a[1]/b[1]:null;}
export function parseIngredient(line){
 const fractions={'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'};
 const text=String(line).replace(/(\d)([½¼¾⅓⅔⅛⅜⅝⅞])/g,'$1 $2').replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g,c=>fractions[c]).trim();
 const m=text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)$/);
 if(!m)return {name:text,qty:0,unit:'to taste'};
 const qty=m[1].split(/\s+/).reduce((sum,v)=>sum+(v.includes('/')?Number(v.split('/')[0])/Number(v.split('/')[1]):Number(v)),0);
 const rest=m[2].match(/^(tablespoons?|teaspoons?|cups?|pounds?|ounces?|kilograms?|grams?|milliliters?|liters?|lbs?|oz|kg|g|tbsp|tsp|ml|l|each|cans?|jars?|boxes?|bags?|bunch|cloves?)\b\.?\s*(.*)$/i);
 return {qty:Number.isFinite(qty)?qty:0,unit:rest?canonicalUnit(rest[1]):'each',name:rest?rest[2].trim():m[2].trim()};
}
export function buildGrocery(data,weekStart){
 const endDate=new Date(`${weekStart}T12:00:00`);endDate.setDate(endDate.getDate()+6);const end=`${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
 const need=[],notices=new Set();const meals=data.meals.filter(m=>m.date>=weekStart&&m.date<=end&&m.status==='planned'&&m.recipeId);
 for(const meal of meals){const recipe=data.recipes.find(r=>r.id===meal.recipeId);if(!recipe)continue;const factor=Number(meal.servings)/Number(recipe.servings);if(!Number.isFinite(factor)||factor<=0)continue;
 for(const ing of recipe.ingredients||[]){const key=normalize(ing.name);if(!key)continue;const unit=canonicalUnit(ing.unit);let item=need.find(x=>x.key===key&&convert(1,unit,x.unit)!==null);if(!item){item={key,name:ing.name,qty:0,unit,sources:[],category:category(ing.name)};need.push(item);}const q=Number(ing.qty);if(!Number.isFinite(q)||q<=0){notices.add(`${ing.name}: no measurable quantity; review before shopping.`);item.unmeasured=true;}else item.qty+=convert(q*factor,unit,item.unit);item.sources.push(meal.title);}}
 const rows=need.map(item=>{const siblings=need.filter(x=>x.key===item.key);if(siblings.length>1)notices.add(`${item.name}: incompatible units shown separately; review package sizes.`);let stock=0;for(const p of data.pantry.filter(p=>normalize(p.name)===item.key)){const q=convert(Number(p.qty),p.unit,item.unit);if(q===null)notices.add(`${p.name}: pantry unit ${p.unit} cannot be deducted from ${item.unit}.`);else if(Number.isFinite(q)&&q>0)stock+=q;}const id=`${item.key}|${item.unit}`;return {...item,id,needed:item.qty,have:Math.min(stock,item.qty),buy:Math.max(0,item.qty-stock),checked:!!data.checked?.[`${weekStart}:${id}`]};});
 return {rows:rows.sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)),notices:[...notices],mealCount:meals.length};
}
export function category(n){n=n.toLowerCase();if(/coconut milk|broth|tomato paste|sundried|oil|pasta|macaroni|rice|flour|curry|spice|sugar|salt|beans|tortilla/.test(n))return 'Pantry';if(/chicken|beef|pork|shrimp|fish|turkey/.test(n))return 'Meat & seafood';if(/milk|cheese|butter|cream|yogurt|egg/.test(n))return 'Dairy & refrigerated';if(/carrot|onion|potato|garlic|spinach|tomato|pepper|squash|lettuce|lemon|cilantro|apple/.test(n))return 'Produce';return 'Other';}
