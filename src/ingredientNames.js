// Conservative aliases: preparation changes the label; product type stays distinct.
const groups = {
 Garlic:['garlic','garlic clove','garlic cloves','clove of garlic','cloves of garlic'],
 Carrot:['carrot','carrots'], Onion:['onion','onions'],
 'Yellow onion':['yellow onion','yellow onions','brown onion','brown onions'],
 'Red onion':['red onion','red onions'], Potato:['potato','potatoes'],
 Tomato:['tomato','tomatoes'], Egg:['egg','eggs'],
 'Green onion':['green onion','green onions','spring onion','spring onions','scallion','scallions'],
 Cilantro:['cilantro','coriander leaves','fresh coriander leaves'],
 'Garlic powder':['garlic powder'], 'Garlic paste':['garlic paste'],
 'Coconut milk':['coconut milk'], 'Coconut cream':['coconut cream'], Milk:['milk'],
 'Red curry paste':['red curry paste','thai red curry paste'],
 'Chicken breast':['chicken breast','chicken breasts'], 'Chicken thigh':['chicken thigh','chicken thighs'],
 'Salted butter':['salted butter'], 'Unsalted butter':['unsalted butter'], Butter:['butter'],
 'Light brown sugar':['light brown sugar'], 'Dark brown sugar':['dark brown sugar'], 'Brown sugar':['brown sugar'],
 'Chocolate chips':['chocolate chips','chocolate chip'],
 'All-purpose flour':['flour','plain flour','all purpose flour','all-purpose flour','all purpose (plain) flour'],
 'Bread flour':['bread flour'], 'Self-rising flour':['self-rising flour','self rising flour','self-raising flour','self raising flour'],
 'Almond flour':['almond flour'], 'Whole wheat flour':['whole wheat flour','whole-wheat flour','wholemeal flour'],
 'Olive oil':['olive oil'], Salt:['salt'], 'Black pepper':['black pepper'],
};
const dictionary=new Map(Object.entries(groups).flatMap(([name,aliases])=>aliases.map(alias=>[alias,name])));
const preparation=/^(?:(?:finely|roughly|thinly|freshly|coarsely)\s+)?(?:minced|chopped|diced|sliced|peeled|crushed|grated|shredded|rinsed|drained|beaten|trimmed|washed|softened|melted|packed|sifted|at room temperature)(?:\s+(?:and|&|then)\s+(?:(?:finely|roughly|thinly|coarsely)\s+)?(?:minced|chopped|diced|sliced|peeled|crushed|grated|shredded|rinsed|drained|beaten|trimmed|washed|softened|melted|packed|sifted|at room temperature))*$/i;
const isPreparation=text=>preparation.test(text.replace(/^[,\s]+|[,\s]+$/g,''));
const packageSize=/^\d+(?:\.\d+)?\s*(?:oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?)(?:\s*(?:can|jar|bag|box|package|packet|bottle))?$/i;
function cleanAnnotations(value){
 const original=String(value||'').trim().replace(/\s+/g,' ');let text=original;const packageNotes=[];
 // Peel nested wrappers from the inside; retain unknown/product qualifiers.
 for(let pass=0;pass<8;pass++){
  const next=text.replace(/\(([^()]*)\)/g,(all,inner)=>{const note=inner.replace(/^[,\s]+|[,\s]+$/g,'');if(packageSize.test(note)){packageNotes.push(note);return '';}return !note||isPreparation(note)?'':all;});
  if(next===text)break;text=next;
 }
 return {original,text:text.trim(),packageNotes};
}
export function ingredientName(value){
 const {original,text:cleaned}=cleanAnnotations(value);let text=cleaned;
 const comma=text.indexOf(',');if(comma>=0&&isPreparation(text.slice(comma+1)))text=text.slice(0,comma).trim();
 text=text.replace(/\s+/g,' ').trim();
 const direct=dictionary.get(text.toLowerCase());if(direct)return direct;
 // Only remove sizes and leading prep when the rest is a known ingredient.
 const candidate=text.replace(/^(?:(?:small|medium|large|extra[- ]large|finely|roughly|thinly|coarsely|minced|chopped|diced|sliced|peeled|crushed|grated)\s+)+/i,'');
 return dictionary.get(candidate.toLowerCase())||text||original;
}
export function normalizeIngredient(ingredient){
 const name=ingredientName(ingredient.name);
 const packageNotes=[...new Set([...(ingredient.packageNotes||[]),...cleanAnnotations(ingredient.name).packageNotes])];
 const originalName=ingredient.originalName||ingredient.name;
 // "3 large garlic cloves" encodes the clove unit in the name, not a bulb.
 const cloveCount=name==='Garlic'&&/\bcloves?\b/i.test(ingredient.name)&&(!ingredient.unit||ingredient.unit==='each');
 return {...ingredient,name,...(packageNotes.length?{packageNotes}:{}),...(name!==ingredient.name?{originalName}:{}),...(cloveCount?{unit:'clove'}:{})};
}
