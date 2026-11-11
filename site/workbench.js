/* Component evidence and contextual process cards. */
(() => {
  'use strict';
  const model=window.AINO_MODEL;
  const {sources,bindings}=model.workbench;
  const classes=model.stack.classes;
  const map=window.AINO_MAP, processes=window.AINO_PROCESSES;
  const dialog=document.getElementById('work-inspector');
  let workflowId=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=(ru,en)=>map.language()==='ru'?ru:en;
  const loc=o=>o?.[map.language()] || o?.ru || o?.en || '';
  const pair=a=>t(...a);
  const arrow='<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 16 17 7m-7 0h7v7"/></svg>';
  // model/sources/registry.yaml: type is standard, practice or example; title is a string or {ru, en}
  const TYPE={standard:['Стандарт','Standard'],
    practice:['Практика','Practice'],example:['Пример реализации','Implementation example']};
  const RANK={standard:0,practice:1,example:2};
  const text=v=>Array.isArray(v)?pair(v):v&&typeof v==='object'?loc(v):v||'';
  function sourceItem(key,note) {
    const s=sources[key];
    return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(text(s.title))} <span aria-hidden="true">↗</span></a>
      <span class="i-src-meta" data-type="${esc(s.type)}">${esc(pair(TYPE[s.type]))}${s.section?' · '+esc(s.section):''}</span>
      <p>${esc(note ?? text(s.scope))}</p></li>`;
  }
  const unchecked=keys=>keys.some(k=>!sources[k].checked)
    ? `<p class="wb-unchecked">${t('Ссылки и разделы ещё не проверены мейнтейнерами.','Links and sections are not yet verified by maintainers.')}</p>` : '';
  function sourceSection(view,id,rm) {
    const deps=(model.workbench.dependencies[view] || []).filter(d=>d.from===id || d.to===id);
    const keys=[...new Set([...(bindings[view]?.[id] || bindings.stack[rm] || []),...deps.flatMap(d=>d.sources)])]
      .sort((a,b)=>RANK[sources[a].type]-RANK[sources[b].type]);
    if (!keys.length) return '';
    return `<section class="i-sec wb-sources" data-source-section><h4>${t('Источники','Sources')} <span class="i-n">${keys.length}</span></h4>
      <ol class="i-src">${keys.slice(0,4).map(key=>sourceItem(key)).join('')}</ol>
      ${keys.length>4?`<details class="i-more"><summary>${t('Ещё ','More: ')}${keys.length-4}</summary><ol class="i-src" start="5">${keys.slice(4).map(key=>sourceItem(key)).join('')}</ol></details>`:''}${unchecked(keys)}</section>`;
  }
  function cardContext(view,id,rm) {
    const local=!rm?`<p class="wb-project-note">${t('Описание элемента относится к модели AiNativeOps.','The element definition belongs to AiNativeOps.')}</p>`:'';
    return local+sourceSection(view,id,rm);
  }
  function show(title,kicker,body) {
    workflowId=null;
    dialog.classList.remove('workflow-dialog');
    dialog.innerHTML=`<div class="wb-dialog-head"><span class="wb-eyebrow">${esc(kicker)}</span>
      <button type="button" class="wb-close" aria-label="${t('Закрыть карточку','Close card')}" data-close-details>×</button></div>
      <h2 id="work-title">${esc(title)}</h2>${body}`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
    dialog.querySelector('[data-close-details]').focus();
  }
  function field(title,value,lang='') {
    return value?`<section class="wb-detail"><h4>${title}</h4><p${lang?' lang="'+lang+'"':''}>${esc(value)}</p></section>`:'';
  }
  function openFlow(id,parentId) {
    const flow=parentId ? processes.partOf(parentId,id) : processes.get(id); if (!flow) return;
    const graph=flow.workflow;
    // the diagram comes first; the definition of the process follows it
    const facts=field(t('Владелец','Owner'),flow.owner?pair(flow.owner):'')+
      field(t('Характер процесса','Process scope'),flow.maturity?pair(flow.maturity):'')+
      field(t('Запуск','Trigger'),text(flow.start))+
      field(t('Результат','Result'),text(flow.result))+
      field(t('Критерий проверки','Acceptance criterion'),text(flow.check))+
      field(t('Общий защитный контур','Shared protection boundary'),flow.protection?pair(flow.protection):'')+
      ((flow.calls||[]).length?`<section class="wb-detail"><h4>${t('Вызывает процессы','Calls processes')}</h4><ul class="wf-calls">${flow.calls.map(c=>`<li><button type="button" class="wb-tag" data-map-flow="${c.id}">${esc(loc(processes.get(c.id).name))}</button><p>${esc(pair(c.when))}</p></li>`).join('')}</ul></section>`:'');
    show(loc(flow.name),(parentId?t('Подпроцесс','Subprocess'):t('Основной процесс','Main process'))+' · '+id,
      graph ? `<p class="wf-summary">${esc(pair(graph.summary))}</p>
        <div class="wf-layout"><div id="workflow-canvas" class="wf-scroll">${workflowDiagram(graph)}</div>
        <aside id="workflow-step-detail" class="wf-detail" aria-live="polite"></aside></div>
        <h3 class="wf-about">${t('О процессе','About the process')}</h3>
        ${facts}
        <section class="wb-sources"><h4>${t('Основание: опубликованная практика','Basis: published practice')}</h4><ol class="i-src">${graph.basis.map(ref=>sourceItem(ref.source,pair(ref.claim))).join('')}</ol>${unchecked(graph.basis.map(ref=>ref.source))}</section>
        ${field(t('Проектный синтез AiNativeOps','AiNativeOps design synthesis'),pair(graph.synthesis))}` : facts);
    if (graph) {workflowId=id;dialog.classList.add('workflow-dialog');workflowDetail(graph.nodes[0].id);}
  }
  function workflowDiagram(graph) { return graph.diagrams[map.language()] || graph.diagrams.en; }
  function workflowDetail(id) {
    const graph=(processes.get(workflowId) || processes.getPart(workflowId))?.workflow,n=graph?.nodes.find(n=>n.id===id);
    if(!n)return;
    const views={architecture:['meta',t('Архитектура','Architecture')],infrastructure:['infra',t('Инфраструктура','Infrastructure')],stack:['stack',t('Стек','Stack')]};
    const name=(view,key)=>loc(view==='stack'?model.stack.classes[key].name:
      model[view].elements[key].name || model.stack.classes[model[view].elements[key].class]?.name);
    const branch=graph.edges.filter(e=>e.from===id);
    const componentRows=Object.entries(n.components||{}).map(([view,ids])=>{
      if(map.placementFor(workflowId)!=='external')return [view,ids];
      const replace={stack:{'RM-MOD-07':'RM-MOD-03'},infrastructure:{'inference-servers':'external-llm-api'},architecture:{t_base:'t_ext',t_target:'t_ext'}};
      const exclude={stack:['RM-MOD-11','RM-MOD-01','RM-MOD-02','RM-HW-01','RM-HW-02'],infrastructure:['inference-runtime','foundation-model-artifact','adapted-model-artifact'],architecture:['t_gpu']};
      return [view,[...new Set(ids.filter(key=>!exclude[view].includes(key)).map(key=>replace[view][key]||key))]];
    });
    const kindName={step:t('Шаг','Step'),decision:t('Развилка','Decision'),outcome:t('Исход','Outcome')}[n.kind];
    document.getElementById('workflow-step-detail').innerHTML=`<span class="tag t-${n.kind}">${kindName}</span><h4>${esc(pair(n.label))}</h4><p>${esc(pair(n.detail))}</p>
      ${branch.length?`<h5>${t('Дальше','Next')}</h5><ul class="i-rows">${branch.map(e=>`<li><button type="button" data-workflow-node="${e.to}"><span class="i-name">${esc(pair(graph.nodes.find(n=>n.id===e.to).label))}</span><span class="i-note">${esc(pair(e.label))}</span></button></li>`).join('')}</ul>`:''}
      ${componentRows.filter(([,ids])=>ids.length).map(([view,ids])=>`<h5>${views[view][1]}</h5><ul class="i-rows">${ids.map(key=>`<li><button type="button" data-workflow-component="${key}" data-component-view="${views[view][0]}"><span class="i-name">${esc(name(view,key))}</span></button></li>`).join('')}</ul>`).join('')}`;
    dialog.querySelectorAll('.wf-node').forEach(el=>el.classList.toggle('active',el.dataset.workflowNode===id));
  }
  function openPart(flowId,id) {
    const p=processes.partOf(flowId,id),flow=processes.get(flowId);
    if (!p || !flow) return;
    if(p.workflow){openFlow(id,flowId);return;}
    const kind=p.kind==='operation'?t('Операция','Operation'):t('Подпроцесс','Subprocess');
    const linked=map.partElements(flowId,id);
    const refs=processes.classIds(p);
    const parent=`<div class="wb-part-parent">${t('В составе процесса','Part of the process')}
      <button type="button" class="wb-link" data-flow-details="${flow.id}">${esc(loc(flow.name))}</button></div>`;
    const elements=linked.length?`<section class="wb-detail"><h4>${t('Связанные элементы на карте','Related elements on the map')}</h4><div class="wb-tag-list">
      ${linked.map(node=>`<button type="button" class="wb-tag" data-related-element="${node.id}">${esc(node.name)}</button>`).join('')}</div></section>`:'';
    const classList=refs.length?`<section class="wb-detail"><h4>${t('Опорные классы','Reference classes')}</h4><div class="wb-tag-list">
      ${refs.map(rm=>`<button type="button" class="wb-tag" data-class-details="${rm}" title="${esc(loc(classes[rm].name))}">${rm}</button>`).join('')}</div></section>`:'';
    show(loc(p.name),kind+' · '+p.id,parent+
      field(t('Назначение','Purpose'),p.description?pair(p.description):'')+
      field(t('Запуск','Trigger'),text(p.start))+
      field(t('Результат','Result'),text(p.result))+
      field(t('Критерий проверки','Acceptance criterion'),text(p.check))+elements+classList);
  }
  function openClass(rm) {
    if (!Object.hasOwn(classes,rm)) return;
    const c=classes[rm];
    show(loc(c.name),rm+' · '+t('класс компонента','component class'),
      `<p class="wb-role">${esc(loc(c.desc))}</p><div class="wb-dialog-actions">
        <button type="button" class="wb-tag" data-map-class="${rm}">${t('Показать в стеке','Show in the stack')}</button></div>`+
      sourceSection('stack',rm,rm));
  }
  const zoneInfo = {
    platform:['Логическая область платформы: защитные функции, Harness по профилю, среды исполнения и данные. Внешние и корпоративные сервисы сохраняют свои границы.','Logical platform boundary: safety functions, optional Harness, runtimes, and data. External and enterprise services retain separate boundaries.'],
    'ai-safety-core':['Группа политик и функций принуждения, проверок, защиты данных и аудита. Их применение зависит от маршрута и условий профиля.','Policy and enforcement, checks, data protection, and audit. Applicability depends on the route and profile.'],
    agents:['Harness ведёт запуск, контекст, инструменты и состояние агентного задания. Допуск действия проверяется на отдельной защищённой границе.','Harness manages the run, context, tools, and state. Action admission is enforced at a separate protected boundary.'],
    exp:['Изолированная работа с кодом, наборами, заданиями обучения и результатами экспериментов.','Isolated work with code, datasets, training jobs, and experiment results.'],
    eval:['Независимые критерии, контрольные наборы и свидетельства оценки конкретного кандидата.','Independent criteria, evaluation sets, and evidence for the exact candidate.'],
    prod:['Исполнение допущенной конфигурации с защитными проверками и аудитом решений.','Admitted configurations run with required checks and decision audit.'],
    dmz:['Точки приёма внешних артефактов и контроля разрешённых сетевых путей.','External artifact intake and enforcement of allowed network routes.'],
    ext:['Поставщики и внешние интерфейсы. Права, раскрытие и наблюдаемость проверяются на границе.','Providers and external interfaces. Check authority, disclosure, and observability at the boundary.'],
    corp:['Корпоративные пользователи, идентичности, бизнес-системы и общие службы.','Enterprise users, identities, business systems, and shared services.'],
    'data-protection':['Подготовка защищённого представления и контроль доступа к данным.','Protected data representation and access control.'],
    guardrails:['Вход, выход и контекст проверяются до их передачи следующему потребителю.','Check input, output, and context before passing them to the next consumer.'],
    'operation-admission':['Решение по точной операции и применение решения у ресурса.','Decide on the exact operation and enforce at the resource.'],
    'data-platform':['Хранение, версии, описание и извлечение допущенных данных.','Storage, versions, cataloging, and retrieval of admitted data.'],
    'ci-cd':['Сборка, свидетельства, допуск точной версии и развёртывание.','Build, evidence, exact-version admission, and deployment.'],
    observability:['Метрики, трассы и журналы для диагностики. Свидетельства допуска учитываются по отдельным правилам.','Metrics, traces, and logs for diagnostics. Admission evidence has separate rules.'],
    'trusted-services':['Ключи, секреты, аттестация и хранение свидетельств по профилю.','Keys, secrets, attestation, and evidence retention according to the profile.']
  };

  function openZone(id,title) {
    if (!Object.hasOwn(zoneInfo,id)) return;
    show(title,t('Граница модели','Model boundary'),`<p class="wb-role">${esc(pair(zoneInfo[id]))}</p>`+sourceSection('zones',id));
  }
  window.AINO_UI={cardContext,openZone,openFlow,openPart};
  dialog.addEventListener('click',e=>{
    if (e.target===dialog) {dialog.close();return;}
    const size=e.target.closest('[data-workflow-size]');
    if(size?.dataset.workflowSize!==undefined){
      const expanded=dialog.querySelector('#workflow-canvas').classList.toggle('expanded');
      size.setAttribute('aria-pressed',String(expanded));
      size.textContent=expanded?t('Уменьшить схему','Reduce diagram'):t('Увеличить схему','Enlarge diagram');
      return;
    }
    const step=e.target.closest('[data-workflow-node]')?.dataset.workflowNode;
    if(step){workflowDetail(step);return;}
    const d=e.target.closest('button')?.dataset;
    if (!d) return;
    if (d.closeDetails!==undefined) dialog.close();
    if (d.flowDetails) openFlow(d.flowDetails);
    if (d.mapFlow) map.open(map.currentView(),d.mapFlow);
    if (d.classDetails) openClass(d.classDetails);
    if (d.relatedElement) map.showElement(d.relatedElement);
    if (d.mapClass) map.open('stack',undefined,d.mapClass);
    if (d.workflowComponent) map.open(d.componentView,workflowId,d.workflowComponent);
  });
  dialog.addEventListener('keydown',e=>{
    const id=e.target.closest('[data-workflow-node]')?.dataset.workflowNode;
    if(id && (e.key==='Enter'||e.key===' ')){e.preventDefault();workflowDetail(id);}
  });
})();
