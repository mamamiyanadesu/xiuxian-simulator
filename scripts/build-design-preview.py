#!/usr/bin/env python3
"""Bundle four isolated design sources into a standalone, selectable preview."""
from pathlib import Path
from html import escape

root = Path(__file__).resolve().parents[1]
out = root / 'design-previews/2026-09-05-xiuxian'
directions = [('A', '旧籍朱批', '暖纸 · 书卷 · 朱批'), ('B', '夜行灯录', '深墨 · 暖灯 · 日志'), ('C', '宗门案牍', '冷纸 · 功簿 · 印记'), ('D', '山野行笺', '灰绿 · 山野 · 行记')]
resizer = '''<style>html,body{min-height:0!important;height:auto!important}body{overflow:hidden!important}</style><script>
function reportSize(){parent.postMessage({kind:'xiuxian-preview-size',height:Math.ceil(document.body.getBoundingClientRect().height)+2},'*')}
new ResizeObserver(reportSize).observe(document.body);addEventListener('load',reportSize);reportSize();
</script>'''
cards = []
for ident, name, tagline in directions:
    src = (out / f'{ident.lower()}.html').read_text()
    src = src.replace('</body>', resizer + '</body>')
    badge = '<span class="rec">推荐</span>' if ident == 'A' else ''
    cards.append(f'''<article class="direction" data-design-option="{ident}" data-name="{name}">
<div class="direction-heading"><div><b>{ident}</b><h2>{name}</h2>{badge}</div><span>{tagline}</span></div>
<div class="frame-stage"><iframe title="{ident} · {name}游戏方向样机" srcdoc="{escape(src, quote=True)}" sandbox="allow-scripts"></iframe></div>
<div class="selection-row"><button class="qmdp-pick-button" type="button">选择 {ident} · {name}</button></div></article>''')
page = '''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>此劫难渡 · 四种界面方向</title>
<style>
*{box-sizing:border-box}html{background:#eeefeb;color:#282c29}body{margin:0;font:400 15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}button,input,textarea{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #737d68;outline-offset:4px}main{max-width:1480px;margin:auto;padding:34px 32px 44px}.intro{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:24px}.intro h1{font-size:28px;font-weight:600;margin:0 0 6px;letter-spacing:.04em}.intro p{margin:0;color:#5b625d;font-size:14px}.intro .project-mark{font:400 13px/1.5 Georgia,serif;letter-spacing:.13em;color:#737970;white-space:nowrap}.dials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;padding:18px 0 24px;border-top:1px solid #d0d5ce;border-bottom:1px solid #d0d5ce;margin-bottom:26px}.dial label{display:flex;justify-content:space-between;gap:12px;font-size:13px;font-weight:500}.dial output{font-variant-numeric:tabular-nums}.dial input{width:100%;accent-color:#4c5948;margin:12px 0 0;min-height:24px}.dial small{font-size:12px;color:#666f66}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-items:start}.direction{border:1px solid #c8cec5;border-radius:9px;background:#fafbf8;overflow:hidden;min-width:0}.direction-heading{padding:16px 20px;display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #c8cec5}.direction-heading>div{display:flex;align-items:center;gap:12px}.direction-heading b{font:400 21px/1 Georgia,serif;color:#7a8376}.direction-heading h2{font-size:17px;font-weight:500;margin:0}.direction-heading>span{font-size:12px;color:#64705e;white-space:nowrap}.rec{color:#41513b;background:#e7eddf;padding:2px 7px;border:1px solid #c4d1b9;font-size:11px;border-radius:3px}.frame-stage{overflow:hidden}.frame-stage iframe{display:block;border:0;width:100%;height:850px;min-width:0}.selection-row{padding:16px 20px;border-top:1px solid #d0d5ce}.selection-row .qmdp-pick-button{margin:0;width:100%;min-height:46px;border:1px solid #515d4c;border-radius:5px;background:#414d3d;color:#f5f7ef;padding:10px 15px;font-weight:500}.direction.is-selected{outline:3px solid #46523f;outline-offset:2px}.details{border-top:1px solid #cbd1c6;margin-top:36px;padding-top:24px}.details h2{font-size:19px;font-weight:500;margin:0 0 14px}.details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 36px}.details p{margin:0;font-size:14px;color:#4e594c}.details strong{color:#293226;font-weight:500}.details .detail-note{margin-top:18px;font-size:13px}.fallback-dialog{max-width:480px;width:calc(100% - 32px);border:1px solid #c7cdc3;border-radius:12px;padding:24px;color:#293226;background:#fafbf8}.fallback-dialog::backdrop{background:#16201466}.fallback-dialog h2{font-size:21px;font-weight:500;margin:0 0 12px}.fallback-dialog textarea{width:100%;min-height:90px;margin:10px 0;border:1px solid #aeb8a8;border-radius:6px;padding:10px}.dialog-actions{display:flex;justify-content:end;gap:10px}.dialog-actions button{min-height:44px;padding:8px 14px;border:1px solid #87927f;border-radius:5px;background:#f3f5ed;color:#283125}.dialog-actions button:last-child{background:#414d3d;color:#fff}.status{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);background:#293326;color:#fafbf8;border-radius:7px;padding:12px 18px;z-index:10}.status:empty{display:none}
@media(max-width:900px){main{padding:24px 20px 32px}.direction-heading{padding:14px}.direction-heading>span{display:none}.grid{gap:18px}.selection-row{padding:14px}.intro .project-mark{display:none}}
@media(max-width:720px){main{padding:22px 12px 32px}.intro{margin-bottom:18px}.intro h1{font-size:24px}.dials{grid-template-columns:1fr;gap:13px;padding:16px 5px}.dial input{margin:4px 0 0}.dial small{display:none}.grid,.details-grid{grid-template-columns:1fr}.direction-heading>span{display:block;font-size:11px}.direction-heading h2{font-size:16px}.direction-heading>div{gap:8px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style></head><body><main>
<header class="intro"><div><h1>此劫难渡 · 界面方向</h1><p>四种方向样机，用于选择视觉与交互气质，尚未接入正式游戏规则。</p></div><span class="project-mark">A CULTIVATOR'S LAST CHANCE</span></header>
<section class="dials" data-qmdp-dials aria-label="设计偏好">
<div class="dial"><label for="variance">视觉冒险度 <output data-qmdp-output="variance">7</output></label><input id="variance" data-qmdp-dial="variance" type="range" min="1" max="10" value="7"><small>从克制熟悉到鲜明大胆</small></div>
<div class="dial"><label for="motion">动效强度 <output data-qmdp-output="motion">3</output></label><input id="motion" data-qmdp-dial="motion" type="range" min="1" max="10" value="3"><small>从安静阅读到丰富反馈</small></div>
<div class="dial"><label for="density">信息密度 <output data-qmdp-output="density">5</output></label><input id="density" data-qmdp-dial="density" type="range" min="1" max="10" value="5"><small>从舒展留白到紧凑集中</small></div>
</section><section class="grid" aria-label="四种设计方向">__CARDS__</section>
<section class="details"><h2>方向说明</h2><div class="details-grid">
<p><strong>A · 旧籍朱批，推荐。</strong>暖纸、朱批和书卷标题，让文字与线索成为主角。系统正文配本地宋体标题；适合目前的仙侠故事与冷幽默。</p>
<p><strong>B · 夜行灯录。</strong>深墨与暖琥珀，像夜里翻开的冒险日志。无衬线配等宽数字，阅读空间更舒展，困境感更强。</p>
<p><strong>C · 宗门案牍。</strong>冷纸、墨线、印记和分项选项，像一页功过账簿。突出规矩与利益，信息密度较高。</p>
<p><strong>D · 山野行笺。</strong>灰绿与米白，开放阅读区配双列行动，像沿途写下的手记。数字使用本地展示字体，整体更轻松清爽。</p>
</div><p class="detail-note">拨盘用于记录正式实现偏好。也可以在确认时写混搭建议，例如保留 A 的配色，采用 B 的阅读布局。</p></section>
</main><dialog id="fallback-dialog" class="fallback-dialog"><h2 id="fallback-title">确认设计方向</h2><p id="fallback-meta"></p><label for="advice">调整建议（可选）</label><textarea id="advice"></textarea><div class="dialog-actions"><button id="fallback-cancel">取消</button><button id="fallback-confirm">确认并复制</button></div></dialog><div id="fallback-status" class="status" role="status"></div>
<script>
const frames=[...document.querySelectorAll('iframe')];addEventListener('message',e=>{if(e.data?.kind!=='xiuxian-preview-size')return;const f=frames.find(x=>x.contentWindow===e.source);if(f&&Number.isFinite(e.data.height))f.style.height=Math.max(300,Math.min(2200,e.data.height))+'px'});
document.querySelectorAll('[data-qmdp-dial]').forEach(input=>input.addEventListener('input',()=>{document.querySelectorAll('[data-qmdp-output="'+input.dataset.qmdpDial+'"]').forEach(out=>out.textContent=input.value)}));
if(location.protocol==='file:'){
 const cards=[...document.querySelectorAll('[data-design-option]')],dialog=document.getElementById('fallback-dialog');let pending;
 function pick(card){pending=card;document.getElementById('fallback-title').textContent='选择 '+card.dataset.designOption+' · '+card.dataset.name;document.getElementById('fallback-meta').textContent='视觉冒险度 '+document.getElementById('variance').value+' / 动效强度 '+document.getElementById('motion').value+' / 信息密度 '+document.getElementById('density').value;dialog.showModal()}
 cards.forEach(c=>c.querySelector('button').addEventListener('click',()=>pick(c)));
 addEventListener('keydown',e=>{if(dialog.open||e.target.matches('input,textarea'))return;let n='1234'.indexOf(e.key);if(n>=0)pick(cards[n])});
 document.getElementById('fallback-cancel').onclick=()=>dialog.close();document.getElementById('fallback-confirm').onclick=async()=>{let text='选 '+pending.dataset.designOption+'：'+pending.dataset.name+'；'+document.getElementById('fallback-meta').textContent+'；建议：'+document.getElementById('advice').value;try{await navigator.clipboard.writeText(text)}catch{}cards.forEach(c=>c.classList.toggle('is-selected',c===pending));dialog.close();document.getElementById('fallback-status').textContent='静态预览不会自动回传，请在对话中发送：'+text};
}
</script></body></html>'''
(out / 'index.html').write_text(page.replace('__CARDS__', '\n'.join(cards)))
print(f'Built {out.name}/index.html ({(out / "index.html").stat().st_size} bytes)')
