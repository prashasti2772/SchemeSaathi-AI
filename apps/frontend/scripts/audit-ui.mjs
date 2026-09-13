import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
const source=fs.readFileSync('src/lib/i18n.jsx','utf8');const start=source.indexOf('const STRINGS = ')+16,end=source.indexOf('\nconst LanguageContext');
const strings=vm.runInNewContext('('+source.slice(start,end).trim().replace(/;$/,'')+')');
const known=new Set(Object.keys(strings).concat(Object.values(strings).map(x=>x.en.toLowerCase())));
const keys=new Set();
for(const f of fs.readdirSync('src/components',{recursive:true}).filter(x=>x.endsWith('.jsx'))){const s=fs.readFileSync('src/components/'+f,'utf8'),ast=ts.createSourceFile(f,s,99,true,ts.ScriptKind.JSX);function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='t'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))keys.add(n.arguments[0].text);ts.forEachChild(n,walk);}walk(ast);}
fs.writeFileSync('scripts/missing-ui.json',JSON.stringify([...keys].filter(k=>!known.has(k)&&!known.has(k.toLowerCase())).sort(),null,2));console.log('New keys',JSON.parse(fs.readFileSync('scripts/missing-ui.json')).length);console.log(JSON.parse(fs.readFileSync('scripts/missing-ui.json')).join('\n'));
