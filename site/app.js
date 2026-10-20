/* AiNativeOps reference model — interactive map.
   The model is read from window.AINO_MODEL (built from model/*.yaml by tools/build.py).
   Layout of the stack and infrastructure views is computed here; edge routing uses an
   orthogonal A* router that avoids blocks and zone titles. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const MODEL = window.AINO_MODEL, PROJECT = window.AINO_PROJECT || {};
  const svg = document.getElementById('svg');
  const map = document.getElementById('map');
  const W = 160, H = 64, GW = 84;

  // =====================================================================
  // Interface strings
  // =====================================================================
  const STR = {
    ru: {
      views: { meta: 'Архитектура', infra: 'Инфраструктура', stack: 'Стек платформы' },
      viewsLabel: 'Вид карты', search: 'Найти класс или RM', searchLabel: 'Поиск по карте',
      scenario: 'Сценарий', noScenario: 'Не выбран', allMap: 'Без сценария · вся карта', steps: n => `${n} шагов`,
      collapse: 'Свернуть список шагов', expand: 'Развернуть список шагов', closeScenario: 'Закрыть сценарий', scenarioSteps: 'Шаги сценария',
      prev: 'Предыдущий шаг', next: 'Следующий шаг', play: '▶ По шагам', resume: '▶ Продолжить', pause: 'Ⅱ Пауза', again: '↻ Сначала',
      fitAll: 'Вписать всё', fitSel: 'Вписать сценарий или выбор', zoomIn: 'Приблизить', zoomOut: 'Отдалить', zoom: 'Масштаб',
      minimap: 'Мини-карта', helpBtn: 'О модели и управление', close: 'Закрыть панель',
      controls: 'Управление',
      help: [['Перетаскивание', 'сдвиг карты'], ['Колесо · тачпад', 'прокрутка карты'], ['Ctrl + колесо · щипок', 'масштаб под курсором'], ['Двойной щелчок', 'приблизить блок'], ['/', 'поиск', 1], ['+ −', 'масштаб', 1], ['⇧1 ⇧2 ⇧0', 'вписать всё, вписать выбор, 100%', 1], ['[ ]', 'шаги сценария', 1], ['M', 'мини-карта', 1], ['Esc', 'закрыть панель', 1]],
      about: 'О модели', cip: 'Community Interest Project', verLabel: 'Версия модели', verCurrent: 'текущая', verAlpha: 'альфа', verHint: 'Других выпусков пока нет. Они появятся здесь после выпуска 1.0.',  alphaTitle: 'Альфа-версия: состав классов и идентификаторы могут измениться до версии 1.0',
      alphaNote: 'Альфа-версия. До выпуска 1.0 состав классов, их названия и RM-идентификаторы могут измениться.',
      aboutText: 'AiNativeOps — открытая референсная модель эксплуатации, в которой ИИ-агенты создают, изменяют и проверяют целевую систему. Решение о выпуске принимает контур контроля: детерминированные проверки, ИИ-контролёр и ответственный человек на рубежах G0–G9.',
      version: 'Версия', license: 'Лицензия', repo: 'Репозиторий', propose: 'Предложить правку', proposeNew: 'Предложить класс или правку',
      serviceClass: 'Класс сервиса', classOf: n => `класс «${n}»`, outside: 'Внешний элемент · вне границы модели',
      optional: 'Подключается по потребности', optionalText: 'Необходимость определяют задачи и профиль системы.', optionalShort: 'по потребности',
      showOnMap: 'Показать на карте', stepOf: (t, i) => `${t} · шаг ${i}`, participants: a => `На этом шаге участвуют: ${a}.`, stepOnly: 'Шаг сценария.',
      inStep: s => `Участвует в шаге ${s}.`, relations: n => `Связи · ${n}`, scenariosWith: 'Сценарии с этим элементом',
      supporting: 'Обеспечивающий элемент. Его подключают по профилю задачи.', more: n => `Ещё ${n}. Уточните запрос.`, nothing: 'Ничего не найдено в этом виде',
      legendOptional: 'подключается по потребности', legendRm: 'RM-… устойчивый идентификатор класса', legendRel: 'Отношения:',
      legendNote: 'Скруглённый блок: сервис. Вложенность: композиция. Блок без RM лежит вне границы модели.',
      rel: { f: 'поток', s: 'обслуживание', t: 'инициирование', a: 'доступ' },
      relLegend: [['trig', 'ar-dk', 'инициирование'], ['flow', 'ar-dk', 'поток'], ['serve', 'ar-serve', 'обслуживание'], ['acc', 'ar-acc', 'доступ к артефакту']],
      type: { goal: 'Цель', assessment: 'Оценка', requirement: 'Требование', constraint: 'Ограничение', representation: 'Регламент', principle: 'Принцип или политика', role: 'Роль', dataobject: 'Документ методологии', gate: 'Контрольный рубеж', event: 'Событие', process: 'Процесс', llm: 'LLM', node: 'Узел', device: 'Устройство', actor: 'Бизнес-актор', appcomp: 'Компонент приложения', syssw: 'Системное ПО', techsvc: 'Технологический сервис', artifact: 'Артефакт' },
      aria: { meta: 'Метаконвейер AiNativeOps по уровням: бизнес, методология, Ops, технологии', infra: 'Инфраструктура AiNativeOps: зоны, классы сервисов и связи', stack: 'Стек платформы AiNativeOps: слои и классы сервисов' }
    },
    en: {
      views: { meta: 'Architecture', infra: 'Infrastructure', stack: 'Platform stack' },
      viewsLabel: 'Map view', search: 'Find a class or RM', searchLabel: 'Search the map',
      scenario: 'Scenario', noScenario: 'None', allMap: 'No scenario · full map', steps: n => `${n} steps`,
      collapse: 'Collapse step list', expand: 'Expand step list', closeScenario: 'Close scenario', scenarioSteps: 'Scenario steps',
      prev: 'Previous step', next: 'Next step', play: '▶ Step through', resume: '▶ Resume', pause: 'Ⅱ Pause', again: '↻ Restart',
      fitAll: 'Fit all', fitSel: 'Fit scenario or selection', zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoom: 'Zoom',
      minimap: 'Minimap', helpBtn: 'About and controls', close: 'Close panel',
      controls: 'Controls',
      help: [['Drag', 'pan the map'], ['Wheel · trackpad', 'scroll the map'], ['Ctrl + wheel · pinch', 'zoom at cursor'], ['Double click', 'zoom to block'], ['/', 'search', 1], ['+ −', 'zoom', 1], ['⇧1 ⇧2 ⇧0', 'fit all, fit selection, 100%', 1], ['[ ]', 'scenario steps', 1], ['M', 'minimap', 1], ['Esc', 'close panel', 1]],
      about: 'About the model', cip: 'Community Interest Project', verLabel: 'Model version', verCurrent: 'current', verAlpha: 'alpha', verHint: 'No other releases yet. They will appear here after release 1.0.',  alphaTitle: 'Alpha version: classes and identifiers may change before 1.0',
      alphaNote: 'Alpha version. Classes, their names and RM identifiers may change before release 1.0.',
      aboutText: 'AiNativeOps is an open reference model of operations in which AI agents create, change and verify the target system. A control loop takes the release decision: deterministic checks, an AI controller and an accountable human at gates G0–G9.',
      version: 'Version', license: 'License', repo: 'Repository', propose: 'Propose a change', proposeNew: 'Propose a class or change',
      serviceClass: 'Service class', classOf: n => `class “${n}”`, outside: 'External element · outside the model boundary',
      optional: 'Optional', optionalText: 'Tasks and the system profile decide whether it is needed.', optionalShort: 'optional',
      showOnMap: 'Show on map', stepOf: (t, i) => `${t} · step ${i}`, participants: a => `Participants in this step: ${a}.`, stepOnly: 'Scenario step.',
      inStep: s => `Takes part in step ${s}.`, relations: n => `Relations · ${n}`, scenariosWith: 'Scenarios with this element',
      supporting: 'Supporting element. It is added according to the task profile.', more: n => `${n} more. Refine the query.`, nothing: 'Nothing found in this view',
      legendOptional: 'optional', legendRm: 'RM-… stable class identifier', legendRel: 'Relations:',
      legendNote: 'Rounded block: service. Nesting: composition. A block without RM lies outside the model boundary.',
      rel: { f: 'flow', s: 'serving', t: 'triggering', a: 'access' },
      relLegend: [['trig', 'ar-dk', 'triggering'], ['flow', 'ar-dk', 'flow'], ['serve', 'ar-serve', 'serving'], ['acc', 'ar-acc', 'access to artifact']],
      type: { goal: 'Goal', assessment: 'Assessment', requirement: 'Requirement', constraint: 'Constraint', representation: 'Procedure', principle: 'Principle or policy', role: 'Role', dataobject: 'Methodology document', gate: 'Control gate', event: 'Event', process: 'Process', llm: 'LLM', node: 'Node', device: 'Device', actor: 'Business actor', appcomp: 'Application component', syssw: 'System software', techsvc: 'Technology service', artifact: 'Artifact' },
      aria: { meta: 'AiNativeOps meta-pipeline by level: business, methodology, Ops, technology', infra: 'AiNativeOps infrastructure: zones, service classes and relations', stack: 'AiNativeOps platform stack: layers and service classes' }
    }
  };
  const params = new URLSearchParams(location.search);
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } } };
  let lang = ['ru', 'en'].includes(params.get('lang')) ? params.get('lang') : (store.get('aino-lang') || ((navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en'));
  if (!STR[lang]) lang = 'en';
  const t = () => STR[lang];
  const L = o => (o && (o[lang] || o.ru || o.en)) || '';

  // =====================================================================
  // Model → views
  // =====================================================================
  function archView() {
    const A = MODEL.architecture, D = {}, layers = {};
    for (const l of A.layers) layers[l.id] = l;
    for (const id in A.elements) {
      const e = A.elements[id], c = e.class && MODEL.stack.classes[e.class];
      D[id] = { id, type: e.type, name: L(e.name), desc: L(e.desc) };
      if (c) { D[id].rm = e.class; D[id].clsName = L(c.name); }
    }
    const GROUPS = A.groups.map(g => ({ label: L(layers[g.layer].title), fill: layers[g.layer].fill, title: L(g.title), x: g.x, y: g.y, cols: g.cols, items: g.items, w: g.width || W }));
    return { id: 'meta', D, GROUPS, flowPairs: A.flows, bands: A.layers.map(l => ({ n: l.number, name: L(l.title), y: l.y, h: l.height, band: l.band, fill: l.fill })), worldW: A.canvas.width, worldH: A.canvas.height, labelLeft: true, aria: t().aria.meta, ROUTES: routesFor('architecture') };
  }

  function stackView() {
    const S = MODEL.stack, D = {}, MEM = {}, Z = {}, N = {}, ZONE_CAT = {}, CAT = {};
    for (const l of S.layers) { MEM[l.id] = []; ZONE_CAT[l.id] = l.category; }
    for (const rm in S.classes) { const c = S.classes[rm]; MEM[c.layer].push(rm); D[rm] = { id: rm, type: 'node', name: L(c.name), desc: L(c.desc), optional: !!c.optional, rm }; }
    for (const k in S.categories) CAT[k] = [S.categories[k].color, L(S.categories[k].label)];
    const of = p => S.layers.filter(l => l.placement === p);
    const EH = 64, GAP = 20, HDR = 46, BOT = 20, LW = 1080, LX = 20;
    const grid = (zone, x, y, cols) => {
      const ids = MEM[zone], rows = Math.ceil(ids.length / cols), ew = (LW - 40 - (cols - 1) * GAP) / cols;
      ids.forEach((id, i) => { const c = i % cols, r = Math.floor(i / cols); N[id] = { zone, x: x + 20 + c * (ew + GAP), y: y + HDR + r * (EH + GAP), w: ew, h: EH }; });
      return HDR + rows * EH + (rows - 1) * GAP + BOT;
    };
    const top = of('top')[0];
    let y = top ? 20 + 130 + 18 : 20;
    const left = of('left');
    for (const l of left) { const h = grid(l.id, LX, y, l.cols || 4); Z[l.id] = { t: L(l.title), x: LX, y, w: LW, h, big: true }; if (l.accent) Z[l.id].acc = l.accent; y += h + 16; }
    const leftBottom = y - 16;
    const CW = 230, CY = top ? 168 : 20; let cx = LX + LW + 20;
    const colH = {};
    for (const l of of('column')) {
      const ids = MEM[l.id]; ids.forEach((id, i) => { N[id] = { zone: l.id, x: cx + 16, y: CY + HDR + i * (EH + 18), w: CW - 32, h: EH }; });
      colH[l.id] = HDR + ids.length * EH + (ids.length - 1) * 18 + BOT; Z[l.id] = { t: L(l.title), x: cx, y: CY, w: CW, h: 0 }; cx += CW + 16;
    }
    const AX = cx + 6, AEW = 196, SUBW = 20 + 3 * AEW + 2 * 16 + 20, AW = SUBW + 30;
    let ay = CY + 44;
    const core = of('core');
    for (const l of core) {
      const ids = MEM[l.id], rows = Math.ceil(ids.length / 3);
      ids.forEach((id, i) => { const c = i % 3, r = Math.floor(i / 3); N[id] = { zone: l.id, x: AX + 15 + 20 + c * (AEW + 16), y: ay + HDR + r * (EH + 16), w: AEW, h: EH }; });
      const h = HDR + rows * EH + (rows - 1) * 16 + 18; Z[l.id] = { t: L(l.title), x: AX + 15, y: ay, w: SUBW, h }; ay += h + 14;
    }
    const bottom = Math.max(leftBottom, ay - 14 + 16, ...Object.values(colH).map(h => CY + h));
    Z['ai-safety-core'] = { t: L(S.safetyCore), x: AX, y: CY, w: AW, h: bottom - CY, big: true, acc: 'trust' };
    for (const l of of('column')) Z[l.id].h = bottom - CY;
    if (left.length) Z[left[left.length - 1].id].h += bottom - leftBottom;
    const WW = AX + AW + 20;
    if (top) {
      Z[top.id] = { t: L(top.title), x: 20, y: 20, w: WW - 40, h: 130, big: true, acc: 'gov' };
      const n = MEM[top.id].length, gw = (WW - 80 - (n - 1) * 24) / n;
      MEM[top.id].forEach((id, i) => { N[id] = { zone: top.id, x: 40 + i * (gw + 24), y: 20 + HDR, w: gw, h: EH }; });
    }
    const ORDER = [...(top ? [top.id] : []), ...left.map(l => l.id), ...of('column').map(l => l.id), 'ai-safety-core', ...core.map(l => l.id)];
    return { id: 'stack', dark: true, D, Z, N, ORDER, CAT, ZONE_CAT, CAT_OVR: {}, E: [], legendY: bottom + 30, worldW: WW, worldH: bottom + 70, grid: 8, margin: 5, aria: t().aria.stack, ROUTES: routesFor('stack') };
  }

  function infraView() {
    const I = MODEL.infrastructure, C = MODEL.stack.classes, D = {}, IZ = {}, IN = {}, CAT = {}, ZONE_CAT = {}, CAT_OVR = {}, ZD = {};
    for (const z of I.zones) { ZD[z.id] = z; ZONE_CAT[z.id] = z.category; }
    for (const k in I.categories) CAT[k] = [I.categories[k].color, L(I.categories[k].label)];
    for (const id in I.elements) {
      const e = I.elements[id], c = e.class && C[e.class];
      D[id] = { id, type: e.type, name: e.name ? L(e.name) : L(c.name), desc: e.desc ? L(e.desc) : L(c.desc) };
      if (c) { D[id].rm = e.class; D[id].clsName = L(c.name); }
      if (e.category) CAT_OVR[id] = e.category;
    }
    const IH = 58, IG = 30, rowsOf = z => (ZD[z] && ZD[z].rows) || [];
    const zt = z => ({ t: L(ZD[z].title), ...(ZD[z].accent ? { acc: ZD[z].accent === 'core' ? 'trust' : ZD[z].accent } : {}) });
    const put = (z, x, y, ew, extra, padRows) => {
      const rows = rowsOf(z).slice(); while (padRows && rows.length < padRows) rows.push([]);
      const cols = Math.max(1, ...rows.map(r => r.length));
      rows.forEach((row, r) => row.forEach((id, c) => { IN[id] = { zone: z, x: x + 20 + c * (ew + IG), y: y + 44 + r * (IH + IG), w: ew, h: IH }; }));
      IZ[z] = Object.assign({ x, y, w: 40 + cols * ew + (cols - 1) * IG, h: 44 + rows.length * IH + (rows.length - 1) * IG + 20 }, zt(z), extra || {});
      return IZ[z];
    };
    put('ext', 20, 140, 150, { big: true });
    put('dmz', 230, 140, 150, { big: true });
    const TX = 460, TY = 140, subs = ['data-protection', 'guardrails', 'operation-admission'];
    subs.forEach((z, i) => put(z, TX + 20 + i * 390, TY + 44, 150));
    IZ['ai-safety-core'] = Object.assign({ x: TX, y: TY, w: 20 + 3 * 370 + 40 + 20, h: 44 + Math.max(...subs.map(z => IZ[z].h)) + 20, big: true }, zt('ai-safety-core'));
    const IW = IZ['ai-safety-core'].w, MLY = TY + IZ['ai-safety-core'].h + 20, hew = (IW - 40 - 3 * IG) / 4;
    put('agents', TX, MLY, hew, { big: true }); IZ.agents.w = IW;
    const EY = MLY + IZ.agents.h + 20, ezw = (IW - 40) / 3, envRows = Math.max(...['exp', 'eval', 'prod'].map(z => rowsOf(z).length));
    ['exp', 'eval', 'prod'].forEach((z, i) => { put(z, TX + i * (ezw + 20), EY, 150, { big: true }, envRows); IZ[z].w = ezw; });
    const DY = EY + IZ.prod.h + 20;
    put('data-platform', TX, DY, hew, { big: true }); IZ['data-platform'].w = IW;
    const mlBottom = DY + IZ['data-platform'].h, RX = TX + IW + 40;
    put('ci-cd', RX, 140, 185, { big: true });
    put('observability', RX, 140 + IZ['ci-cd'].h + 20, 185, { big: true });
    put('trusted-services', RX, IZ.observability.y + IZ.observability.h + 20, 185, { big: true });
    const corpBottom = Math.max(mlBottom, IZ['trusted-services'].y + IZ['trusted-services'].h) + 20, corpRight = RX + IZ['ci-cd'].w + 20;
    IZ.corp = Object.assign({ x: 440, y: 16, w: corpRight - 440, h: corpBottom - 16, center: true, big: true }, zt('corp'));
    const [corpLeft = [], corpRightRow = []] = rowsOf('corp');
    let px = 480; corpLeft.forEach(id => { const w = 160; IN[id] = { zone: 'corp', x: px, y: 62, w, h: IH }; px += w + 20; });
    corpRightRow.forEach((id, i) => { IN[id] = { zone: 'corp', x: RX + 20 + i * 205, y: 62, w: 185, h: IH }; });
    const ORDER = I.zones.map(z => z.id).filter(z => IZ[z]);
    const REL = { flow: 'f', serving: 's', triggering: 't', access: 'a' };
    return { id: 'infra', dark: true, D, Z: IZ, N: IN, ORDER, CAT, ZONE_CAT, CAT_OVR, E: I.relations.map(([a, b, r]) => [a, b, '', REL[r] || 'f']), legendY: corpBottom + 24, worldW: corpRight + 20, worldH: corpBottom + 100, grid: 10, margin: 8, icons: true, relLegend: true, aria: t().aria.infra, ROUTES: routesFor('infrastructure') };
  }

  function routesFor(view) { const R = {}; for (const s of MODEL.scenarios.scenarios) if (s.routes[view]) R[s.id] = s.routes[view]; return R; }
  let SCEN = [], VIEWS = {};
  function buildViews() { SCEN = MODEL.scenarios.scenarios.map(s => ({ id: s.id, name: L(s.name) })); VIEWS = { meta: archView(), infra: infraView(), stack: stackView() }; }
  buildViews();

  let V, P, GROUP_OF, NODES, gFlow, gRoute, gNum, task = null;

  const el = (tag, a, parent) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); (parent || world()).appendChild(e); return e; };
  const world = () => document.getElementById('world');
  const txt = (p, x, y, s, a) => { const e = el('text', Object.assign({ x, y }, a || {}), p); e.textContent = s; return e; };
  const wrap = (s, n) => { const out = []; let line = ''; for (const w of s.split(' ')) { if (line && line.length + w.length + 1 > n) { out.push(line); line = w; } else line += (line ? ' ' : '') + w; } if (line) out.push(line); return out; };
  const cx = id => P[id].x + P[id].w / 2, cy = id => P[id].y + P[id].h / 2;
  const clip = (a, b) => { const pa = P[a], ax = cx(a), ay = cy(a), dx = cx(b) - ax, dy = cy(b) - ay; const tx = dx ? (pa.w / 2 + 5) / Math.abs(dx) : Infinity, ty = dy ? (pa.h / 2 + 5) / Math.abs(dy) : Infinity, k = Math.min(tx, ty, 1); return [ax + dx * k, ay + dy * k]; };
  const steps = () => task ? V.ROUTES[task.id] : null;
  const routeIds = () => steps().map(s => s[0]).concat(steps().flatMap(s => s[1]));
  const keyActivate = (g, id) => g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDlg(id); } });

  // ArchiMate-style icons in the top right corner of a block
  function icon(g, id) {
    const p = P[id], type = V.D[id].type, x = p.x + p.w - 22, y = p.y + 6;
    const pth = (d, extra) => el('path', Object.assign({ d, class: 'ico' }, extra || {}), g);
    switch (type) {
      case 'process': pth(`M${x} ${y + 5}h9v-3l6 5l-6 5v-3h-9z`); break;
      case 'event': pth(`M${x} ${y + 2}h10l4 5l-4 5h-10l4 -5z`); break;
      case 'goal': el('circle', { cx: x + 7, cy: y + 7, r: 6, class: 'ico' }, g); el('circle', { cx: x + 7, cy: y + 7, r: 3.2, class: 'ico' }, g); el('circle', { cx: x + 7, cy: y + 7, r: 1, fill: '#222' }, g); break;
      case 'assessment': el('circle', { cx: x + 8, cy: y + 5.5, r: 4.5, class: 'ico' }, g); pth(`M${x + 4.8} ${y + 8.7}l-4 4`, { 'stroke-width': 1.5 }); break;
      case 'requirement': pth(`M${x + 3} ${y + 2}h12l-3 9h-12z`); break;
      case 'constraint': pth(`M${x + 3} ${y + 2}h12l-3 9h-12z M${x + 6} ${y + 2}l-3 9`); break;
      case 'principle': el('rect', { x, y: y + 1, width: 13, height: 12, class: 'ico' }, g); pth(`M${x + 6.5} ${y + 3}v5`, { 'stroke-width': 1.6 }); el('circle', { cx: x + 6.5, cy: y + 10.2, r: .9, fill: '#222' }, g); break;
      case 'representation': pth(`M${x} ${y + 1}h15v9q-4 -3 -7.5 0t-7.5 0z`); break;
      case 'role': pth(`M${x + 3} ${y + 2}h9a3 4.5 0 0 1 0 9h-9a3 4.5 0 0 1 0 -9z`); el('ellipse', { cx: x + 12, cy: y + 6.5, rx: 3, ry: 4.5, class: 'ico' }, g); break;
      case 'dataobject': el('rect', { x, y: y + 1, width: 15, height: 11, class: 'ico' }, g); pth(`M${x} ${y + 4}h15`); break;
      case 'llm': el('circle', { cx: x + 8, cy: y + 7, r: 6, class: 'ico' }, g); pth(`M${x + 4} ${y + 3.5}a6 6 0 0 1 9 2`); break;
      case 'node': pth(`M${x} ${y + 4}h11v9h-11z M${x} ${y + 4}l3 -3h11l-3 3 M${x + 11} ${y + 13}l3 -3v-9`); break;
      case 'actor': el('circle', { cx: x + 7, cy: y + 3, r: 2.6, class: 'ico' }, g); pth(`M${x + 7} ${y + 5.6}v5 M${x + 2} ${y + 7.5}h10 M${x + 7} ${y + 10.6}l-4 4 M${x + 7} ${y + 10.6}l4 4`); break;
      case 'appcomp': pth(`M${x + 3} ${y + 1}h12v12h-12z`); el('rect', { x, y: y + 3, width: 6, height: 3, class: 'ico', style: 'fill:#fff' }, g); el('rect', { x, y: y + 8, width: 6, height: 3, class: 'ico', style: 'fill:#fff' }, g); break;
      case 'syssw': el('circle', { cx: x + 6.5, cy: y + 8, r: 5.5, class: 'ico' }, g); pth(`M${x + 6} ${y + 2.6}a5.5 5.5 0 0 1 8.4 6.6`); break;
      case 'techsvc': el('rect', { x, y: y + 3, width: 16, height: 8, rx: 4, class: 'ico' }, g); break;
      case 'artifact': pth(`M${x + 2} ${y}h8l4 4v10h-12z M${x + 10} ${y}v4h4`); break;
      case 'device': el('rect', { x, y: y + 1, width: 15, height: 9, class: 'ico' }, g); pth(`M${x - 1} ${y + 13}h17l-2 -3h-13z`); break;
    }
  }

  // ---------- architecture view ----------
  function renderCore(viewId) {
    V = VIEWS[viewId];
    P = {}; GROUP_OF = {}; NODES = {};
    world().innerHTML = '';
    svg.setAttribute('aria-label', V.aria);
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === viewId)));
    if (V.dark) { renderDark(); gRoute = el('g', {}); world().insertBefore(gRoute, world().querySelector('.el')); gNum = el('g', { class: 'num' }); showTask(task); return; }
    for (const g of V.GROUPS) {
      const rows = Math.ceil(g.items.length / g.cols);
      g.ww = 20 + g.cols * g.w + (g.cols - 1) * 20 + 20; g.hh = 38 + rows * H + (rows - 1) * 18 + 18;
      g.items.forEach((id, i) => { const c = i % g.cols, r = Math.floor(i / g.cols); P[id] = { x: g.x + 20 + c * (g.w + 20), y: g.y + 38 + r * (H + 18), w: g.w, h: H }; GROUP_OF[id] = g; });
    }
    const defs = el('defs', {});
    const mk = el('marker', { id: 'ar-route', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4.5, markerHeight: 4.5, orient: 'auto' }, defs); el('path', { d: 'M0 0L10 5L0 10z', fill: '#00A86B' }, mk);
    const mf = el('marker', { id: 'ar-flow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs); el('path', { d: 'M0 0L10 5L0 10z', fill: '#9AA5A3' }, mf);
    for (const b of V.bands) {
      const g = el('g', { class: 'band' });
      el('rect', { x: 0, y: b.y, width: V.worldW, height: b.h, fill: b.band }, g);
      el('rect', { x: 0, y: b.y, width: 8, height: b.h, fill: b.fill, stroke: '#5C5C5C', 'stroke-width': .6 }, g);
      txt(g, 28, b.y + 34, b.n, { class: 'ln' }); txt(g, 28, b.y + 62, b.name, { class: 'lt' });
    }
    for (const g of V.GROUPS) {
      const gg = el('g', { class: 'grp' });
      el('rect', { x: g.x, y: g.y, width: g.ww, height: g.hh }, gg);
      txt(gg, g.x + 10, g.y + 23, g.title);
    }
    gFlow = el('g', {});
    // flow: straight when on one row, otherwise an elbow that enters the target from the left
    for (const [a, b] of V.flowPairs) {
      const ya = P[a].y + H / 2, yb = P[b].y + H / 2, xa = P[a].x + P[a].w, xb = P[b].x;
      const d = Math.abs(ya - yb) < 1 ? `M${xa} ${ya}H${xb}` : `M${xa} ${ya}H${xb - 30}V${yb}H${xb}`;
      el('path', { d, class: 'flow', 'marker-end': 'url(#ar-flow)' }, gFlow);
    }
    const BEH = new Set(['process', 'event']);
    for (const id in P) {
      const p = P[id], d = V.D[id], g = el('g', { class: 'el', 'data-id': id, role: 'button', tabindex: 0, 'aria-label': nameOf(id) });
      keyActivate(g, id);
      if (d.type === 'gate') {
        el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, class: 'body', fill: GROUP_OF[id].fill }, g);
        txt(g, p.x + p.w / 2, p.y + 30, 'G' + id.slice(1), { 'text-anchor': 'middle', class: 'gn' });
        txt(g, p.x + p.w / 2, p.y + 50, d.name, { 'text-anchor': 'middle', 'font-size': 11 });
      } else {
        el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: BEH.has(d.type) ? 10 : 0, class: 'body', fill: GROUP_OF[id].fill }, g);
        icon(g, id);
        const lines = wrap(d.name, 18), y0 = p.y + p.h / 2 - (lines.length - 1) * 7.5 + 4 + (lines.length > 2 ? 3 : 0);
        lines.forEach((s, i) => txt(g, p.x + (p.w - 12) / 2, y0 + i * 15, s, { 'text-anchor': 'middle' }));
      }
      NODES[id] = g;
    }
    gRoute = el('g', {}); gNum = el('g', { class: 'num' });
    showTask(task);
  }

  // ---------- orthogonal edge routing that avoids blocks ----------
  // Grid with step V.grid; a block with margin V.margin is impassable. A* over (cell, direction)
  // penalises bends and overlap with edges already routed. Edges leave and enter perpendicular to a side.
  let RT = null;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  function makeRouter() {
    const G = V.grid || 10, M = V.margin || 8, cols = Math.ceil(V.worldW / G) + 1, rows = Math.ceil(V.worldH / G) + 1, blk = new Uint8Array(cols * rows);
    const block = (x0, y0, x1, y1) => { for (let gy = Math.max(0, y0); gy <= Math.min(rows - 1, y1); gy++) for (let gx = Math.max(0, x0); gx <= Math.min(cols - 1, x1); gx++) blk[gy * cols + gx] = 1; };
    for (const id in P) { const r = P[id]; block(Math.ceil((r.x - M) / G), Math.ceil((r.y - M) / G), Math.floor((r.x + r.w + M) / G), Math.floor((r.y + r.h + M) / G)); }
    for (const k of V.ORDER) { // zone titles are impassable too
      const z = V.Z[k], tw = z.t.length * (z.big ? 10 : 8.4), tx0 = z.center ? z.x + z.w / 2 - tw / 2 : z.x + 8;
      block(Math.ceil((tx0 - 4) / G), Math.ceil((z.y + 8) / G), Math.floor((tx0 + tw + 4) / G), Math.floor((z.y + 34) / G));
    }
    RT = { G, M, cols, rows, blk, use: new Uint8Array(cols * rows * 2), cache: {} };
  }
  function ports(id) {
    const r = P[id], { G, M, cols, rows, blk } = RT, out = [];
    const top = Math.ceil((r.y - M) / G) - 1, bot = Math.floor((r.y + r.h + M) / G) + 1, lft = Math.ceil((r.x - M) / G) - 1, rgt = Math.floor((r.x + r.w + M) / G) + 1;
    const xs = [[.5, 0], [.28, 1], [.72, 1]].map(([f, c]) => [Math.round((r.x + r.w * f) / G), c]).filter(([gx]) => gx * G > r.x + 5 && gx * G < r.x + r.w - 5);
    const ys = [[Math.round((r.y + r.h / 2) / G), 0]].filter(([gy]) => gy * G > r.y + 3 && gy * G < r.y + r.h - 3);
    xs.forEach(([gx, c]) => { out.push({ gx, gy: top, d: 3, bx: gx * G, by: r.y, c }); out.push({ gx, gy: bot, d: 1, bx: gx * G, by: r.y + r.h, c }); });
    ys.forEach(([gy, c]) => { out.push({ gx: lft, gy, d: 2, bx: r.x, by: gy * G, c }); out.push({ gx: rgt, gy, d: 0, bx: r.x + r.w, by: gy * G, c }); });
    return out.filter(p => p.gx >= 0 && p.gy >= 0 && p.gx < cols && p.gy < rows && !blk[p.gy * cols + p.gx]);
  }
  function astar(Sp, Tp) {
    const { cols, rows, blk, use } = RT, N = cols * rows, BEND = 6;
    const g = new Float32Array(N * 4).fill(Infinity), prev = new Int32Array(N * 4).fill(-1);
    const goal = new Map(); Tp.forEach(p => goal.set(p.gy * cols + p.gx, p));
    const hh = (x, y) => { let m = Infinity; for (const q of Tp) m = Math.min(m, Math.abs(x - q.gx) + Math.abs(y - q.gy)); return m; };
    const hk = [], hv = [];
    const push = (k, v) => { hk.push(k); hv.push(v); let i = hk.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= hv[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
    const pop = () => { const k = hk[0], v = hv[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } } return [k, v]; };
    for (const p of Sp) { const s = (p.gy * cols + p.gx) * 4 + p.d, c = p.c * 3; if (c < g[s]) { g[s] = c; prev[s] = -2; push(s, c + hh(p.gx, p.gy)); } }
    let best = Infinity, bestS = -1, bestT = null, n = 0;
    while (hk.length && n++ < 400000) {
      const [s, f] = pop(); if (f >= best) break;
      const gs = g[s]; if (f > gs + hh(((s >> 2) % cols), Math.floor((s >> 2) / cols)) + 1e-3) continue;
      const cell = s >> 2, d = s & 3, x = cell % cols, y = (cell - x) / cols;
      const tg = goal.get(cell);
      if (tg) { const inward = (tg.d + 2) % 4, tot = gs + (d === inward ? 0 : d === tg.d ? 2 * BEND : BEND) + tg.c * 3; if (tot < best) { best = tot; bestS = s; bestT = tg; } }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === (d + 2) % 4) continue;
        const nx = x + DX[nd], ny = y + DY[nd]; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nc = ny * cols + nx; if (blk[nc] && !goal.has(nc)) continue;
        const ns = nc * 4 + nd, c = gs + 1 + (nd !== d ? BEND : 0) + use[nc * 2 + (nd & 1)] * 4;
        if (c < g[ns]) { g[ns] = c; prev[ns] = s; push(ns, c + hh(nx, ny)); }
      }
    }
    if (bestS < 0) return null;
    const cells = []; for (let s = bestS; s >= 0; s = prev[s]) cells.push(s >> 2);
    cells.reverse();
    const s0 = cells[0], x0 = s0 % cols, y0 = (s0 - x0) / cols;
    return { cells, start: Sp.find(p => p.gx === x0 && p.gy === y0), end: bestT };
  }
  function elbowFallback(A, B) {
    const a = P[A], b = P[B], acy = a.y + a.h / 2, bcy = b.y + b.h / 2;
    if (b.x >= a.x + a.w + 8 || b.x + b.w <= a.x - 8) { const right = b.x >= a.x + a.w + 8, sx = right ? a.x + a.w : a.x, ex = right ? b.x : b.x + b.w, mx = Math.round((sx + ex) / 2); return { d: `M${sx} ${acy}H${mx}V${bcy}H${ex}` }; }
    const down = b.y > a.y, sx = a.x + a.w / 2, ex = b.x + b.w / 2, sy = down ? a.y + a.h : a.y, ey = down ? b.y : b.y + b.h, my = Math.round((sy + ey) / 2);
    return { d: `M${sx} ${sy}V${my}H${ex}V${ey}` };
  }
  function elbowD(A, B, mark) {
    if (!RT) makeRouter();
    const key = A + '>' + B; if (RT.cache[key] && !mark) return RT.cache[key];
    const r = astar(ports(A), ports(B)); if (!r) return elbowFallback(A, B);
    const { G, cols, use } = RT, pts = [[r.start.bx, r.start.by]];
    r.cells.forEach(c => { const x = c % cols; pts.push([x * G, (c - x) / cols * G]); });
    pts.push([r.end.bx, r.end.by]);
    if (mark) for (let i = 1; i < r.cells.length; i++) { const a = r.cells[i - 1], b = r.cells[i], o = Math.abs(a - b) === 1 ? 0 : 1; use[a * 2 + o] = Math.min(250, use[a * 2 + o] + 1); use[b * 2 + o] = Math.min(250, use[b * 2 + o] + 1); }
    const poly = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) { const [px, py] = poly[poly.length - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1]; if ((px === x && x === nx) || (py === y && y === ny)) continue; poly.push(pts[i]); }
    poly.push(pts[pts.length - 1]);
    const res = { d: 'M' + poly.map(p => p[0] + ' ' + p[1]).join('L'), poly };
    RT.cache[key] = res; return res;
  }

  // ---------- infrastructure and stack views ----------
  const catOf = id => V.CAT_OVR[id] || V.ZONE_CAT[V.N[id].zone] || 'node';
  function renderDark() {
    RT = null;
    const defs = el('defs', {});
    const m1 = el('marker', { id: 'ar-route', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4.5, markerHeight: 4.5, orient: 'auto' }, defs); el('path', { d: 'M0 0L10 5L0 10z', fill: '#00A86B' }, m1);
    const m2 = el('marker', { id: 'ar-dk', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs); el('path', { d: 'M0 0L10 5L0 10z', fill: '#3A3A3A' }, m2);
    const m3 = el('marker', { id: 'ar-serve', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs); el('path', { d: 'M1 1L9 5L1 9', fill: 'none', stroke: '#3A3A3A', 'stroke-width': 1.3 }, m3);
    const m4 = el('marker', { id: 'ar-acc', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs); el('path', { d: 'M1 1L9 5L1 9', fill: 'none', stroke: '#3A3A3A', 'stroke-width': 1.5 }, m4);
    for (const k of V.ORDER) {
      const z = V.Z[k], g = el('g', { class: 'dk-zone' + (z.acc ? ' acc ' + z.acc : '') });
      el('rect', { x: z.x, y: z.y, width: z.w, height: z.h, rx: 6 }, g);
      txt(g, z.center ? z.x + z.w / 2 : z.x + 14, z.y + 26, z.t, { 'text-anchor': z.center ? 'middle' : 'start', class: z.big ? 'zt big' : 'zt' });
    }
    for (const id in V.N) { const n = V.N[id]; P[id] = n; GROUP_OF[id] = { label: V.Z[n.zone].t, chip: V.CAT[catOf(id)][0] }; }
    makeRouter();
    gFlow = el('g', {});
    const REL = { f: ['flow', 'ar-dk'], s: ['serve', 'ar-serve'], t: ['trig', 'ar-dk'], a: ['acc', 'ar-acc'] };
    const len = ([a, b]) => Math.abs(cx(a) - cx(b)) + Math.abs(cy(a) - cy(b));
    for (const [a, b, , rel] of [...V.E].sort((x, y) => len(x) - len(y))) {
      const r = elbowD(a, b, true), g = el('g', { class: 'dk-link' }, gFlow), R = REL[rel] || REL.f;
      el('path', { d: r.d, class: 'dk-edge ' + R[0], 'marker-end': `url(#${R[1]})` }, g);
    }
    const stack = V.id === 'stack', S = t();
    for (const id in P) {
      const p = P[id], d = V.D[id], g = el('g', { class: 'el dk' + (d.optional ? ' optional' : ''), 'data-id': id, role: 'button', tabindex: 0, 'aria-label': (d.rm ? d.rm + ' · ' : '') + d.name });
      el('title', {}, g).textContent = (d.rm ? d.rm + ' · ' : '') + d.name + (d.optional ? ' · ' + S.optionalShort : '');
      keyActivate(g, id);
      el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: d.type === 'techsvc' ? 12 : 0, class: 'body', style: 'fill:' + V.CAT[catOf(id)][0] }, g);
      if (V.icons) icon(g, id);
      if (stack && d.optional) el('circle', { cx: p.x + p.w - 9, cy: p.y + 9, r: 3.5, fill: '#fff', stroke: '#55776C' }, g);
      if (stack) txt(g, p.x + 8, p.y + 14, d.rm, { class: 'rm' });
      const avail = p.w - (V.icons ? 40 : 20), lines = wrap(d.name, Math.floor(avail / (stack ? 8.1 : 7.3))), y0 = p.y + p.h / 2 - (lines.length - 1) * 7.5 + 4.5 + (stack ? 6 : 0);
      lines.forEach((s, i) => txt(g, p.x + (V.icons ? (p.w - 14) / 2 : p.w / 2), y0 + i * 15, s, { 'text-anchor': 'middle', class: 'dk-t' }));
      NODES[id] = g;
    }
    const lg = el('g', { class: 'dk-legend' }); let lx = 40;
    for (const k of Object.keys(V.CAT)) { el('rect', { x: lx, y: V.legendY, width: 22, height: 16, style: 'fill:' + V.CAT[k][0], stroke: '#5C5C5C' }, lg); txt(lg, lx + 30, V.legendY + 13, V.CAT[k][1], { class: 'zt' }); lx += 60 + V.CAT[k][1].length * 7.6; }
    if (stack) { lx += 20; el('circle', { cx: lx + 6, cy: V.legendY + 8, r: 4, fill: '#fff', stroke: '#55776C' }, lg); txt(lg, lx + 18, V.legendY + 13, S.legendOptional, { class: 'zt' }); lx += 40 + S.legendOptional.length * 7.6; txt(lg, lx, V.legendY + 13, S.legendRm, { class: 'zt' }); }
    if (V.relLegend) {
      const ry = V.legendY + 36; let rx = 40;
      txt(lg, rx, ry + 13, S.legendRel, { class: 'zt' }); rx += 100;
      S.relLegend.forEach(([c, m, n]) => { el('path', { d: `M${rx} ${ry + 8}h44`, class: 'dk-edge ' + c, 'marker-end': `url(#${m})` }, lg); txt(lg, rx + 54, ry + 13, n, { class: 'zt' }); rx += 80 + n.length * 7.6; });
      txt(lg, rx + 30, ry + 13, S.legendNote, { class: 'zt' });
    }
  }

  // =====================================================================
  // Controller
  // =====================================================================
  const $ = id => document.getElementById(id);
  const routeEl = $('route'), scenBtn = $('scenBtn'), scenMenu = $('scenMenu');
  const tasksFor = () => SCEN.filter(s => V.ROUTES[s.id]);
  const nameOf = a => V.D[a].type === 'gate' ? 'G' + a.slice(1) + ' · ' + V.D[a].name : V.D[a].name;

  // ---------- scenario ----------
  function showTask(sc) {
    stopDemo(); task = sc; gRoute.innerHTML = ''; gNum.innerHTML = '';
    $('scenName').textContent = sc ? sc.name : t().noScenario;
    syncUrl();
    if (!sc) { for (const id in NODES) NODES[id].classList.remove('dim', 'step', 'also'); [...gFlow.children].forEach(c => c.classList.remove('dim')); routeEl.hidden = true; syncMini(); animateFit(); return; }
    const S = steps(), ids = S.map(s => s[0]), also = new Set(S.flatMap(s => s[1]));
    for (const id in NODES) { const st = ids.includes(id); NODES[id].classList.toggle('step', st); NODES[id].classList.toggle('also', !st && also.has(id)); NODES[id].classList.toggle('dim', !st && !also.has(id)); }
    [...gFlow.children].forEach(c => c.classList.add('dim'));
    const seg = (a, b) => { if (V.dark) return elbowD(a, b).d; const [x1, y1] = clip(a, b), [x2, y2] = clip(b, a); return `M${x1} ${y1}L${x2} ${y2}`; };
    S.forEach(([id, al]) => al.forEach(a => el('path', { d: seg(id, a), class: 'lnk' }, gRoute)));
    ids.slice(1).forEach((b, i) => { const d = seg(ids[i], b); el('path', { d, class: 'rt-halo' }, gRoute); el('path', { d, class: 'rt', 'marker-end': 'url(#ar-route)' }, gRoute); });
    const nums = {}; ids.forEach((id, i) => (nums[id] = nums[id] || []).push(i + 1));
    for (const id in nums) { const p = P[id], s = nums[id].join(', '), w = Math.max(26, 12 + s.length * 7.5), g = el('g', {}, gNum); el('rect', { x: p.x - 12, y: p.y - 13, width: w, height: 26, rx: 13, style: 'fill:#0D3737;stroke:#fff', 'stroke-width': 2 }, g); txt(g, p.x - 12 + w / 2, p.y + 4, s, { 'text-anchor': 'middle', style: 'fill:#fff' }); }
    routeEl.hidden = false;
    $('rsub').textContent = `${t().views[V.id]} · ${t().steps(ids.length)}`;
    const ol = $('rlist'); ol.innerHTML = '';
    ids.forEach((id, i) => { const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span class="n">${i + 1}</span><span><span class="lay">${esc(GROUP_OF[id].label)}</span>${esc(nameOf(id))}</span>`; b.addEventListener('click', () => { stopDemo(); demoStep = i; markStep(i); select(id, true); }); li.appendChild(b); ol.appendChild(li); });
    syncMini();
    animateFit(routeIds());
  }
  function buildScenMenu() {
    scenMenu.innerHTML = '';
    const item = (sc, label) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitemradio'); const on = sc ? task && task.id === sc.id : !task; b.setAttribute('aria-checked', String(!!on)); b.innerHTML = `<span class="chk">${on ? '✓' : ''}</span>${esc(label)}`; b.addEventListener('click', () => { closeMenus(); closeDlg(); showTask(sc); }); scenMenu.appendChild(b); };
    item(null, t().allMap);
    scenMenu.appendChild(document.createElement('hr'));
    tasksFor().forEach(sc => item(sc, sc.name));
  }
  $('rclear').addEventListener('click', () => { closeDlg(); showTask(null); scenBtn.focus(); });
  $('rcollapse').addEventListener('click', e => { const c = routeEl.classList.toggle('collapsed'); e.currentTarget.setAttribute('aria-expanded', String(!c)); e.currentTarget.setAttribute('aria-label', c ? t().expand : t().collapse); });

  // ---------- step-through playback ----------
  let demoTimer = null, demoStep = -1;
  const playBtn = $('demo-play');
  function markStep(i) { document.querySelectorAll('.current').forEach(n => n.classList.remove('current')); const S = steps(); if (!S) return; NODES[S[i][0]].classList.add('current'); const row = document.querySelectorAll('#rlist li')[i]; if (row) { row.classList.add('current'); row.scrollIntoView({ block: 'nearest' }); } }
  function stopDemo() { if (demoTimer) clearInterval(demoTimer); demoTimer = null; playBtn.textContent = demoStep >= 0 ? t().resume : t().play; }
  function demoAt(i) { if (!task) return; const S = steps(); demoStep = (i + S.length) % S.length; markStep(demoStep); animateFit([S[demoStep][0], ...S[demoStep][1]]); }
  playBtn.addEventListener('click', () => {
    if (demoTimer) { stopDemo(); return; }
    if (!task) return; closeDlg();
    if (demoStep < 0 || demoStep >= steps().length - 1) demoAt(0); else demoAt(demoStep + 1);
    playBtn.textContent = t().pause;
    demoTimer = setInterval(() => { if (demoStep >= steps().length - 1) { clearInterval(demoTimer); demoTimer = null; demoStep = -1; playBtn.textContent = t().again; return; } demoAt(demoStep + 1); }, 3200);
  });
  const stepBy = d => { if (!task) return; stopDemo(); demoAt(demoStep < 0 ? (d > 0 ? 0 : steps().length - 1) : demoStep + d); playBtn.textContent = t().resume; };
  $('demo-prev').addEventListener('click', () => stepBy(-1));
  $('demo-next').addEventListener('click', () => stepBy(1));

  // ---------- inspector ----------
  const insp = $('insp');
  let selId = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // model file that holds the element, for the issue form
  function fileOf(id) {
    if (V.id === 'stack') return `model/stack/${MODEL.stack.classes[id].layer}.yaml`;
    if (V.id === 'infra') return 'model/infrastructure/elements.yaml';
    const g = MODEL.architecture.groups.find(x => x.items.includes(id)), l = g && MODEL.architecture.layers.find(x => x.id === g.layer);
    return l ? `model/architecture/${l.file}.yaml` : 'model/architecture/';
  }
  function proposeUrl(id) {
    if (!PROJECT.repository) return '';
    const u = new URL(PROJECT.repository.replace(/\/$/, '') + '/issues/new');
    u.searchParams.set('template', 'propose-change.yml');
    if (id) { const d = V.D[id]; u.searchParams.set('title', `[${d.rm || id}] ${d.name}`); u.searchParams.set('element', `${d.rm || id} · ${d.name}`); u.searchParams.set('view', t().views[V.id] + ' · ' + fileOf(id)); u.searchParams.set('current', d.desc); }
    return u.toString();
  }
  function openDlg(id) {
    if (selId && NODES[selId]) NODES[selId].classList.remove('sel');
    selId = id; NODES[id].classList.add('sel');
    const S = t(), d = V.D[id], G = GROUP_OF[id];
    let route = '';
    if (task) {
      const St = steps(), i = St.findIndex(s => s[0] === id);
      if (i >= 0) { const al = St[i][1].map(nameOf); route = `<div class="sec"><span class="k">${esc(S.stepOf(task.name, i + 1))}</span>${esc(al.length ? S.participants(al.join('; ')) : S.stepOnly)}</div>`; }
      else { const at = St.map((s, j) => s[1].includes(id) ? j + 1 : 0).filter(Boolean); if (at.length) route = `<div class="sec"><span class="k">${esc(task.name)}</span>${esc(S.inStep(at.join(', ')))}</div>`; }
    }
    const used = tasksFor().filter(sc => V.ROUTES[sc.id].some(s => s[0] === id || s[1].includes(id)));
    const rels = (V.E || []).filter(e => e[0] === id || e[1] === id);
    const relHtml = rels.length ? `<div class="sec"><span class="k">${esc(S.relations(rels.length))}</span><div class="rel">${rels.map(([a, b, , r]) => { const o = a === id ? b : a; return `<button type="button" data-go="${o}"><span class="dir">${a === id ? '→' : '←'}</span><span>${esc(V.D[o].name)} <span class="muted">· ${S.rel[r] || S.rel.f}</span></span></button>`; }).join('')}</div></div>` : '';
    const usedHtml = used.length ? `<div class="acts">${used.map(sc => `<button type="button" class="act" data-task="${sc.id}">${esc(sc.name)}</button>`).join('')}</div>` : esc(S.supporting);
    const rmLine = d.rm ? `<div class="rmid">${d.rm}${d.clsName && d.clsName !== d.name ? ' · ' + esc(S.classOf(d.clsName)) : ''}</div>` : (V.id === 'infra' ? `<div class="rmid">${esc(S.outside)}</div>` : '');
    const pu = proposeUrl(id);
    insp.innerHTML = `<div class="top"><span class="chip" style="background:${G.chip || G.fill}">${esc(G.label)} · ${esc(V.id === 'stack' ? S.serviceClass : S.type[d.type] || d.type)}</span><button class="ibtn sm" type="button" data-close aria-label="${esc(S.close)}">×</button></div>
      ${rmLine}<h3 id="dlg-title">${esc(nameOf(id))}</h3><p>${esc(d.desc)}</p>${d.optional ? `<div class="sec"><span class="k">${esc(S.optional)}</span>${esc(S.optionalText)}</div>` : ''}
      <div class="acts"><button type="button" class="act" data-focus>${esc(S.showOnMap)}</button>${pu ? `<a class="act" href="${esc(pu)}" target="_blank" rel="noopener">${esc(S.propose)} ↗</a>` : ''}</div>${route}${relHtml}
      <div class="sec"><span class="k">${esc(S.scenariosWith)}</span>${usedHtml}</div>`;
    insp.hidden = false;
    insp.querySelector('[data-close]').addEventListener('click', () => { closeDlg(); map.focus(); });
    insp.querySelector('[data-focus]').addEventListener('click', () => focusOn(id, 1.2));
    insp.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => select(b.dataset.go, true)));
    insp.querySelectorAll('.act[data-task]').forEach(b => b.addEventListener('click', () => { showTask(tasksFor().find(x => x.id === b.dataset.task)); openDlg(id); }));
    insp.scrollTop = 0;
  }
  function closeDlg() { if (selId && NODES[selId]) NODES[selId].classList.remove('sel'); selId = null; insp.hidden = true; }
  function select(id, pan) { openDlg(id); if (pan && !inView(id)) focusOn(id); }

  // ---------- viewport: pan and zoom ----------
  let vx = 0, vy = 0, k = 1, anim = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const apply = () => { world().setAttribute('transform', `translate(${vx} ${vy}) scale(${k})`); $('scale').textContent = Math.round(k * 100) + '%'; syncViewport(); };
  const clampK = v => Math.max(.1, Math.min(3, v));
  const insets = () => { const r = map.getBoundingClientRect(), wide = r.width >= 900; return { l: wide && !routeEl.hidden ? 382 : 0, r: wide && !insp.hidden ? 392 : 0, t: wide ? 0 : 64, b: wide ? 0 : (insp.hidden ? 0 : r.height * .55) }; };
  function animateTo(nk, nx, ny) {
    cancelAnimationFrame(anim);
    if (reduce) { k = nk; vx = nx; vy = ny; apply(); return; }
    const k0 = k, x0 = vx, y0 = vy, t0 = performance.now(), D = 260;
    const step = now => { const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3); k = k0 + (nk - k0) * e; vx = x0 + (nx - x0) * e; vy = y0 + (ny - y0) * e; apply(); if (p < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  function fitBox(ids) {
    if (!ids || !ids.length) return [0, 0, V.worldW, V.worldH];
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ids.forEach(id => { const p = P[id]; x1 = Math.min(x1, p.x - 14); y1 = Math.min(y1, p.y - 16); x2 = Math.max(x2, p.x + p.w); y2 = Math.max(y2, p.y + p.h); });
    if (V.labelLeft) x1 = 0;
    return [x1, y1, x2, y2];
  }
  function fitTarget(ids) {
    const r = map.getBoundingClientRect(), pad = 40, I = insets(), [x1, y1, x2, y2] = fitBox(ids);
    const aw = r.width - I.l - I.r - pad * 2, ah = r.height - I.t - I.b - pad * 2;
    const nk = clampK(Math.min(aw / (x2 - x1), ah / (y2 - y1), 1.1));
    return [nk, I.l + pad + (aw - (x2 - x1) * nk) / 2 - x1 * nk, I.t + pad + (ah - (y2 - y1) * nk) / 2 - y1 * nk];
  }
  function fit(ids) { const [a, b, c] = fitTarget(ids); cancelAnimationFrame(anim); k = a; vx = b; vy = c; apply(); }
  function animateFit(ids) { animateTo(...fitTarget(ids)); }
  function focusOn(id, z) { const r = map.getBoundingClientRect(), I = insets(), nk = clampK(Math.max(k, z || .9)); animateTo(nk, I.l + (r.width - I.l - I.r) / 2 - cx(id) * nk, I.t + (r.height - I.t - I.b) / 2 - cy(id) * nk); }
  function inView(id) { const r = map.getBoundingClientRect(), I = insets(), p = P[id], x = p.x * k + vx, y = p.y * k + vy; return x > I.l + 10 && y > I.t + 10 && x + p.w * k < r.width - I.r - 10 && y + p.h * k < r.height - I.b - 10; }
  function zoomAt(f, px, py) { cancelAnimationFrame(anim); const nk = clampK(k * f); vx = px - (px - vx) * nk / k; vy = py - (py - vy) * nk / k; k = nk; apply(); }
  const center = () => { const r = map.getBoundingClientRect(), I = insets(); return [I.l + (r.width - I.l - I.r) / 2, I.t + (r.height - I.t - I.b) / 2]; };
  function zoomTo(nk) { const [px, py] = center(); nk = clampK(nk); animateTo(nk, px - (px - vx) * nk / k, py - (py - vy) * nk / k); }
  const fitSel = () => animateFit(task ? routeIds() : selId ? [selId] : null);

  // pointer: drag, click, double click, pinch
  const ptrs = new Map(); let moved = 0, startDist = 0, startK = 1, downTarget = null, lastTap = { t: 0, id: null };
  map.addEventListener('pointerdown', e => {
    if (e.target.closest('.dock, .insp')) return;
    closeMenus();
    map.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; downTarget = e.target.closest('.el');
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1; startK = k; }
    cancelAnimationFrame(anim); map.classList.add('drag');
  });
  map.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId), dx = e.clientX - prev.x, dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { vx += dx; vy += dy; moved += Math.abs(dx) + Math.abs(dy); apply(); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), r = map.getBoundingClientRect(); moved = 99; zoomAt(clampK(startK * dist / startDist) / k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (ptrs.size) return;
    map.classList.remove('drag');
    if (moved < 5) {
      const id = downTarget && downTarget.dataset.id, now = performance.now();
      if (id) { if (lastTap.id === id && now - lastTap.t < 350) { focusOn(id, 1.3); lastTap = { t: 0, id: null }; } else { lastTap = { t: now, id }; openDlg(id); } }
      else closeDlg();
    }
    downTarget = null;
  };
  map.addEventListener('pointerup', up); map.addEventListener('pointercancel', up);
  map.addEventListener('wheel', e => {
    if (e.target.closest('.insp, .route, .menu, .help')) return;
    e.preventDefault(); cancelAnimationFrame(anim);
    const r = map.getBoundingClientRect(), unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
    if (e.ctrlKey || e.metaKey) { zoomAt(Math.exp(-e.deltaY * unit * .01), e.clientX - r.left, e.clientY - r.top); return; }
    let dx = e.deltaX * unit, dy = e.deltaY * unit; if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    vx -= dx; vy -= dy; apply();
  }, { passive: false });

  // ---------- zoom controls and menus ----------
  const zmenu = $('zmenu'), help = $('help');
  function closeMenus(except) {
    if (except !== 'z') { zmenu.hidden = true; $('scale').setAttribute('aria-expanded', 'false'); }
    if (except !== 's') { scenMenu.hidden = true; scenBtn.setAttribute('aria-expanded', 'false'); }
    if (except !== 'h') { help.hidden = true; $('helpBtn').setAttribute('aria-expanded', 'false'); }
    if (except !== 'q') { qres.hidden = true; q.setAttribute('aria-expanded', 'false'); }
    if (except !== 'v') { verMenu.hidden = true; verBtn.setAttribute('aria-expanded', 'false'); }
  }
  const toggleMenu = (m, btn, key) => { const open = m.hidden; closeMenus(key); m.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) { const f = m.querySelector('button:not([disabled])'); if (f && key !== 'h') f.focus(); } };
  $('zin').addEventListener('click', () => zoomTo(k * 1.25));
  $('zout').addEventListener('click', () => zoomTo(k * .8));
  $('zfit').addEventListener('click', () => animateFit());
  $('scale').addEventListener('click', e => { zmenu.querySelector('[data-z="sel"]').disabled = !task && !selId; toggleMenu(zmenu, e.currentTarget, 'z'); });
  zmenu.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const z = b.dataset.z; closeMenus(); if (z === 'fit') animateFit(); else if (z === 'sel') fitSel(); else zoomTo(+z); });
  scenBtn.addEventListener('click', () => { buildScenMenu(); toggleMenu(scenMenu, scenBtn, 's'); });
  $('helpBtn').addEventListener('click', e => { if (help.hidden) closeDlg(); toggleMenu(help, e.currentTarget, 'h'); });
  [zmenu, scenMenu].forEach(m => m.addEventListener('keydown', e => {
    const items = [...m.querySelectorAll('button:not([disabled])')], i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  }));
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.menu, .help, #scale, #scenBtn, #helpBtn, #verBtn, .search')) closeMenus(); });

  // ---------- minimap ----------
  const mini = $('mini'), msvg = $('minisvg');
  let vpRect = null;
  const mel = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const x in a) e.setAttribute(x, a[x]); p.appendChild(e); return e; };
  function drawMini() {
    msvg.innerHTML = ''; msvg.setAttribute('viewBox', `0 0 ${V.worldW} ${V.worldH}`);
    if (V.dark) for (const z of V.ORDER) { const Z = V.Z[z]; mel('rect', { x: Z.x, y: Z.y, width: Z.w, height: Z.h, rx: 10, class: 'mz' }, msvg); }
    else for (const g of V.GROUPS) mel('rect', { x: g.x, y: g.y, width: g.ww, height: g.hh, class: 'mz' }, msvg);
    for (const id in P) { const p = P[id]; mel('rect', { x: p.x, y: p.y, width: p.w, height: p.h, class: 'me', 'data-id': id }, msvg); }
    vpRect = mel('rect', { class: 'vp', rx: 8 }, msvg);
    syncMini(); syncViewport();
  }
  function syncMini() { if (!msvg.firstChild) return; const on = task ? new Set(routeIds()) : null; msvg.querySelectorAll('.me').forEach(r => r.classList.toggle('on', !!on && on.has(r.dataset.id))); }
  function syncViewport() { if (!vpRect) return; const r = map.getBoundingClientRect(); vpRect.setAttribute('x', -vx / k); vpRect.setAttribute('y', -vy / k); vpRect.setAttribute('width', r.width / k); vpRect.setAttribute('height', r.height / k); }
  let miniDrag = false;
  const miniMove = e => { const b = msvg.getBoundingClientRect(), wx = (e.clientX - b.left) / b.width * V.worldW, wy = (e.clientY - b.top) / b.height * V.worldH, r = map.getBoundingClientRect(); cancelAnimationFrame(anim); vx = r.width / 2 - wx * k; vy = r.height / 2 - wy * k; apply(); };
  mini.addEventListener('pointerdown', e => { miniDrag = true; mini.setPointerCapture(e.pointerId); miniMove(e); e.stopPropagation(); });
  mini.addEventListener('pointermove', e => { if (miniDrag) miniMove(e); });
  mini.addEventListener('pointerup', () => { miniDrag = false; });
  const toggleMini = () => { mini.hidden = !mini.hidden; $('mmBtn').setAttribute('aria-pressed', String(!mini.hidden)); };
  $('mmBtn').addEventListener('click', toggleMini);

  // ---------- search ----------
  const q = $('q'), qres = $('qres');
  let hits = [], hitI = -1;
  const hl = (s, needle) => { const i = s.toLowerCase().indexOf(needle); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + needle.length)) + '</mark>' + esc(s.slice(i + needle.length)); };
  function runSearch() {
    const needle = q.value.trim().toLowerCase();
    for (const id in NODES) NODES[id].classList.remove('qhit', 'qdim');
    if (!needle) { qres.hidden = true; q.setAttribute('aria-expanded', 'false'); hits = []; return; }
    hits = Object.keys(P).map(id => { const d = V.D[id], n = d.name.toLowerCase(), rm = (d.rm || '').toLowerCase(), s = n.startsWith(needle) ? 0 : n.includes(needle) ? 1 : rm.includes(needle) ? 2 : d.desc.toLowerCase().includes(needle) ? 3 : -1; return [id, s]; }).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    for (const id in NODES) NODES[id].classList.add(hits.includes(id) ? 'qhit' : 'qdim');
    hitI = hits.length ? 0 : -1;
    qres.innerHTML = hits.length ? hits.slice(0, 10).map((id, i) => { const d = V.D[id]; return `<li role="option" data-id="${id}" aria-selected="${i === hitI}"><span class="nm">${hl(nameOf(id), needle)}</span><span class="rmc">${d.rm ? hl(d.rm, needle) : ''}</span><span class="mt">${esc(GROUP_OF[id].label)}</span></li>`; }).join('') + (hits.length > 10 ? `<li class="empty">${esc(t().more(hits.length - 10))}</li>` : '') : `<li class="empty">${esc(t().nothing)}</li>`;
    closeMenus('q'); qres.hidden = false; q.setAttribute('aria-expanded', 'true');
  }
  function pickHit(id) { q.value = ''; runSearch(); q.blur(); select(id, false); focusOn(id, 1.1); }
  q.addEventListener('input', runSearch);
  q.addEventListener('focus', () => { if (q.value) runSearch(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!hits.length) return; const n = Math.min(hits.length, 10); hitI = (hitI + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; qres.querySelectorAll('li[data-id]').forEach((li, i) => li.setAttribute('aria-selected', String(i === hitI))); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hitI >= 0) pickHit(hits[hitI]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); q.value = ''; runSearch(); q.blur(); map.focus(); }
  });
  qres.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-id]'); if (li) { e.preventDefault(); pickHit(li.dataset.id); } });

  // ---------- keyboard ----------
  map.tabIndex = 0;
  document.addEventListener('keydown', e => {
    const typing = e.target.closest('input, textarea, select');
    if (e.key === 'Escape') { if (!zmenu.hidden || !scenMenu.hidden || !help.hidden || !qres.hidden || !verMenu.hidden) { closeMenus(); return; } if (!insp.hidden) { closeDlg(); map.focus(); } return; }
    if (typing || e.altKey || e.ctrlKey || e.metaKey) return;
    const onBtn = e.target.closest('button, a, [role=button]');
    if (e.key === '/') { e.preventDefault(); q.focus(); q.select(); return; }
    if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); animateFit(); return; }
    if (e.shiftKey && e.code === 'Digit2') { e.preventDefault(); fitSel(); return; }
    if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); zoomTo(1); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(k * 1.25); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(k * .8); return; }
    if (e.key === ']') { stepBy(1); return; }
    if (e.key === '[') { stepBy(-1); return; }
    if (e.code === 'KeyM') { toggleMini(); return; }
    if (e.key === '?') { $('helpBtn').click(); return; }
    if (onBtn && !e.target.closest('.el')) return;
    const s = 80; let hit = true;
    if (e.key === 'ArrowLeft') vx += s; else if (e.key === 'ArrowRight') vx -= s; else if (e.key === 'ArrowUp') vy += s; else if (e.key === 'ArrowDown') vy -= s; else hit = false;
    if (hit) { e.preventDefault(); cancelAnimationFrame(anim); apply(); }
  });

  // ---------- version switcher ----------
  const verBtn = $('verBtn'), verMenu = $('verMenu');
  const VERSIONS = (PROJECT.versions && PROJECT.versions.length) ? PROJECT.versions : [{ label: PROJECT.version || '', url: '' }];
  function buildVerMenu() {
    const S = t(), cur = VERSIONS[0];
    $('verName').textContent = cur.label; verBtn.setAttribute('aria-label', `${S.verLabel}: ${cur.label}`); verBtn.title = S.verLabel;
    verMenu.innerHTML = VERSIONS.map((v, i) => {
      const tag = i === 0 ? `<span class="vtag">${esc(S.verCurrent)}</span>` : '';
      return i === 0 || !v.url
        ? `<button type="button" role="menuitemradio" aria-checked="${i === 0}" ${i === 0 ? '' : 'disabled'}><span class="chk">${i === 0 ? '✓' : ''}</span>${esc(v.label)}${tag}</button>`
        : `<a role="menuitemradio" aria-checked="false" href="${esc(v.url)}"><span class="chk"></span>${esc(v.label)}</a>`;
    }).join('') + (VERSIONS.length < 2 ? `<hr><span class="hint">${esc(S.verHint)}</span>` : '');
  }
  verBtn.addEventListener('click', () => toggleMenu(verMenu, verBtn, 'v'));
  verMenu.addEventListener('click', e => { if (e.target.closest('button')) closeMenus(); });

  // ---------- static strings, language, URL state ----------
  function applyStrings() {
    const S = t();
    document.documentElement.lang = lang;
    buildVerMenu();
    document.querySelectorAll('[data-view]').forEach(b => { b.textContent = S.views[b.dataset.view]; });
    $('viewsGroup').setAttribute('aria-label', S.viewsLabel);
    q.placeholder = S.search; q.setAttribute('aria-label', S.searchLabel);
    $('scenKey').textContent = S.scenario;
    routeEl.setAttribute('aria-label', S.scenarioSteps);
    $('rcollapse').setAttribute('aria-label', routeEl.classList.contains('collapsed') ? S.expand : S.collapse);
    $('rclear').setAttribute('aria-label', S.closeScenario);
    $('demo-prev').setAttribute('aria-label', S.prev); $('demo-prev').title = S.prev + ' · [';
    $('demo-next').setAttribute('aria-label', S.next); $('demo-next').title = S.next + ' · ]';
    $('zout').setAttribute('aria-label', S.zoomOut); $('zout').title = S.zoomOut + ' · −';
    $('zin').setAttribute('aria-label', S.zoomIn); $('zin').title = S.zoomIn + ' · +';
    $('zfit').setAttribute('aria-label', S.fitAll); $('zfit').title = S.fitAll + ' · ⇧1';
    $('scale').title = S.zoom;
    $('mmBtn').setAttribute('aria-label', S.minimap); $('mmBtn').title = S.minimap + ' · M'; mini.title = S.minimap + ' · M';
    $('helpBtn').setAttribute('aria-label', S.helpBtn); $('helpBtn').title = S.helpBtn + ' · ?';
    zmenu.querySelector('[data-z="fit"]').firstChild.textContent = S.fitAll;
    zmenu.querySelector('[data-z="sel"]').firstChild.textContent = S.fitSel;
    help.setAttribute('aria-label', S.helpBtn);
    const meta = [PROJECT.version ? `<dt>${esc(S.version)}</dt><dd>${esc(VERSIONS[0].label)}</dd>` : '', PROJECT.license ? `<dt>${esc(S.license)}</dt><dd>${esc(PROJECT.license)}</dd>` : '', PROJECT.repository ? `<dt>${esc(S.repo)}</dt><dd><a href="${esc(PROJECT.repository)}" target="_blank" rel="noopener">${esc(PROJECT.repository.replace(/^https?:\/\//, ''))}</a></dd>` : ''].join('');
    const pu = proposeUrl();
    $('helpBody').innerHTML = `<h4>${esc(S.about)}</h4><p class="cip">${esc(S.cip)}</p><p>${esc(S.aboutText)}</p>${PROJECT.status === 'alpha' ? `<p class="alpha">${esc(S.alphaNote)}</p>` : ''}${meta ? `<dl class="meta">${meta}</dl>` : ''}${pu ? `<a class="act" href="${esc(pu)}" target="_blank" rel="noopener">${esc(S.proposeNew)} ↗</a>` : ''}
      <h4>${esc(S.controls)}</h4><dl>${S.help.map(([a, b, kb]) => `<dt>${kb ? a.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ') : esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`;
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  function syncUrl() {
    try {
      const u = new URL(location.href);
      u.searchParams.set('view', V ? V.id : 'infra'); u.searchParams.set('lang', lang);
      if (task) u.searchParams.set('scenario', task.id); else u.searchParams.delete('scenario');
      history.replaceState(null, '', u);
    } catch (e) { /* file:// or sandboxed frame */ }
  }
  function setLang(l) {
    if (l === lang) return;
    lang = l; store.set('aino-lang', l);
    const keepTask = task && task.id, view = V.id;
    buildViews(); applyStrings();
    task = keepTask ? SCEN.find(s => s.id === keepTask) : null;
    render(view);
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  // ---------- view switching ----------
  function render(viewId) {
    stopDemo(); demoStep = -1; closeDlg(); closeMenus(); q.value = '';
    if (task && !VIEWS[viewId].ROUTES[task.id]) task = null;
    renderCore(viewId);
    map.classList.toggle('stack', viewId === 'stack'); map.classList.toggle('infra', viewId === 'infra');
    drawMini(); buildScenMenu(); syncUrl();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => render(b.dataset.view)));
  applyStrings();
  const startView = ['meta', 'infra', 'stack'].includes(params.get('view')) ? params.get('view') : 'infra';
  task = SCEN.find(s => s.id === params.get('scenario')) || null;
  render(startView);
  let lastW = map.clientWidth, rzT = 0;
  window.addEventListener('resize', () => { syncViewport(); clearTimeout(rzT); rzT = setTimeout(() => { if (Math.abs(map.clientWidth - lastW) < 60) return; lastW = map.clientWidth; fit(task ? routeIds() : null); }, 150); });
})();
