/* The process picker is an index of complete, ordered processes (model/processes/flows).
   Stages and variants of a process come from model/processes/parts. */
(() => {
  'use strict';
  const {profiles, processMaps, workflows, processGroups: groups} = window.AINO_MODEL.workbench;
  const entry = (o,k) => Object.hasOwn(o,k) ? o[k] : null;
  const normalize = ([id,row])=>({id,...row});
  const rows = Object.entries(processMaps.flows).map(normalize).map(f=>({...f,workflow:workflows.flows[f.id]}))
    .sort((a,b)=>(a.order||100)-(b.order||100));
  const flows = new Map(rows.map(f=>[f.id,f]));
  const parts = new Map(Object.entries(processMaps.parts).map(normalize).map(p=>[p.id,{...p,workflow:workflows.parts?.[p.id]}]));
  const get = id => flows.get(id);
  const partOf = (flow,id) => flows.get(flow)?.parts.includes(id) ? parts.get(id) : null;
  const parents = id => rows.filter(f=>f.parts.includes(id));
  const clean = s => s.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
  const filter = (query,group='') => {
    const tokens = clean(query).split(/\s+/).filter(Boolean);
    return rows.filter(f=>(!group||group===f.group) &&
      tokens.every(token=>clean([f.id,f.name.ru,f.name.en,...(f.tags||[]),...(f.workflow?.basis||[]).flatMap(b=>
        [b.source,...b.claim]),...f.parts.flatMap(id=>{
        const p=parts.get(id);return [id,p.name.ru,p.name.en];
      })].join(' ')).includes(token)));
  };
  function settingsFrom(query) {
    return Object.fromEntries(Object.entries(profiles.options).map(([key,o])=>{
      const val=query.get(key);
      return [key,entry(o.values,val) ? val : profiles.defaults[key]];
    }));
  }
  const hasPath = row => Boolean(row?.path || row?.paths);
  const pathFor = (row,value) => row?.path ?? (row?.paths && entry(row.paths,value)) ?? null;
  const pathIds = row => row.path ? [row.path] : Object.values(row.paths || {});
  const pathOwners = new Map();
  function indexRoutes(row,key) {
    if (row.path) pathOwners.set(row.path,{[key]:row.id});
    if (row.paths) for (const [variant,id] of Object.entries(row.paths)) pathOwners.set(id,{[key]:row.id,variant});
  }
  rows.forEach(f=>indexRoutes(f,'flow'));
  parts.forEach(p=>indexRoutes(p,'part'));
  function variantFor(row,settings,preferred) {
    if (!row.option) return null;
    const options=profiles.options[row.option];
    const value=[preferred,settings[row.option],profiles.defaults[row.option]].find(v=>entry(row.paths,v));
    return {key:row.option,value,options};
  }
  function selection(id, settings, preferred, partId, currentFlow) {
    const owner=pathOwners.get(id);
    const wantedPart=partId || owner?.part || (parts.has(id) ? id : null);
    const flow=get(id) || (wantedPart && partOf(currentFlow,wantedPart) ? get(currentFlow) : null) || get(owner?.flow) ||
      (wantedPart && (partOf(currentFlow,wantedPart) ? get(currentFlow) : parents(wantedPart)[0]));
    if (!flow) return null;
    const rootVariant=variantFor(flow,settings,owner?.variant ?? preferred);
    const rootPath=pathFor(flow,rootVariant?.value);
    const child=partOf(flow.id,wantedPart);
    const variant=child?.option ? variantFor(child,settings,owner?.variant ?? preferred) : rootVariant;
    const childPath=pathFor(child,variant?.value);
    return {id:flow.id,flow,variant,rootPath,part:childPath ? child : null,scenario:childPath || rootPath};
  }
  const classIds = p => p.classes ?? [];
  const pathsIn = f => [...pathIds(f),...f.parts.flatMap(id=>pathIds(parts.get(id)))];
  window.AINO_PROCESSES = {rows,groups,get,getPart:id=>parts.get(id),partOf,filter,settingsFrom,selection,classIds,hasPath,pathsIn};
})();
