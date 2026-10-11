import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const dir='dist/_worker.js/chunks';
let checked=0;
for(const file of fs.readdirSync(dir).filter(x=>x.startsWith('_slug')&&x.endsWith('.mjs'))){
 const source=ts.createSourceFile(file,fs.readFileSync(path.join(dir,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function visit(node){
  if(ts.isFunctionLike(node))return;
  if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)&&/^Astro\d*$/.test(node.expression.text)&&['params','request','url','response','props'].includes(node.name.text))throw new Error(`${file}: request-only Astro.${node.name.text} was hoisted to module scope`);
  ts.forEachChild(node,visit);
 }
 visit(source);checked++;
}
if(checked<2)throw new Error('Expected compiled product and category routes');
console.log(`Request-scope regression check passed for ${checked} routes`);
