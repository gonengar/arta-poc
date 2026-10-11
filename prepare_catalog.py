from pathlib import Path
from zipfile import ZipFile
from html import unescape
import xml.etree.ElementTree as ET
import openpyxl, re, json, hashlib, collections

ROOT=Path(__file__).parent
OUT=ROOT/'context'; OUT.mkdir(exist_ok=True)
def clean(s): return re.sub(r'\s+', ' ', unescape(str(s or '')).replace('\xa0',' ')).strip()
def key(s): return hashlib.sha1(s.encode()).hexdigest()[:16]
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
nodes=[]; stack=[]
with ZipFile(ROOT/'היררכיית קטגוריות ומוצרים.docx') as z:
 for p in ET.fromstring(z.read('word/document.xml')).findall('.//w:body/w:p',ns):
  lv=p.find('w:pPr/w:numPr/w:ilvl',ns)
  if lv is None: continue
  name=clean(''.join(t.text or '' for t in p.findall('.//w:t',ns)))
  if not name: continue
  depth=int(lv.get('{'+ns['w']+'}val')); stack=stack[:depth]
  path=stack+[name]; n={'key':key('/'.join(path)), 'name':name,'depth':depth,'parentKey':key('/'.join(stack)) if stack else '', 'path':path,'order':len(nodes)}
  nodes.append(n);stack=path
brands=[('Winsor & Newton',r'winsor|w&n'),('Old Holland',r'old holland'),('Faber Castell',r'faber'),('Liquitex',r'liquitex'),('Pebeo',r'pebeo'),('Hahnemuhle',r'hahnem'),('Fabriano',r'fabriano'),('Schmincke',r'schmincke'),('Holbein',r'holbein'),('Posca',r'posca'),('Montana',r'montana'),('Edding',r'edding'),('Mungyo',r'mungyo'),('Pop Art',r'pop art'),("Marie's",r'marie'),('NT-Cutter',r'nt.?cutter'),('Speedball',r'speedball'),('Silver Brush',r'silver brush'),('Pink Elephant',r'pink elephant'),('Verano',r'verano'),('Zahn',r'zahn'),('Sticky',r'sticky')]
def classify(name,url):
 s=(name+' '+url).lower()
 technique=next((t for t,pat in [('oil',r'שמן|oil'),('acrylic',r'אקרילי|acrylic'),('watercolor',r'צבעי? מים|watercolo|אקוורל'),('charcoal',r'פחם|charcoal'),('pastel',r'פסטל|pastel'),('gouache',r'גואש|gouache')] if re.search(pat,s)), '')
 if re.search(r'מכחול|מברשת|paintbrush|brushes',s): kind='brush';root='מכחולים'
 elif re.search(r'בלוק|נייר|סקיצ|sketchbook|paper|block',s): kind='paper';root='ניירות ובלוקים'
 elif re.search(r'קנווס|קנבס|canvas',s): kind='canvas';root='קנווסים'
 elif re.search(r'מדיום|ורניש|לכה|טרפנטין|מדלל|דבק|ג.סו|medium|varnish|gesso|glue',s): kind='medium';root='חומרים'
 elif re.search(r'פלסטלינה|חימר|פיסול|גבס|clay|sculpt',s): kind='sculpture';root='פיסול'
 elif re.search(r'כני|כן ציור|סכין|סכני|מספר|פלטה|פלטות|מחק|מחדד|easel|cutter|eraser|sharpener',s): kind='accessory';root='אביזרים לאומן ולסטודיו'
 elif re.search(r'עפרו|טוש|פחם|פסטל|גרפיט|קליגרפ|pencil|marker|charcoal|pastel',s): kind='drawing';root='רישום'
 elif re.search(r'זכוכית|קרמיקה|הובי|תוחם',s): kind='hobby';root='צבעים להובי'
 elif re.search(r'צבע|color|colour|paint',s): kind='paint';root='צבעים לאומנות'
 else: kind='accessory';root='אביזרים לאומן ולסטודיו'
 return kind,root,technique

rows=list(openpyxl.load_workbook(next(ROOT.glob('*.xlsx')),read_only=True,data_only=True).active.values)[1:]
groups={}; invalid_images=0
for rownum,row in enumerate(rows,2):
 sku=clean(row[0]); name=clean(row[1]); image=row[3] if isinstance(row[3],str) and row[3].startswith('https://') else '';url=row[4] if isinstance(row[4],str) and row[4].startswith('https://') else ''
 if not image: invalid_images+=1
 brand=next((b for b,p in brands if re.search(p,name,re.I)), '')
 kind,root,technique=classify(name,url)
 sm=re.search(r'שם גוון\s*:\s*(.*?)(?=\s*מס[\w\W]{0,4} גוון|$)',name)
 shade=clean(sm.group(1)) if sm else ''
 cm=re.search(r'מס(?:פר|\.?|\x27)?\s*גוון\s*:\s*([^\s]+)',name);code=cm.group(1) if cm else ''
 size_match=re.search(r'(\d+(?:\.\d+)?)\s*(מ"ל|מל|ליטר|ml)\b',name,re.I);size=size_match.group(0) if size_match else ''
 base=name
 if shade:
  base=re.split(r'שם גוון\s*:|מס(?:פר|\.?|\x27)?\s*גוון\s*:',name)[0]
  base=re.sub(r'\d+(?:\.\d+)?\s*(?:מ"ל|מל|ליטר|ml)\b','',base,flags=re.I)
  base=re.sub(r'סריה\s*[A-Z]','',base)
  base=clean(base).strip(' -,:')
 # Explicitly recognizable paint families support the documented shade/size UI.
 if kind=='paint' and technique and 'סט' not in name:
  if brand=='Old Holland': base=f'Old Holland צבעי '+{'oil':'שמן','acrylic':'אקריליק','watercolor':'מים'}.get(technique,technique)
  if brand=='Winsor & Newton' and 'winton' in name.lower(): base='Winsor & Newton צבעי שמן Winton'
 if not shade and base!=name:
  tail=re.split(r'מ"ל',name)[-1];shade=clean(re.split(r'מס(?:פר|\.?|\x27)?\s*גוון\s*:',tail)[0]).strip(' -,:') or name
 groupkey=key(base if shade or base!=name else sku)
 g=groups.setdefault(groupkey,{'key':groupkey,'name':base,'brand':brand,'kind':kind,'root':root,'technique':technique,'image':image,'description':'','variants':[],'categoryKeys':[],'mappingStatus':'inferred-from-source-name'})
 desc=clean(re.sub('<[^>]+>',' ',str(row[2] or '')))
 if desc and not g['description']:g['description']=desc
 if image and not g['image']:g['image']=image
 series=next((x for x in ['Winton','Artist','Artisan','Polychromos','Artistico','Heavy Body','Studio','Basic','Promarker'] if x.lower() in name.lower()),'')
 g['series']=series or g.get('series','')
 g['level']='artist' if re.search(r"artist|professional|מקצועי",base,re.I) else 'student' if re.search(r'winton|studio|basic|סטודנט',base,re.I) else ''
 g['variants'].append({'sku':sku,'name':name,'shade':shade,'shadeCode':code,'size':size,'image':image,'sourceUrl':url,'sourceRow':rownum,'demoPrice':float(29+(int(sku)%14)*10)})

for g in groups.values():
 # Shade-code labels contain the word "number"; they are not scissors/accessories.
 classification_name=re.sub(r'מס(?:פר|\.?|\x27)?\s*גוון\s*:.*','',g['variants'][0]['name'])
 g['kind'],g['root'],g['technique']=classify(classification_name,g['variants'][0]['sourceUrl'])
 g['brushShape']=next((x for x in ['פילברט','עגול','שטוח','ליינר','מניפה'] if x in classification_name),'') if g['kind']=='brush' else ''
 brush_size=re.search(r'(?:מס[.\x27]?|מידה)\s*(\d+(?:/\d+)?)',classification_name)
 g['brushSize']=brush_size.group(1) if g['kind']=='brush' and brush_size else ''
 if 'מתחיל' in classification_name:g['level']='beginner'
 matched=[]
 for n in nodes:
  label=n['name'];path=n['path'];root=path[0]; kind=g['kind'];tech=g['technique'];s=(g['name']+' '+g['brand']).lower()
  if n['depth']==0:
   ok=root==g['root'] or root=='מותגים' and bool(g['brand'])
  else:
   # Keep mappings reproducible and explicitly inferred; empty source branches remain browsable.
   technique_word={'oil':'שמן','watercolor':'מים','acrylic':'אקריליק','charcoal':'פחם','pastel':'פסטל','gouache':'גואש'}.get(tech,'')
   ok=(label.lower() in s or (g['brand']=='Faber Castell' and label=='Faber Casstel') or (g['brand']=='Hahnemuhle' and label=='Hahnemuehle'))
   if technique_word and technique_word in label:
    ok=ok or (kind=='paint' and label.startswith('צבעי')) or (kind=='brush' and 'מכחול' in label) or (kind=='paper' and ('נייר' in label or 'בלוק' in label)) or (kind=='medium' and ('חומרים' in label or 'מדיום' in label or 'ורניש' in label))
   if label==technique_word and root=='צבעים לאומנות':ok=True
   if root=='מותגים' and len(path)>1:
    target=path[1].lower().replace('casstel','castell')
    ok=ok and (target in g['brand'].lower() or target=='hahnemuehle' and g['brand']=='Hahnemuhle' or target=='montana-cans' and g['brand']=='Montana')
   if root not in [g['root'],'מותגים','צבעים לאומנות'] and not technique_word:ok=False
  if ok:matched.append(n)
 keys=set()
 for n in matched:
  for i in range(1,len(n['path'])+1):keys.add(key('/'.join(n['path'][:i])))
 g['categoryKeys']=sorted(keys)

products=[]
for g in groups.values():
 g['familyKey']=g['key']
 g['familyVariantCount']=len(g['variants'])
 if len(g['variants'])<=100: products.append(g)
 else:
  for i in range(0,len(g['variants']),100):
   products.append({**g,'key':key(g['key']+':'+str(i//100)), 'variants':g['variants'][i:i+100]})
catalog={'sourceFile':next(ROOT.glob('*.xlsx')).name,'sourceRows':len(rows),'missingImageCount':invalid_images,'categories':nodes,'products':products,'pricingMode':'demo-disabled','checkoutEnabled':False}
(OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
print(json.dumps({'skus':len(rows),'productFamilies':len(groups),'categories':len(nodes),'missingImages':invalid_images,'maxVariants':max(len(g['variants']) for g in groups.values())}))
