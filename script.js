(function(){
"use strict";
var STAGES=["New","Review","Interview","Offer","Hired"];
var LEVELS=["Junior","Mid-level","Senior","Lead"];
var KEY="smarthire-ai-v1";
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(t){return String(t==null?"":t).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var uid=function(p){return p+Math.random().toString(36).slice(2,9)};

function seed(){
  var j1=uid("j"),j2=uid("j"),j3=uid("j"),t=Date.now();
  return {
    jobs:[
      {id:j1,title:"Product Manager",dept:"Product",level:"Senior",skills:["Roadmapping","Stakeholder management","SQL","User research","Agile"],desc:"Owns the roadmap for the core product and works with design and engineering.",created:t-3000},
      {id:j2,title:"Data Analyst",dept:"Analytics",level:"Junior",skills:["SQL","Excel","Python","Tableau","Statistics"],desc:"Builds weekly reports and answers ad hoc questions from the business teams.",created:t-2000},
      {id:j3,title:"Frontend Engineer",dept:"Engineering",level:"Mid-level",skills:["JavaScript","React","CSS","HTML","Testing","Git"],desc:"Builds and tests customer-facing screens in a React codebase.",created:t-1000}
    ],
    candidates:[
      {id:uid("c"),name:"Alex Rivera",exp:3,stage:"New",jobId:j3,skills:["JavaScript","React","CSS","Git"],resume:"Built dashboards in React and wrote CSS for a design system. Uses Git daily. JavaScript is the main language.",created:t-6000},
      {id:uid("c"),name:"Taylor Brooks",exp:2,stage:"New",jobId:j1,skills:["Agile","SQL","User research","Roadmapping"],resume:"Ran sprint planning as an associate product manager and wrote SQL queries for feature reports. Interviewed users for two projects.",created:t-5000},
      {id:uid("c"),name:"Jamie Patel",exp:1,stage:"Review",jobId:j2,skills:["Excel","SQL","Python","Statistics"],resume:"Built Excel models and wrote SQL for a university project. Used Python for basic statistics coursework.",created:t-4000},
      {id:uid("c"),name:"Sam Okafor",exp:5,stage:"Interview",jobId:j3,skills:["JavaScript","React","HTML","CSS","Testing","Git"],resume:"Five years building React apps. Wrote unit tests with Jest, maintained CSS and HTML templates, and managed releases in Git.",created:t-3500},
      {id:uid("c"),name:"Morgan Chen",exp:6,stage:"Offer",jobId:j1,skills:["Roadmapping","Stakeholder management","SQL","User research","Agile"],resume:"Led roadmapping for a payments product, aligned stakeholders across three teams, and ran user research with agile squads. Uses SQL for analysis.",created:t-3200},
      {id:uid("c"),name:"Riley Nguyen",exp:2,stage:"Hired",jobId:j2,skills:["SQL","Excel","Tableau","Python"],resume:"Built Tableau reports and wrote SQL for a retail team. Automated Excel work with Python scripts.",created:t-3100}
    ]
  };
}

var memory=null;
function load(){
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){var d=JSON.parse(raw);if(d&&Array.isArray(d.jobs)&&Array.isArray(d.candidates))return d}
  }catch(e){}
  return memory||seed();
}
var state=load();
function save(){memory=state;try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
save();

function parseSkills(text){
  var seen={},out=[];
  String(text||"").split(/[,\n;]/).forEach(function(s){
    s=s.trim();if(!s)return;
    var k=s.toLowerCase();if(!seen[k]){seen[k]=1;out.push(s)}
  });
  return out;
}
var norm=function(s){return s.toLowerCase().trim()};
var jobById=function(id){return state.jobs.find(function(j){return j.id===id})};
var candById=function(id){return state.candidates.find(function(c){return c.id===id})};

function compare(job,cand){
  var listed=cand.skills.map(norm);
  var resume=norm(cand.resume||"");
  var matched=[],missing=[],confirmed=[],unconfirmed=[];
  job.skills.forEach(function(sk){
    var k=norm(sk);
    if(listed.indexOf(k)>-1){
      matched.push(sk);
      if(resume.indexOf(k)>-1)confirmed.push(sk);else unconfirmed.push(sk);
    }else{
      missing.push(sk);
    }
  });
  var pct=job.skills.length?Math.round(matched.length/job.skills.length*100):0;
  return {matched:matched,missing:missing,confirmed:confirmed,unconfirmed:unconfirmed,pct:pct};
}
var RANGE={"Junior":[0,2],"Mid-level":[2,5],"Senior":[5,8],"Lead":[8,60]};

var toastTimer;
function toast(msg){
  var t=$("#toast");t.textContent=msg;t.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true},2400);
}
function chips(arr,cls){return arr.length?arr.map(function(s){return '<span class="chip '+(cls||"")+'">'+esc(s)+'</span>'}).join(""):'<span class="meta">None</span>'}
function stagePill(st){return '<span class="pill" data-stage="'+esc(st)+'"><i class="dot"></i>'+esc(st)+'</span>'}
function fillSelect(sel,opts,current){
  sel.innerHTML=opts.map(function(o){return '<option value="'+esc(o.v)+'">'+esc(o.t)+'</option>'}).join("");
  if(current!=null&&opts.some(function(o){return o.v===current}))sel.value=current;
}
function jobOptions(allLabel){
  var o=allLabel?[{v:"",t:allLabel}]:[];
  return o.concat(state.jobs.map(function(j){return {v:j.id,t:j.title+" ("+j.level+")"}}));
}

/* ---------- navigation ---------- */
var VIEWS=["dashboard","jobs","candidates","matching","insights","pipeline"];
function currentView(){var h=location.hash.replace("#","");return VIEWS.indexOf(h)>-1?h:"dashboard"}
function go(v){if(location.hash==="#"+v)route();else location.hash=v}
function route(){
  var v=currentView();
  VIEWS.forEach(function(n){$("#view-"+n).hidden=n!==v});
  document.querySelectorAll("#nav a").forEach(function(a){
    if(a.dataset.view===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
  });
  renderAll();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);

/* ---------- dashboard ---------- */
function renderDashboard(){
  $("#d-jobs").textContent=state.jobs.length;
  $("#d-cands").textContent=state.candidates.length;
  $("#d-stages").innerHTML=STAGES.map(function(s){
    var n=state.candidates.filter(function(c){return c.stage===s}).length;
    return '<button type="button" class="stage-card" data-stage="'+s+'" data-go="pipeline"><span class="lbl"><i class="dot"></i>'+s+'</span><strong>'+n+'</strong></button>';
  }).join("");
  var jobs=state.jobs.slice().sort(function(a,b){return b.created-a.created}).slice(0,3);
  $("#d-latest-jobs").innerHTML=jobs.length?jobs.map(function(j){return '<div><b>'+esc(j.title)+'</b><span class="meta">'+esc(j.dept)+' · '+esc(j.level)+'</span></div>'}).join(""):'<div class="meta">No jobs yet.</div>';
  var cs=state.candidates.slice().sort(function(a,b){return b.created-a.created}).slice(0,4);
  $("#d-latest-cands").innerHTML=cs.length?cs.map(function(c){return '<div><b>'+esc(c.name)+'</b><span class="meta">'+esc(c.stage)+' · '+c.exp+' years</span></div>'}).join(""):'<div class="meta">No candidates yet.</div>';
}

/* ---------- jobs ---------- */
var editingJob=null;
function renderJobs(){
  var q=norm($("#job-search").value),lv=$("#job-level-filter").value;
  var list=state.jobs.filter(function(j){
    if(lv&&j.level!==lv)return false;
    if(!q)return true;
    return (j.title+" "+j.dept+" "+j.skills.join(" ")).toLowerCase().indexOf(q)>-1;
  });
  $("#job-count").textContent="Showing "+list.length+" of "+state.jobs.length+" jobs";
  $("#job-list").innerHTML=list.length?list.map(function(j){
    var n=state.candidates.filter(function(c){return c.jobId===j.id}).length;
    return '<article class="item"><div class="item-top"><div><h3>'+esc(j.title)+'</h3><p class="meta">'+esc(j.dept)+' · '+esc(j.level)+' · '+n+' candidate'+(n===1?"":"s")+'</p></div>'+
      '<div class="actions"><button type="button" class="btn btn-sm" data-edit-job="'+j.id+'">Edit</button><button type="button" class="btn btn-sm btn-danger" data-del-job="'+j.id+'">Delete</button></div></div>'+
      (j.desc?'<p class="meta" style="margin-top:8px">'+esc(j.desc)+'</p>':'')+
      '<div class="chips">'+chips(j.skills)+'</div></article>';
  }).join(""):'<div class="empty">No jobs match. Change the search or add a job.</div>';
}
function resetJobForm(){
  editingJob=null;$("#job-form").reset();$("#job-form-title").textContent="Add a job";
  $("#job-submit").textContent="Save job";$("#job-cancel").hidden=true;$("#job-error").textContent="";
}
$("#job-form").addEventListener("submit",function(e){
  e.preventDefault();
  var title=$("#job-title").value.trim(),dept=$("#job-dept").value.trim(),skills=parseSkills($("#job-skills").value);
  var err=$("#job-error");
  if(!title){err.textContent="Enter a job title.";$("#job-title").focus();return}
  if(!dept){err.textContent="Enter a department.";$("#job-dept").focus();return}
  if(!skills.length){err.textContent="Add at least one required skill.";$("#job-skills").focus();return}
  var rec={title:title,dept:dept,level:$("#job-level").value,skills:skills,desc:$("#job-desc").value.trim()};
  if(editingJob){
    var j=jobById(editingJob);if(j)Object.assign(j,rec);toast("Job updated");
  }else{
    state.jobs.push(Object.assign({id:uid("j"),created:Date.now()},rec));toast("Job added");
  }
  save();resetJobForm();renderAll();
});
$("#job-cancel").addEventListener("click",resetJobForm);
$("#job-search").addEventListener("input",renderJobs);
$("#job-level-filter").addEventListener("change",renderJobs);
$("#job-list").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  if(b.dataset.editJob){
    var j=jobById(b.dataset.editJob);if(!j)return;
    editingJob=j.id;
    $("#job-title").value=j.title;$("#job-dept").value=j.dept;$("#job-level").value=j.level;
    $("#job-skills").value=j.skills.join(", ");$("#job-desc").value=j.desc||"";
    $("#job-form-title").textContent="Edit job";$("#job-submit").textContent="Update job";$("#job-cancel").hidden=false;
    $("#job-title").focus();window.scrollTo(0,0);
  }
  if(b.dataset.delJob){
    if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Press again to delete";return}
    var id=b.dataset.delJob;
    state.jobs=state.jobs.filter(function(x){return x.id!==id});
    state.candidates.forEach(function(c){if(c.jobId===id)c.jobId=""});
    if(editingJob===id)resetJobForm();
    save();renderAll();toast("Job deleted");
  }
});

/* ---------- candidates ---------- */
var editingCand=null;
function renderCandidates(){
  var q=norm($("#cand-search").value),sf=$("#cand-stage-filter").value,jf=$("#cand-job-filter").value;
  var list=state.candidates.filter(function(c){
    if(sf&&c.stage!==sf)return false;
    if(jf&&c.jobId!==jf)return false;
    if(!q)return true;
    return (c.name+" "+c.skills.join(" ")+" "+(c.resume||"")).toLowerCase().indexOf(q)>-1;
  });
  $("#cand-count").textContent="Showing "+list.length+" of "+state.candidates.length+" candidates";
  $("#cand-list").innerHTML=list.length?list.map(function(c){
    var j=jobById(c.jobId);
    var m=j?compare(j,c):null;
    return '<article class="item"><div class="item-top"><div><h3>'+esc(c.name)+'</h3><p class="meta">'+c.exp+' year'+(c.exp===1?"":"s")+' · '+(j?esc(j.title):'No job selected')+(m?' · '+m.pct+'% skill match':'')+'</p></div>'+
      '<div class="actions">'+stagePill(c.stage)+'</div></div>'+
      '<div class="chips">'+chips(c.skills)+'</div>'+
      (c.resume?'<p class="meta" style="margin-top:8px">'+esc(c.resume)+'</p>':'')+
      '<div class="actions" style="margin-top:12px">'+
      '<button type="button" class="btn btn-sm" data-match="'+c.id+'">Compare skills</button>'+
      '<button type="button" class="btn btn-sm" data-edit-cand="'+c.id+'">Edit</button>'+
      '<button type="button" class="btn btn-sm btn-danger" data-del-cand="'+c.id+'">Delete</button></div></article>';
  }).join(""):'<div class="empty">No candidates match. Change the filters or add a candidate.</div>';
}
function resetCandForm(){
  editingCand=null;$("#cand-form").reset();$("#cand-form-title").textContent="Add a candidate";
  $("#cand-submit").textContent="Save candidate";$("#cand-cancel").hidden=true;$("#cand-error").textContent="";
  $("#cand-stage").value="New";
}
$("#cand-form").addEventListener("submit",function(e){
  e.preventDefault();
  var name=$("#cand-name").value.trim(),expRaw=$("#cand-exp").value.trim(),skills=parseSkills($("#cand-skills").value);
  var err=$("#cand-error"),exp=Number(expRaw);
  if(!name){err.textContent="Enter the candidate's name.";$("#cand-name").focus();return}
  if(expRaw===""||!isFinite(exp)||exp<0||exp>60){err.textContent="Enter experience as a number from 0 to 60.";$("#cand-exp").focus();return}
  if(!$("#cand-job").value){err.textContent="Create a job first, then choose it here.";return}
  if(!skills.length){err.textContent="Add at least one skill.";$("#cand-skills").focus();return}
  var rec={name:name,exp:Math.round(exp),stage:$("#cand-stage").value,jobId:$("#cand-job").value,skills:skills,resume:$("#cand-resume").value.trim()};
  if(editingCand){var c=candById(editingCand);if(c)Object.assign(c,rec);toast("Candidate updated")}
  else{state.candidates.push(Object.assign({id:uid("c"),created:Date.now()},rec));toast("Candidate added")}
  save();resetCandForm();renderAll();
});
$("#cand-cancel").addEventListener("click",resetCandForm);
["#cand-search"].forEach(function(s){$(s).addEventListener("input",renderCandidates)});
["#cand-stage-filter","#cand-job-filter"].forEach(function(s){$(s).addEventListener("change",renderCandidates)});
$("#cand-list").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  if(b.dataset.match){
    var c=candById(b.dataset.match);if(!c)return;
    matchSel={job:c.jobId,cand:c.id};go("matching");
  }
  if(b.dataset.editCand){
    var c2=candById(b.dataset.editCand);if(!c2)return;
    editingCand=c2.id;
    $("#cand-name").value=c2.name;$("#cand-exp").value=c2.exp;$("#cand-stage").value=c2.stage;
    $("#cand-job").value=c2.jobId;$("#cand-skills").value=c2.skills.join(", ");$("#cand-resume").value=c2.resume||"";
    $("#cand-form-title").textContent="Edit candidate";$("#cand-submit").textContent="Update candidate";$("#cand-cancel").hidden=false;
    $("#cand-name").focus();window.scrollTo(0,0);
  }
  if(b.dataset.delCand){
    if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Press again to delete";return}
    var id=b.dataset.delCand;
    state.candidates=state.candidates.filter(function(x){return x.id!==id});
    if(editingCand===id)resetCandForm();
    save();renderAll();toast("Candidate deleted");
  }
});

/* ---------- matching ---------- */
var matchSel=null;
function renderMatching(){
  var jobSel=$("#match-job"),candSel=$("#match-cand");
  var curJ=matchSel?matchSel.job:jobSel.value,curC=matchSel?matchSel.cand:candSel.value;
  fillSelect(jobSel,state.jobs.map(function(j){return {v:j.id,t:j.title+" ("+j.level+")"}}),curJ);
  fillSelect(candSel,state.candidates.map(function(c){var j=jobById(c.jobId);return {v:c.id,t:c.name+(j?" – applied: "+j.title:"")}}),curC);
  if(matchSel){matchSel=null;runMatch()}
  else if(!jobSel.options.length||!candSel.options.length){
    $("#match-result").innerHTML='<div class="empty">Add at least one job and one candidate to compare skills.</div>';
  }else if($("#match-result").dataset.shown==="1"){runMatch()}
}
function questionsFor(job,cand,m){
  var q=[];
  m.missing.slice(0,3).forEach(function(s){q.push("The role needs "+s+" and it is not on the profile. Describe a time you learned something similar quickly. What was the result?")});
  m.unconfirmed.slice(0,3).forEach(function(s){q.push("You list "+s+", but the résumé summary does not mention it. Walk me through a project where you used it and what you personally did.")});
  m.confirmed.slice(0,2).forEach(function(s){q.push("Your résumé shows "+s+". Which result with it are you proudest of, and how did you measure it?")});
  var r=RANGE[job.level]||[0,60];
  if(cand.exp<r[0])q.push("This is a "+job.level+" role and you have "+cand.exp+" year"+(cand.exp===1?"":"s")+" of experience. Which responsibilities from the role do you feel ready for, and where would you want support?");
  else if(job.level==="Senior"||job.level==="Lead")q.push("Tell me about a decision you made that others disagreed with. How did you handle it?");
  else q.push("What would you want to learn in your first three months in this "+job.title+" role?");
  return q;
}
function runMatch(){
  var job=jobById($("#match-job").value),cand=candById($("#match-cand").value),err=$("#match-error"),box=$("#match-result");
  err.textContent="";
  if(!job||!cand){err.textContent="Choose both a job and a candidate.";return}
  var m=compare(job,cand),r=RANGE[job.level]||[0,60];
  var expNote=cand.exp<r[0]?cand.exp+" years is below the usual range for "+job.level+" ("+r[0]+"+ years).":
    cand.exp>r[1]?cand.exp+" years is above the usual range for "+job.level+" ("+r[0]+"–"+r[1]+" years).":
    cand.exp+" years fits the usual range for "+job.level+".";
  var summary=cand.name+" lists "+m.matched.length+" of "+job.skills.length+" required skills for "+job.title+" ("+m.pct+"%). "+
    (m.confirmed.length?m.confirmed.length+" of those appear in the résumé summary. ":"None of the matched skills appear in the résumé summary. ")+
    (m.unconfirmed.length?m.unconfirmed.length+" still need confirming in an interview. ":"")+
    (m.missing.length?m.missing.length+" required skill"+(m.missing.length===1?" is":"s are")+" not listed. ":"No required skill is missing. ")+expNote;
  box.dataset.shown="1";
  box.innerHTML=
    '<span class="demo-tag">Demo prototype</span>'+
    '<h2 style="margin-top:10px">'+esc(cand.name)+' for '+esc(job.title)+'</h2>'+
    '<div class="score"><strong>'+m.pct+'%</strong><div class="bar" aria-hidden="true"><i style="width:'+m.pct+'%"></i></div><span class="meta">'+m.matched.length+' of '+job.skills.length+' required skills listed</span></div>'+
    '<h3>Matching skills (confirmed in résumé)</h3><div class="chips">'+chips(m.confirmed,"ok")+'</div>'+
    '<h3>Listed but not confirmed by the résumé</h3><div class="chips">'+chips(m.unconfirmed,"warn")+'</div>'+
    '<h3>Required skills not listed</h3><div class="chips">'+chips(m.missing,"bad")+'</div>'+
    '<h3>Explanation</h3><div class="explain">'+esc(summary)+'</div>'+
    '<h3>Suggested interview questions</h3><ul>'+questionsFor(job,cand,m).map(function(t){return '<li>'+esc(t)+'</li>'}).join("")+'</ul>'+
    '<h3>Update hiring stage</h3><div class="actions"><select id="match-stage" style="max-width:200px" aria-label="Hiring stage">'+STAGES.map(function(s){return '<option'+(s===cand.stage?' selected':'')+'>'+s+'</option>'}).join("")+'</select>'+
    '<button type="button" class="btn btn-primary" id="match-stage-save" data-cand="'+cand.id+'">Update stage</button>'+
    '<span id="match-stage-now">'+stagePill(cand.stage)+'</span></div>';
}
$("#match-run").addEventListener("click",runMatch);
$("#match-result").addEventListener("click",function(e){
  var b=e.target.closest("#match-stage-save");if(!b)return;
  var c=candById(b.dataset.cand);if(!c)return;
  c.stage=$("#match-stage").value;save();
  $("#match-stage-now").innerHTML=stagePill(c.stage);
  updateNav();toast(c.name+" moved to "+c.stage);
});

/* ---------- insights ---------- */
function countSkills(lists){
  var map={};
  lists.forEach(function(arr){arr.forEach(function(s){var k=norm(s);if(!map[k])map[k]={name:s,n:0};map[k].n++})});
  return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.n-a.n||a.name.localeCompare(b.name)});
}
function bars(items,max,alt){
  if(!items.length)return '<div class="meta">No data yet.</div>';
  return items.slice(0,8).map(function(it){
    return '<div class="bar-row'+(alt?' alt':'')+'"><span>'+esc(it.name)+'</span><div class="bar"><i style="width:'+Math.round(it.n/max*100)+'%"></i></div><b>'+it.n+'</b></div>';
  }).join("");
}
function renderInsights(){
  var d=countSkills(state.jobs.map(function(j){return j.skills})),s=countSkills(state.candidates.map(function(c){return c.skills}));
  $("#ins-demand").innerHTML=bars(d,d.length?d[0].n:1,false);
  $("#ins-supply").innerHTML=bars(s,s.length?s[0].n:1,true);
  var rows=state.jobs.map(function(j){
    var best=null;
    state.candidates.forEach(function(c){var m=compare(j,c);if(!best||m.pct>best.pct)best={c:c,pct:m.pct}});
    return '<tr><td>'+esc(j.title)+'</td><td>'+(best?esc(best.c.name):'–')+'</td><td>'+(best?best.pct+'%':'–')+'</td></tr>';
  }).join("");
  $("#ins-best").innerHTML='<thead><tr><th>Job</th><th>Candidate</th><th>Match</th></tr></thead><tbody>'+(rows||'<tr><td colspan="3" class="meta">No jobs yet.</td></tr>')+'</tbody>';
  var total=state.candidates.length;
  var late=state.candidates.filter(function(c){return ["Interview","Offer","Hired"].indexOf(c.stage)>-1}).length;
  var avg=total?(state.candidates.reduce(function(a,c){return a+c.exp},0)/total).toFixed(1):"0";
  var uncovered=d.filter(function(x){return !s.some(function(y){return norm(y.name)===norm(x.name)})}).map(function(x){return x.name});
  $("#ins-facts").innerHTML=
    '<div><b>'+late+' of '+total+' candidates</b><span class="meta">have reached Interview or later.</span></div>'+
    '<div><b>'+avg+' years</b><span class="meta">average experience across all candidates.</span></div>'+
    '<div><b>'+(uncovered.length?esc(uncovered.join(", ")):'None')+'</b><span class="meta">required skills that no candidate lists.</span></div>';
}

/* ---------- pipeline ---------- */
function renderPipeline(){
  var jf=$("#pipe-job-filter").value;
  var list=state.candidates.filter(function(c){return !jf||c.jobId===jf});
  $("#pipe-count").textContent=list.length+" candidate"+(list.length===1?"":"s")+" shown";
  $("#board").innerHTML=STAGES.map(function(s,i){
    var cs=list.filter(function(c){return c.stage===s});
    return '<div class="col" data-stage="'+s+'"><h2><i class="dot"></i>'+s+'<em>'+cs.length+'</em></h2>'+
      (cs.length?cs.map(function(c){
        var j=jobById(c.jobId),m=j?compare(j,c):null;
        return '<div class="item"><h3>'+esc(c.name)+'</h3><p class="meta">'+(j?esc(j.title):'No job')+' · '+c.exp+' yrs'+(m?' · '+m.pct+'%':'')+'</p>'+
          '<div class="move"><button type="button" class="btn btn-sm" data-move="'+c.id+'" data-dir="-1"'+(i===0?' disabled':'')+' aria-label="Move '+esc(c.name)+' back">←</button>'+
          '<button type="button" class="btn btn-sm" data-move="'+c.id+'" data-dir="1"'+(i===STAGES.length-1?' disabled':'')+' aria-label="Move '+esc(c.name)+' forward">→</button></div></div>';
      }).join(""):'<p class="meta">Nobody here.</p>')+'</div>';
  }).join("");
}
$("#pipe-job-filter").addEventListener("change",renderPipeline);
$("#board").addEventListener("click",function(e){
  var b=e.target.closest("button[data-move]");if(!b||b.disabled)return;
  var c=candById(b.dataset.move);if(!c)return;
  var i=STAGES.indexOf(c.stage)+Number(b.dataset.dir);
  if(i<0||i>=STAGES.length)return;
  c.stage=STAGES[i];save();renderAll();toast(c.name+" moved to "+c.stage);
});

/* ---------- shared ---------- */
function updateNav(){
  $("#nav-jobs").textContent=state.jobs.length;$("#nav-cands").textContent=state.candidates.length;
}
function refreshSelects(){
  var cj=$("#cand-job").value,cs=$("#cand-stage").value,cfj=$("#cand-job-filter").value,cfs=$("#cand-stage-filter").value,pj=$("#pipe-job-filter").value;
  fillSelect($("#cand-job"),jobOptions(),cj);
  fillSelect($("#cand-stage"),STAGES.map(function(s){return {v:s,t:s}}),cs||"New");
  fillSelect($("#cand-job-filter"),jobOptions("All jobs"),cfj);
  fillSelect($("#cand-stage-filter"),[{v:"",t:"All stages"}].concat(STAGES.map(function(s){return {v:s,t:s}})),cfs);
  fillSelect($("#pipe-job-filter"),jobOptions("All jobs"),pj);
}
function renderAll(){
  updateNav();refreshSelects();
  var v=currentView();
  if(v==="dashboard")renderDashboard();
  if(v==="jobs")renderJobs();
  if(v==="candidates")renderCandidates();
  if(v==="matching")renderMatching();
  if(v==="insights")renderInsights();
  if(v==="pipeline")renderPipeline();
}
$("#d-stages").addEventListener("click",function(e){
  var b=e.target.closest("[data-go]");if(!b)return;go("pipeline");
});
$("#reset-data").addEventListener("click",function(){
  var b=$("#reset-data");
  if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Press again to restore";setTimeout(function(){b.dataset.armed="";b.textContent="Restore sample data"},3000);return}
  b.dataset.armed="";b.textContent="Restore sample data";
  state=seed();save();resetJobForm();resetCandForm();$("#match-result").dataset.shown="";
  $("#match-result").innerHTML='<div class="empty">Pick a job and a candidate, then press Compare skills.</div>';
  renderAll();toast("Sample data restored");
});

route();
})();
