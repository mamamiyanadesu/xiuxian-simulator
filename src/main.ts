import './style.css';
import { RULES, SYMPTOMS } from './config.ts';
import { currentEvent, createGame, transition, choiceBlock, choiceCost, actionBlock, lifeCost, knownTribulationRisks, riskLabel, closingBudget } from './engine.ts';
import { loadGame, saveGame } from './storage.ts';
import type { Action, Game, HazardKind, History } from './types.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const esc = (text: string | number) => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let store: Storage;
try { store = window.localStorage; } catch { store = { getItem() { throw Error(); }, setItem() { throw Error(); } } as unknown as Storage; }
const loaded = loadGame(store);
let game: Game | null = loaded.kind === 'valid' ? loaded.game : null;
let playing = false;
let warning = 'message' in loaded ? loaded.message ?? '' : '';
let busy = false;
let inputMode = 'pointer';
document.addEventListener('keydown', () => { inputMode = 'keyboard'; document.body.dataset.input = inputMode; });
document.addEventListener('pointerdown', () => { inputMode = 'pointer'; document.body.dataset.input = inputMode; });

function button(label: string, id: string, options: { detail?: string; disabled?: string | null; primary?: boolean; revision?: number } = {}) {
  return `<button type="button" data-action="${esc(id)}" ${options.revision !== undefined ? `data-revision="${options.revision}"` : ''} class="${options.primary ? 'primary' : ''}" ${options.disabled ? 'disabled' : ''}><span>${esc(label)}</span>${options.detail ? `<small>${esc(options.detail)}</small>` : ''}${options.disabled ? `<small class="blocked-reason">${esc(options.disabled)}</small>` : ''}</button>`;
}
function persist() {
  if (game && !saveGame(store, game)) warning = '本次无法自动保存。可以继续修行，请暂时不要关闭页面。';
}
function header() {
  return `<header><a class="brand" href="#" data-action="home" aria-label="此劫难渡，返回行笺首页">此劫难渡<span class="brand-dot" aria-hidden="true">·</span></a><button class="plain" data-action="help">修行须知</button></header>`;
}
function metrics(s: Game) {
  return `<section class="metrics" aria-label="当前修行状态">
    <div><span class="metric-label">修为 <small>筑基 → 金丹</small></span><p class="number">${s.cultivation}<small> / ${RULES.threshold}</small></p><div class="track"><span style="transform:scaleX(${Math.min(1, s.cultivation / RULES.threshold)})"></span></div></div>
    <div><span class="metric-label">余寿</span><p class="number ${s.life <= 4 ? 'danger' : ''}">${s.life}<small> 寿元</small></p><div class="track life"><span style="transform:scaleX(${s.life / RULES.startLife})"></span></div></div>
    <div><span class="metric-label">心魔</span><p class="number ${s.heartDemon >= 60 ? 'danger' : ''}">${s.heartDemon}<small> / 100</small></p><div class="track heart"><span style="transform:scaleX(${s.heartDemon / 100})"></span></div></div>
  </section>${s.phase === 'encounter' ? budget(s) : ''}`;
}
function journey(s: Game) {
  return `<div class="journey"><span>山门之外</span><span class="journey-line" aria-hidden="true"></span><span>第 ${s.encounterCount} 程 · ${esc(currentEvent(s).place)}</span></div>`;
}
function budget(s: Game) {
  const b = closingBudget(s);
  const parts = ['引雷 1', '留命 1'];
  if (b.diagnose) parts.push(`内观 ${b.diagnose}`);
  if (b.remedy) parts.push(`调息 ${b.remedy}`);
  if (b.meditate) parts.push(`静心 ${b.meditate}`);
  return `<aside class="closing-budget ${b.spendable <= 2 ? 'tight' : ''}" aria-label="收尾预算"><p><strong>${b.spendable >= 0 ? `还可支配 ${b.spendable} 寿元` : `常规收尾尚缺 ${-b.spendable} 寿元`}</strong><span>${s.hazards.length ? '补救后' : ''}修为还差 ${b.cultivationGap}</span></p><small>收尾预留 ${b.reserve} · ${parts.join('、')}${s.pending ? '；看炉约定另计' : ''}</small></aside>`;
}
function delta(h: History) {
  const labels = [['修为', h.delta.cultivation], ['余寿', h.delta.life], ['心魔', h.delta.heart]] as const;
  return `<div class="deltas">${labels.map(([name, n]) => `<span>${name} <b>${n > 0 ? '+' : ''}${n}</b></span>`).join('')}</div>`;
}
function status(s: Game, actionable = true) {
  return `<aside class="body-state" aria-label="身体与约定">
    ${s.hazards.length ? s.hazards.map(h => `<div class="symptom"><span class="small-label">${h.diagnosed ? esc(h.kind) : '身体征兆'}</span><p>${esc(SYMPTOMS[h.kind])}</p>${h.diagnosed && actionable ? button(`化解${h.kind}`, `remedy:${h.kind}`, { detail: `余寿 −${RULES.remedyLife} · 修为 −${RULES.remedyCultivation}`, disabled: actionBlock(s, { type: 'remedy', kind: h.kind }), revision: s.revision }) : ''}</div>`).join('') : '<p class="healthy">行气平顺，暂无身体异样。</p>'}
    ${s.pending ? `<div class="pending"><span class="small-label">未了约定</span><p>许前辈的炉火还未熄。已受 ${s.pending.gain} 修为；原契可全额退还，或再守 3 寿元换 10 修为。${s.encounterId !== 'fire' ? `后续将在 ${Math.max(1, s.pending.due - s.encounterCount)} 个遭遇内到来。` : ''}</p>${s.encounterId !== 'fire' && actionable ? button('先了结看炉约定', 'settle', { detail: '前往不扣寿元，履约或退契另计', revision: s.revision }) : ''}</div>` : ''}
  </aside>`;
}
function actions(s: Game) {
  const e = currentEvent(s);
  return `<div class="choices" aria-label="作出选择">${e.investigation ? button(s.encounterState.investigated ? '线索已查明' : '先调查线索', 'investigate', { detail: s.encounterState.investigated ? '已取得依据，不再消耗寿元' : '余寿 −1 · 留在当前遭遇', disabled: actionBlock(s, { type: 'investigate' }), revision: s.revision }) : ''}
  ${e.choices.map(c => {
    const cost = choiceCost(s, c);
    let detail = `修为 ${c.gain - cost.cultivation >= 0 ? '+' : ''}${c.gain - cost.cultivation} · 余寿 −${cost.life} · 心魔 +${c.heart}`;
    detail += ` · ${riskLabel(c.risk?.chance ?? 0)}`;
    if (c.contract === 'accept') detail += ' · 须回来看炉；退契归还 22 修为';
    return button(c.label, `choose:${c.id}`, { detail, disabled: choiceBlock(s, c), revision: s.revision });
  }).join('')}</div>`;
}
function toolsBar(s: Game) {
  return `<nav class="tools" aria-label="修行行动">${button('内观', 'diagnose', { detail: '余寿 −1 · 查明所有征兆', disabled: actionBlock(s, { type: 'diagnose' }), revision: s.revision })}${button('静心', 'meditate', { detail: '余寿 −1 · 心魔最多 −20', disabled: actionBlock(s, { type: 'meditate' }), revision: s.revision })}${button('准备渡劫', 'tribulate', { detail: '余寿 −1 · 先预览条件', disabled: actionBlock(s, { type: 'tribulate' }), revision: s.revision })}</nav>`;
}
function history(s: Game, reveal = false) {
  return `<details class="history" ${reveal ? 'open' : ''}><summary>${reveal ? '翻阅这一世的因果' : '翻阅行笺'} <span>${s.history.length} 次行动</span></summary>${s.history.length ? `<ol>${s.history.map(h => `<li><div class="history-heading"><span>${esc(h.title)}</span><strong>${esc(h.action)}</strong></div>${delta(h)}<p>${esc(h.result)}</p>${h.symptom ? `<p class="danger">${esc(h.symptom)}</p>` : ''}${reveal ? `<p class="truth">事后看清 · ${esc(h.truth)}</p>` : ''}</li>`).join('')}</ol>` : '<p>行笺尚未落笔。选择之后，得失都会记在这里。</p>'}</details>`;
}
function home() {
  return `<section class="intro view"><div class="journey"><span>山野行笺</span><span class="journey-line" aria-hidden="true"></span><span>一名筑基散修的余途</span></div><h1 tabindex="-1">此劫，<br>还能渡过去吗。</h1><p class="intro-lead">你修到筑基，已经老了。<br>离金丹还差一程，离寿尽也只剩一程。</p><p>山外总有人愿意帮忙。有的要你守一夜炉，有的只把功法传给有缘人。好处都是真的，没说完的话也是。</p><div class="intro-rule"><span><b>${RULES.startCultivation}</b> 起始修为</span><span><b>${RULES.startLife}</b> 剩余寿元</span><span><b>${RULES.threshold}</b> 可引雷结丹</span></div><div class="entry-actions">${game ? button(game.phase === 'ended' ? '翻看上一世' : '继续修行', 'resume', { primary: true, detail: `${game.phase === 'ended' ? game.ending!.title : currentEvent(game).title} · 修为 ${game.cultivation} · 余寿 ${game.life}` }) : ''}${button(game || loaded.kind === 'invalid' ? '另起一世' : '启程修行', 'new', { primary: !game, detail: game ? '替换当前本地行笺，需确认' : '读线索，作选择，争一次结丹' })}</div><p class="fine">单人文字修行 · 自动记录在这台浏览器<br>寿元是行动资源，每次取舍的代价会先写明。</p></section>`;
}
function render(focus = false) {
  let content = home();
  if (playing && game) {
    const s = game, e = currentEvent(s);
    let body = '';
    if (s.phase === 'encounter') body = `<section class="view encounter"><div class="event-heading"><h1 tabindex="-1">${esc(e.title)}</h1></div><div class="story">${e.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div><ul class="clues" aria-label="已见线索">${e.clues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>${s.encounterState.investigated && e.investigation ? `<p class="investigation"><span class="small-label">已查明</span>${esc(e.investigation)}</p>` : ''}${s.hazards.length || s.pending ? status(s) : ''}${actions(s)}${s.hazards.length || s.pending ? '' : status(s)}${toolsBar(s)}</section>`;
    if (s.phase === 'feedback') {
      const h = s.history.at(-1)!;
      body = `<section class="view feedback"><span class="small-label">这一笔已记下</span><h1 tabindex="-1">${esc(s.feedback!.title)}</h1><p class="story">${esc(s.feedback!.text)}</p>${delta(h)}${h.symptom ? `<p class="symptom standalone">${esc(h.symptom)}</p>` : ''}${button(s.feedback!.advance ? '继续前行' : '回到眼前的机缘', 'continue', { primary: true, revision: s.revision })}<p class="fine">${s.feedback!.advance ? '读完结果再向前走。' : '当前遭遇保留，方才的调查或调息不会重抽机缘。'}</p></section>`;
    }
    if (s.phase === 'ended') body = `<section class="view ending"><span class="small-label">行笺终页</span><h1 tabindex="-1">${esc(s.ending!.title)}</h1>${s.ending!.reasons.map(r => `<p class="story">${esc(r)}</p>`).join('')}<div class="last-action"><span class="small-label">最后一次行动 · ${esc(s.history.at(-1)!.action)}</span>${delta(s.history.at(-1)!)}<p>${esc(s.history.at(-1)!.result)}</p></div>${button('再修一世', 'new', { primary: true })}<p class="ending-note">${s.ending!.title === '成功结丹' ? '山路还长。这回，能慢些走了。' : '若再来一世，有些话你会多听半句。'}</p></section>`;
    content = `${journey(s)}${metrics(s)}${body}${history(s, s.phase === 'ended')}`;
  }
  app.innerHTML = `<main>${header()}${warning ? `<div class="save-warning" role="status">${esc(warning)}</div>` : ''}${content}<footer><span>山中有机缘，行笺记因果。</span>${playing ? '<button class="plain" data-action="home">收起行笺</button>' : ''}</footer></main>`;
  if (focus) { app.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
function modal(title: string, body: string, confirm?: { label: string; run: () => void }) {
  const origin = document.activeElement as HTMLElement | null;
  dialog.innerHTML = `<h2 id="dialog-title">${esc(title)}</h2><div class="dialog-body">${body}</div><div class="dialog-actions"><button type="button" data-close>${confirm ? '暂且不动' : '记住了'}</button>${confirm ? `<button type="button" class="primary" data-confirm>${esc(confirm.label)}</button>` : ''}</div>`;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-confirm]')?.addEventListener('click', () => { dialog.close(); confirm!.run(); });
  dialog.onclose = () => { if (origin?.isConnected) origin.focus(); };
  dialog.showModal();
}
function newGame() {
  const start = () => {
    game = createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
    playing = true; warning = ''; persist(); render(true);
  };
  if (game || loaded.kind === 'invalid') modal('另起一世', '<p>新的行笺会替换这台浏览器中的当前一局。旧一世的选择与结局不会保留。</p>', { label: '确认启程', run: start });
  else start();
}
function act(action: Action, revision: number) {
  if (!game || busy || revision !== game.revision || actionBlock(game, action)) return;
  const run = () => {
    if (!game || revision !== game.revision) return;
    busy = true;
    game = transition(game, action, revision); persist(); render(true);
    window.setTimeout(() => { busy = false; }, 260);
  };
  if (action.type === 'tribulate') {
    const risks = knownTribulationRisks(game);
    modal('引雷之前', `<p>渡劫消耗 1 寿元。雷落后须余寿仍存、修为至少 100、心魔低于 60、身体无隐患。</p>${risks.length ? `<ul class="risk-list">${risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p>眼下强行引雷将失败。你仍可选择承担这个结果。</p>` : '<p>眼下各项条件齐备。没有额外的成败掷签，可以引雷。</p>'}`, { label: risks.length ? '仍要引雷' : '引雷结丹', run });
  } else if (lifeCost(game, action) >= game.life && lifeCost(game, action) > 0) {
    modal('这是最后一次行动', `<p>本次消耗 ${lifeCost(game, action)} 寿元，你只余 ${game.life}。做完将寿尽坐化，所得也无法带入下一次行动。</p>`, { label: '仍作此选择', run });
  } else run();
}
app.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || target.hasAttribute('disabled')) return;
  event.preventDefault();
  const id = target.dataset.action!;
  if (id === 'help') return modal('修行须知', `<p>你是一名寿元将尽的筑基散修。修为从 40 起，达到 100 后可准备渡劫。</p><p>余寿只有 ${RULES.startLife}。渡劫耗 1，渡劫后还须留 1 活命，开局真正可花的只有 ${RULES.startLife - 2}。调查、内观、静心各耗 1；化解一处隐患耗 ${RULES.remedyLife} 余寿、${RULES.remedyCultivation} 修为。</p><p>心魔到 100，当场失控。渡劫时心魔须低于 60，还须余寿仍存、身体无隐患。静心最多降低 20 心魔。</p><p>调查还要另花时间落实收益。有些调查能多拿一份，有些只让做事更安心。每次都查，可能来不及结丹；直接争机缘能省时间，也可能吃掉补救的余量。</p><p>看清线索再决定。身体异样一旦出现，就有真实来处；内观能查明，调息能补救。调查与调息保留当前机缘，刷新也不会重新掷签。</p><p>许下的看炉约定要了结，才能渡劫。退出条款在签约前可见。</p><p>关闭页面会保留当前一局。另起一世会替换旧记录。</p>`);
  if (id === 'home') { playing = false; render(true); return; }
  if (id === 'resume') { playing = true; render(true); return; }
  if (id === 'new') return newGame();
  const [kind, value] = id.split(':');
  const action: Action = kind === 'choose' ? { type: 'choose', id: value } : kind === 'remedy' ? { type: 'remedy', kind: value as HazardKind } : { type: kind as 'continue' | 'investigate' | 'diagnose' | 'meditate' | 'tribulate' | 'settle' };
  act(action, Number(target.dataset.revision));
});
render();
