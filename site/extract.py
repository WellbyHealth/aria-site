# One-time: pull specialty content out of the old single-page site into site/data/specialties.json
import re, json, html
s=open('/home/claude/v109/index.html').read()
def txt(h): 
    h=re.sub(r'<svg.*?</svg>','',h,flags=re.S); h=re.sub(r'<[^>]+>',' ',h); return re.sub(r'\s+',' ',html.unescape(h)).strip()
GROUPS=[('in-primary','primary-care','Primary and behavioral care'),('in-specialists','specialists','Medical specialists'),('in-infusion','infusion','Infusion and buy-and-bill'),('in-surgical','surgical','Surgical and procedural'),('in-facilities','surgery-centers','Surgery centers and diagnostics'),('in-dental','dental','Dental'),('in-eye','eye-care','Eye care'),('in-aesthetics','aesthetics-rehab','Aesthetics and rehab'),('in-postacute','post-acute','Post-acute and pharmacy')]
out={'groups':[],'specialties':[]}
for view,gslug,gname in GROUPS:
    i=s.index(f'data-view="{view}"'); j=s.find('<div class="view"',i+10); vh=s[i:j]
    h1=txt((re.search(r'<h1[^>]*>(.*?)</h1>',vh,re.S) or [None,''])[1]); lead=txt((re.search(r'<p class="lead">(.*?)</p>',vh,re.S) or [None,''])[1])
    keys=re.findall(r'role="tab" class="stab" id="st-([a-z0-9-]+)"[^>]*>(.*?)</button>',vh,re.S)
    g={'slug':gslug,'name':gname,'h1':h1,'lead':lead,'members':[k for k,_ in keys]}; out['groups'].append(g)
    if not keys: keys=[(gslug,'Dental')]; g['members']=[gslug]
    for k,name in keys:
        if f'id="sp-{k}"' in vh:
            a=vh.index(f'id="sp-{k}"'); b=vh.find('role="tabpanel"',a+20); p=vh[a:b if b>0 else len(vh)]
        else: p=vh
        def one(rx): m=re.search(rx,p,re.S); return txt(m.group(1)) if m else ''
        d={'slug':k,'name':txt(name),'group':gslug,
           'eyebrow':one(r'<p class="eyebrow">(.*?)</p>'),'hook':one(r'<h2 class="spec-h">(.*?)</h2>'),'lead':one(r'<p class="lead">(.*?)</p>'),
           'rows':[{'name':txt(n),'desc':txt(dd),'amt':txt(am)} for n,dd,am in re.findall(r'<div class="prow"><div><b>(.*?)</b><small>(.*?)</small></div><span class="amt">(.*?)</span>',p,re.S)],
           'outcomes':[{'t':txt(x),'d':txt(y)} for x,y in re.findall(r'<li><b>(.*?)</b><span>(.*?)</span></li>',(re.search(r'<ul class="sp-out".*?</ul>',p,re.S) or re.search('x^','') or [''])[0] if re.search(r'<ul class="sp-out".*?</ul>',p,re.S) else '')],
           'money':one(r'Where the money goes</h3></div><div class="prose"><p>(.*?)</p>'),
           'card':[{'t':txt(x),'d':txt(y)} for x,y in re.findall(r'<dt>(.*?)</dt><dd>(.*?)</dd>',(re.search(r'How the card helps.*?</dl>',p,re.S).group(0) if re.search(r'How the card helps.*?</dl>',p,re.S) else ''))],
           'pitch':one(r'<p class="sp-pitch">(.*?)</p>'),
           'table':{txt(a2):txt(b2) for a2,b2 in re.findall(r'<tr><th scope="row"><a[^>]*>(.*?)</a></th><td>(.*?)</td></tr>',p,re.S)},
           'faqs':[{'q':txt(q),'a':txt(a3)} for q,a3 in re.findall(r'<details><summary>(.*?)</summary>\s*<div class="ans">(.*?)</div>\s*</details>',p,re.S)],
           'calc':'eye-float' in p}
        out['specialties'].append(d)
import os; os.makedirs('/home/claude/v109/site/data',exist_ok=True)
json.dump(out,open('/home/claude/v109/site/data/specialties.json','w'),indent=1)
print(len(out['specialties']),'specs'); 
import collections
for f in ['hook','lead','money','pitch']: print(f,sum(1 for x in out['specialties'] if x[f]))
print('rows',sum(1 for x in out['specialties'] if x['rows']),'card',sum(1 for x in out['specialties'] if x['card']),'faqs',sum(len(x['faqs']) for x in out['specialties']),'table',sum(1 for x in out['specialties'] if x['table']),'out',sum(1 for x in out['specialties'] if x['outcomes']))
print(json.dumps(out['specialties'][0],indent=1)[:2500])
