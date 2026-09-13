import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root='src/components';
const excluded=new Set(['SignInPage.jsx','SupportPage.jsx','AIAssistantPage.jsx','FormattedText.jsx']);
const files=fs.readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.jsx')&&!excluded.has(path.basename(x)));
for(const rel of files){
 const file=path.join(root,rel); let source=fs.readFileSync(file,'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX), edits=[];
 const trans=s=>/[A-Za-z]/.test(s)&&!/^\s*$/.test(s)&&!s.includes('://')&&!s.includes('@');
 function add(node,text){edits.push([node.getStart(ast),node.end,text]);}
 function expr(node){
  if(ts.isStringLiteral(node)&&trans(node.text)){add(node,`t(${JSON.stringify(node.text)})`);return;}
  if(ts.isConditionalExpression(node)){expr(node.whenTrue);expr(node.whenFalse);}
 }
 function visit(node){
  if(ts.isJsxText(node)){
   const text=node.text.replace(/\s+/g,' ').trim();
   if(trans(text)){add(node,`{t(${JSON.stringify(text)})}`);return;}
  }
  if(ts.isJsxAttribute(node)&&['label','title','description','placeholder','text','alt','aria-label','cta','body'].includes(node.name.text)&&node.initializer&&ts.isStringLiteral(node.initializer)&&trans(node.initializer.text)){
   add(node.initializer,`{t(${JSON.stringify(node.initializer.text)})}`);return;
  }
  if(ts.isJsxExpression(node)&&node.expression){expr(node.expression);}
  ts.forEachChild(node,visit);
 }
 visit(ast);
 if(!edits.length)continue;
 for(const [a,b,text] of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+text+source.slice(b);
 const changed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX),inserts=[];
 for(const node of changed.statements){
  if(ts.isFunctionDeclaration(node)&&node.name&&/^[A-Z]/.test(node.name.text)&&node.body){
   const body=source.slice(node.body.pos,node.body.end);
   if(/\bt\(/.test(body)&&!/(?:const|let)\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage/.test(body))inserts.push(node.body.getStart(changed)+1);
  }
 }
 for(const i of inserts.sort((a,b)=>b-a))source=source.slice(0,i)+'\n  const { t } = useLanguage();'+source.slice(i);
 if(!source.includes('import { useLanguage }')&&!/import\s*\{[^}]*useLanguage[^}]*\}/.test(source)){
  let imp=path.relative(path.dirname(file),'src/lib/i18n.jsx').replaceAll('\\','/');if(!imp.startsWith('.'))imp='./'+imp;
  source=`import { useLanguage } from ${JSON.stringify(imp)};\n`+source;
 }
 fs.writeFileSync(file,source);
 console.log(rel+': '+edits.length+' texts');
}
