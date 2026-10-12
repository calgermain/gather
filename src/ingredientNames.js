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
 'Olive oil':['olive oil'], Salt:['salt'], 'Black pepper':['black pepper'],
};
const dictionary=new Map(Object.entries(groups).flatMap(([name,aliases])=>aliases.map(alias=>[alias,name])));
const preparation=/^(?:(?:finely|roughly|thinly|freshly|coarsely)\s+)?(?:minced|chopped|diced|sliced|peeled|crushed|grated|shredded|rinsed|drained|beaten|trimmed|washed)(?:\s+(?:and|&|then)\s+(?:(?:finely|roughly|thinly|coarsely)\s+)?(?:minced|chopped|diced|sliced|peeled|crushed|grated|shredded|rinsed|drained|beaten|trimmed|washed))*$/i;
const isPreparation=text=>preparation.test(text.replace(/^[,\s]+|[,\s]+$/g,''));
export function ingredientName(value){
 const original=String(value||'').trim().replace(/\s+/g,' ');
 let text=original.replace(/\(([^()]*)\)/g,(all,inner)=>isPreparation(inner)?'':all).trim();
 const comma=text.indexOf(',');if(comma>=0&&isPreparation(text.slice(comma+1)))text=text.slice(0,comma).trim();
 text=text.replace(/\s+/g,' ').trim();
 const direct=dictionary.get(text.toLowerCase());if(direct)return direct;
 // Only remove sizes and leading prep when the rest is a known ingredient.
 const candidate=text.replace(/^(?:(?:small|medium|large|extra[- ]large|finely|roughly|thinly|coarsely|minced|chopped|diced|sliced|peeled|crushed|grated)\s+)+/i,'');
 return dictionary.get(candidate.toLowerCase())||text||original;
}
export function normalizeIngredient(ingredient){
 const name=ingredientName(ingredient.name);
 const originalName=ingredient.originalName||ingredient.name;
 // "3 large garlic cloves" encodes the clove unit in the name, not a bulb.
 const cloveCount=name==='Garlic'&&/\bcloves?\b/i.test(ingredient.name)&&(!ingredient.unit||ingredient.unit==='each');
 return {...ingredient,name,...(name!==ingredient.name?{originalName}:{}),...(cloveCount?{unit:'clove'}:{})};
}
