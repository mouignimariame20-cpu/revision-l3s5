/* Base de données statique : contenu dans data.js, progression de chaque visiteur dans son navigateur (localStorage). */
(function(){
  const KEY="medij-progress-v1";
  const base=window.__DATA||{decks:{},sources:{}};
  let ov;try{ov=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  ov=ov||{decks:{},deleted:[],sources:{},meta:{}};
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(ov))}catch(e){}};
  /* planning fourni avec le site : chaque personne choisit ce qu'elle garde (cours de la promo, prières, Coran…) ; rien n'écrase ce qu'elle a saisi ni ne revient après suppression */
  const FRESH=!localStorage.getItem(KEY);window.__FRESH=FRESH;
  const SEEDCAT=(k,x)=>k!=="habits"?"edt":/^hab-(fajr|dhuhr|asr|maghrib|icha)/.test(x.id)?"prieres":/^hab-coran/.test(x.id)?"coran":x.id==="hab-batch"?"batch":"perso";
  function seed(opts){try{const bp=base.planning&&base.planning.main;if(!bp)return;ov.planning=ov.planning||{};
    const cur=ov.planning.main=ov.planning.main||{edt:[],habits:[],obligations:[],exams:[]};const o=opts||ov.seedOpts||null,rm=new Set(cur.removed||[]);
    const sv=cur._seedv=cur._seedv||{},J=x=>JSON.stringify(x);
    ["edt","habits","obligations","exams","calendar"].forEach(k=>{cur[k]=cur[k]||[];(bp[k]||[]).forEach(x=>{if(rm.has(x.id))return;const i=cur[k].findIndex(y=>y.id===x.id);
      if(i>=0){/* mise à jour du site (ex. nouvelles heures de prière) si la personne n'a pas modifié cet élément */if(J(cur[k][i])!==J(x)&&(sv[x.id]===undefined||sv[x.id]===J(cur[k][i])))cur[k][i]=JSON.parse(J(x));sv[x.id]=J(x);return}
      if(o&&!o[SEEDCAT(k,x)])return;cur[k].push(JSON.parse(J(x)));sv[x.id]=J(x)})});
    if(!cur.semStart&&bp.semStart)cur.semStart=bp.semStart;
    if(!cur.prefs&&bp.prefs)cur.prefs=JSON.parse(JSON.stringify(bp.prefs));save()}catch(e){}}
  if(FRESH){ov.pending=true;save()}
  window.__ONBOARD=!!ov.pending;
  if(!ov.pending)seed(null);
  window.__seedPlanning=opts=>{ov.seedOpts=opts;ov.pending=false;window.__ONBOARD=false;seed(opts);save()};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const content=d=>JSON.stringify({n:d.name,m:d.matiere,p:d.partie,s:d.source,f:d.fiche,c:(d.cards||[]).map(c=>[c.id,c.q,c.a,c.img||""]),q:d.qcm||[]});
  const CK=new Set(["id","q","a","src","img"]),QK=new Set(["id","q","options","correct","expl"]),DK=new Set(["fiche","cards","qcm","name","matiere","partie","source"]);
  const extra=(o,K)=>{const r={};for(const k in o)if(!K.has(k))r[k]=o[k];return r};
  function deck(id){
    if(ov.deleted.includes(id))return null;
    const b=base.decks[id],o=ov.decks[id];
    if(!o)return b?clone(b):null;
    if(o.full)return clone(o.full);
    if(!b)return null;
    const d=clone(b);
    Object.assign(d,o.top||{});
    if(!o.top){if("learnedOn" in o)d.learnedOn=o.learnedOn;if(o.jDone)d.jDone=o.jDone;if("lastScore" in o)d.lastScore=o.lastScore}
    (d.cards||[]).forEach(c=>{const p=o.cards&&o.cards[c.id];if(p)Object.assign(c,p)});
    (d.qcm||[]).forEach(q=>{const p=o.qcm&&o.qcm[q.id];if(p)Object.assign(q,p)});
    return d;
  }
  function setDeck(id,d){
    ov.deleted=ov.deleted.filter(x=>x!==id);
    const b=base.decks[id];
    if(b&&content(b)===content(d)){
      const cards={},qcm={};
      (d.cards||[]).forEach(c=>{const e=extra(c,CK);if(Object.keys(e).length)cards[c.id]=e});
      (d.qcm||[]).forEach(q=>{const e=extra(q,QK);if(Object.keys(e).length)qcm[q.id]=e});
      const top=extra(d,DK);delete top.id;
      ov.decks[id]={top,cards,qcm};
    }else ov.decks[id]={full:clone(d)};
    save();
  }
  const ids=c=>c==="decks"?[...new Set([...Object.keys(base.decks),...Object.keys(ov.decks)])].filter(id=>deck(id))
    :c==="sources"?[...new Set([...Object.keys(base.sources),...Object.keys(ov.sources)])].filter(id=>get(c,id)):Object.keys(ov[c]||{});
  function get(c,id){
    if(c==="decks")return deck(id);
    if(c==="sources"){const o=ov.sources[id];if(o===null)return null;return o?clone(o):base.sources[id]?clone(base.sources[id]):null}
    return ov[c]&&ov[c][id]?clone(ov[c][id]):null;
  }
  const snap=(c,id)=>{const v=get(c,id);return{id,exists:!!v,data:()=>v}};
  const coll=c=>({limit(){return this},get:async()=>({docs:ids(c).map(id=>snap(c,id))}),onSnapshot(fn){setTimeout(()=>fn({docs:ids(c).map(id=>snap(c,id))}),0);return()=>{}}});
  const db={collection:c=>coll(c),doc:p=>{const [c,id]=p.split("/");return{
    get:async()=>snap(c,id),
    set:async d=>{if(c==="decks")setDeck(id,d);else if(c==="sources"){ov.sources[id]=clone(d);save()}else{(ov[c]=ov[c]||{})[id]=clone(d);save()}},
    delete:async()=>{if(c==="decks"){delete ov.decks[id];if(!ov.deleted.includes(id))ov.deleted.push(id)}else if(c==="sources")ov.sources[id]=null;else if(ov[c])delete ov[c][id];save()}}}};
  /* IA hors Claude : Gemini (Google) avec la clé personnelle de la visiteuse, gardée dans son navigateur */
  window.__STATIC=true;
  let AIKEY="",CKEY="",PROV="gemini";try{AIKEY=(localStorage.getItem("medij-ai-key")||"").replace(/[\s\u200b-\u200d\ufeff"'«»]/g,"");CKEY=(localStorage.getItem("medij-claude-key")||"").replace(/[\s\u200b-\u200d\ufeff"'«»]/g,"");PROV=localStorage.getItem("medij-ai-provider")||(CKEY&&!AIKEY?"claude":"gemini")}catch(e){}
  if(PROV==="claude"&&!CKEY)PROV="gemini";if(PROV==="gemini"&&!AIKEY&&CKEY)PROV="claude";
  const MODELS=["gemini-flash-latest","gemini-3.8-flash","gemini-3.6-flash","gemini-2.5-flash"];let MI=0;
  try{const m=localStorage.getItem("medij-ai-model");if(m)MODELS.unshift(m)}catch(e){}
  const b64=blob=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=ko;r.readAsDataURL(blob)});
  async function shrink(blob){try{if(blob.size<1.5e6)return blob;const bmp=await createImageBitmap(blob);const sc=Math.min(1,2000/Math.max(bmp.width,bmp.height));const cv=document.createElement("canvas");cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);return await new Promise(r=>cv.toBlob(r,"image/jpeg",.85))}catch(e){return blob}}
  const err=(code,message,text)=>{const e={code,message};if(text)e.text=text;return e};
  async function gem(input,opts={},json=false){
    if(opts.signal?.aborted)throw err("cancelled","stop");
    const turns=typeof input==="string"?[{role:"user",content:input}]:input;
    const contents=turns.map(t=>({role:t.role==="assistant"?"model":"user",parts:[{text:String(t.content)}]}));
    let imgs=opts.images?[...(opts.images.length!=null&&!(opts.images instanceof Blob)?opts.images:[opts.images])]:[];
    for(const im of imgs){const bl=await shrink(im);contents[contents.length-1].parts.push({inline_data:{mime_type:bl.type||"image/jpeg",data:await b64(bl)}})}
    const body={contents,generationConfig:{maxOutputTokens:32768,temperature:.4,...(json?{responseMimeType:"application/json"}:{})}};
    let tries=0;const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
    for(;;){
      let r;try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELS[MI]}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":AIKEY},body:JSON.stringify(body),signal:opts.signal})}
      catch(e){if(opts.signal?.aborted)throw err("cancelled","stop");throw err("upstream_error","Connexion à Gemini impossible : vérifie ta connexion internet.")}
      if(r.status===404&&MI<MODELS.length-1){MI++;continue}
      const j=await r.json().catch(()=>({}));
      if(!r.ok){const m=j?.error?.message||("Erreur "+r.status);
        if([429,500,502,503,504].includes(r.status)&&tries<MODELS.length*2-1){tries++;MI=(MI+1)%MODELS.length;await sleep(Math.min(6000,1200*tries));if(opts.signal?.aborted)throw err("cancelled","stop");continue}
        if(r.status===429)throw err("rate_limited","Limite gratuite de Gemini atteinte pour le moment. Réessaie dans quelques minutes (ou demain si la limite du jour est atteinte).");
        if(r.status>=500)throw err("upstream_error","Gemini est surchargé en ce moment (forte demande). Réessaie dans quelques minutes.");
        if(r.status===400&&/api key/i.test(m))throw err("not_granted_key","Clé Gemini refusée par Google ("+m+"). Recopie la clé entière depuis aistudio.google.com (bouton copier), puis colle-la dans « IA active · changer ».");
        if(r.status===403)throw err("not_granted_key","Clé Gemini refusée ou service non disponible dans ton pays : "+m);
        throw err("upstream_error",m)}
      try{localStorage.setItem("medij-ai-model",MODELS[MI])}catch(e){}
      const c=j?.candidates?.[0];const text=(c?.content?.parts||[]).map(p=>p.text||"").join("");
      if(!text){if(c?.finishReason==="SAFETY"||j?.promptFeedback?.blockReason)throw err("refused","Réponse bloquée par Gemini");throw err("empty_completion","Réponse vide")}
      return {text,truncated:c?.finishReason==="MAX_TOKENS"};
    }
  }
  async function cla(input,opts={},json=false){
    if(opts.signal?.aborted)throw err("cancelled","stop");
    const turns=typeof input==="string"?[{role:"user",content:input}]:input;
    const messages=turns.map(t=>({role:t.role==="assistant"?"assistant":"user",content:[{type:"text",text:String(t.content)+(json&&t===turns[turns.length-1]?"\n\nRéponds uniquement avec du JSON valide.":"")}]}));
    let imgs=opts.images?[...(opts.images.length!=null&&!(opts.images instanceof Blob)?opts.images:[opts.images])]:[];
    for(const im of imgs){const bl=await shrink(im);messages[messages.length-1].content.unshift({type:"image",source:{type:"base64",media_type:/png|webp|gif/.test(bl.type)?bl.type:"image/jpeg",data:await b64(bl)}})}
    let r,tries=0;for(;;){try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:opts.signal,headers:{"content-type":"application/json","x-api-key":CKEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:localStorage.getItem("medij-claude-model")||"claude-sonnet-5-5",max_tokens:16000,messages})})}
    catch(e){if(opts.signal?.aborted)throw err("cancelled","stop");throw err("upstream_error","Connexion à Claude impossible : vérifie ta connexion internet.")}
    if([429,500,529,503].includes(r.status)&&tries<3){tries++;await new Promise(ok=>setTimeout(ok,2000*tries));continue}break}
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const m=j?.error?.message||("Erreur "+r.status);
      if(r.status===429)throw err("rate_limited",m);
      if(r.status===529||r.status>=500)throw err("upstream_error","Claude est surchargé en ce moment. Réessaie dans quelques minutes.");
      if(r.status===401)throw err("not_granted_key","Clé Claude invalide : vérifie-la dans l'Assistant.");
      if(r.status===400&&/credit|billing/i.test(m))throw err("not_granted_key","Crédit Anthropic insuffisant : ajoute du crédit sur console.anthropic.com.");
      throw err("upstream_error",m)}
    const text=(j.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
    if(!text)throw err("empty_completion","Réponse vide");
    return {text,truncated:j.stop_reason==="max_tokens"};
  }
  const call=(i,o,j)=>PROV==="claude"?cla(i,o,j):gem(i,o,j);
  let sampleFn=null;
  if(PROV==="claude"?CKEY:AIKEY){
    sampleFn=async(input,opts={})=>{const r=await call(input,opts,false);opts.onText&&opts.onText({text:r.text,delta:r.text});return {text:r.text,truncated:r.truncated,modelTierApplied:"default"}};
    sampleFn.json=async(input,opts={})=>{const r=await call(input,opts,true);let t=r.text.trim();
      try{return JSON.parse(t)}catch(e){}const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1])}catch(e){}}
      const a=Math.min(...["{","["].map(ch=>{const i=t.indexOf(ch);return i<0?1e9:i})),z=Math.max(t.lastIndexOf("}"),t.lastIndexOf("]"));
      if(a<1e9&&z>a){try{return JSON.parse(t.slice(a,z+1))}catch(e){}}throw err("invalid_json","JSON illisible",t)};
    sampleFn.limits=async()=>({maxPromptBytes:900000,images:{maxCount:8,maxInputBytes:2e7,mediaTypes:["image/jpeg","image/png","image/webp"]}});
  }
  window.claude={use:async n=>n==="db"?db:n==="sample"?sampleFn:null};
})();
