import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createJob, getCvs, getJobs, getMatchJob, startMatchJob, uploadCv } from "./api/cvmatchService";
import { getTurnstileToken } from "./utils/turnstile";
import AuthMenu from "./components/AuthMenu.jsx";
const t = {
  home: "V\u1ec1 trang ch\u1ee7",
  checker: "AI CV Checker",
  history: "L\u1ecbch s\u1eed",
  login: "\u0110\u0103ng nh\u1eadp",
  register: "\u0110\u0103ng k\u00fd",
  title: "\u0110\u00e1nh gi\u00e1 CV theo \u0111\u00fang v\u1ecb tr\u00ed tuy\u1ec3n d\u1ee5ng",
  intro: "T\u1ea3i h\u1ed3 s\u01a1 \u1ee9ng vi\u00ean v\u00e0 th\u00eam m\u00f4 t\u1ea3 c\u00f4ng vi\u1ec7c. TalentScan s\u1ebd ch\u1ea5m m\u1ee9c \u0111\u1ed9 ph\u00f9 h\u1ee3p, ch\u1ec9 ra b\u1eb1ng ch\u1ee9ng v\u00e0 g\u1ee3i \u00fd c\u00e2u h\u1ecfi ph\u1ecfng v\u1ea5n.",
  upload: "T\u1ea3i l\u00ean CV",
  uploadHelp: "PDF, t\u1ed1i \u0111a 5 MB m\u1ed7i t\u1ec7p",
  choose: "Ch\u1ecdn ho\u1eb7c k\u00e9o CV v\u00e0o \u0111\u00e2y",
  multi: "C\u00f3 th\u1ec3 t\u1ea3i nhi\u1ec1u \u1ee9ng vi\u00ean trong m\u1ed9t l\u1ea7n qu\u00e9t",
  reading: "\u0110ang \u0111\u1ecdc h\u1ed3 s\u01a1...",
  jd: "Th\u00eam m\u00f4 t\u1ea3 c\u00f4ng vi\u1ec7c",
  jdHelp: "JD c\u00e0ng r\u00f5, k\u1ebft qu\u1ea3 c\u00e0ng s\u00e1t",
  saved: "D\u00f9ng JD \u0111\u00e3 l\u01b0u",
  chooseJd: "Ch\u1ecdn m\u1ed9t JD",
  orPaste: "Ho\u1eb7c d\u00e1n JD m\u1edbi",
  placeholder: "D\u00e1n m\u00f4 t\u1ea3 v\u1ecb tr\u00ed, y\u00eau c\u1ea7u k\u1ef9 n\u0103ng v\u00e0 kinh nghi\u1ec7m t\u1ea1i \u0111\u00e2y...",
  start: "B\u1eaft \u0111\u1ea7u qu\u00e9t CV",
  preparing: "\u0110ang chu\u1ea9n b\u1ecb JD...",
  report: "B\u00e1o c\u00e1o \u1ee9ng vi\u00ean",
  fit: "M\u1ee9c \u0111\u1ed9 ph\u00f9 h\u1ee3p",
  strengths: "6 \u0111i\u1ec3m m\u1ea1nh - 3 \u0111i\u1ec3m c\u1ea7n x\u00e1c minh",
  good1: "Kinh nghi\u1ec7m backend ph\u00f9 h\u1ee3p",
  good2: "C\u00f3 b\u1eb1ng ch\u1ee9ng tri\u1ec3n khai th\u1ef1c t\u1ebf",
  warn: "C\u1ea7n h\u1ecfi th\u00eam v\u1ec1 CI/CD",
  analyzing: "\u0110ang ph\u00e2n t\u00edch h\u1ed3 s\u01a1...",
  analyzingText: "AI \u0111ang \u0111\u1ecdc JD, \u0111\u1ed1i chi\u1ebfu k\u1ef9 n\u0103ng v\u00e0 t\u00ecm b\u1eb1ng ch\u1ee9ng trong t\u1eebng CV.",
  wait: "Qu\u00e1 tr\u00ecnh n\u00e0y c\u00f3 th\u1ec3 m\u1ea5t 1-2 ph\u00fat. Vui l\u00f2ng gi\u1eef trang \u0111ang m\u1edf.",
  needCv: "H\u00e3y t\u1ea3i l\u00ean \u00edt nh\u1ea5t m\u1ed9t CV PDF.",
  needJd: "H\u00e3y d\u00e1n m\u00f4 t\u1ea3 c\u00f4ng vi\u1ec7c ho\u1eb7c ch\u1ecdn m\u1ed9t JD \u0111\u00e3 l\u01b0u.",
  failed: "Kh\u00f4ng th\u1ec3 ho\u00e0n t\u1ea5t ph\u00e2n t\u00edch. Vui l\u00f2ng th\u1eed l\u1ea1i."
};
const sleep=(ms)=>new Promise(r=>window.setTimeout(r,ms));
function Icon({name,size=20}){const d=name==="upload"?["M12 16V4","m7 9 5-5 5 5","M5 20h14"]:name==="doc"?["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]:["M12 3v18","M3 12h18","M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18","M12 12l5-5"];return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d.map(x=><path d={x} key={x}/>)}</svg>}
export default function ScanFlow(){const navigate=useNavigate();const[jobs,setJobs]=useState([]),[cvs,setCvs]=useState([]),[jobId,setJobId]=useState(""),[jd,setJd]=useState(""),[working,setWorking]=useState(""),[error,setError]=useState(""),[task,setTask]=useState(null);useEffect(()=>{Promise.all([getJobs(),getCvs()]).then(([j,c])=>{setJobs(j);setCvs(c);setJobId(j[0]?.id||"")}).catch(()=>{})},[]);async function addCvs(e){const files=[...(e.target.files||[])];e.target.value="";if(!files.length)return;setWorking("upload");setError("");try{for(const f of files){const token=await getTurnstileToken("upload_cv");await uploadCv(f,token)}setCvs(await getCvs())}catch(x){setError(x?.response?.data?.detail||x?.message||t.failed)}finally{setWorking("")}}async function run(){if(!cvs.length){setError(t.needCv);return}let target=jobId;setError("");try{if(jd.trim()){setWorking("job");const created=await createJob({raw_text:jd});target=created.id;setJobId(target)}if(!target){setError(t.needJd);setWorking("");return}setWorking("matching");let next=await startMatchJob(target,{top_k:1000});setTask(next);for(let i=0;i<70&&!['completed','failed'].includes(next.status);i+=1){await sleep(650);next=await getMatchJob(next.id);setTask(next)}if(next.status!=="completed")throw new Error(next.error||t.failed);navigate("/workspace",{replace:true})}catch(x){setError(x?.response?.data?.detail||x?.message||t.failed);setWorking("")}}const progress=Math.max(8,Math.min(96,Number(task?.progress||0)*100||18)),ready=cvs.length>0&&(jd.trim()||jobId);return <div className="checker-flow setup-mode"><header className="checker-topbar"><Link className="brand-mark" to="/" title={t.home}><span><Icon name="radar"/></span><div><strong>TalentScan</strong><small>{t.checker}</small></div></Link><nav className="checker-actions"><Link className="topbar-link" to="/workspace"><Icon name="doc" size={18}/>{t.history}</Link><AuthMenu/></nav></header><main className="scan-stage">{error&&<div className="notice error" role="alert">{error}</div>}<section className="scan-composer"><div className="scan-copy"><p className="eyebrow">{t.checker}</p><h1>{t.title}</h1><p>{t.intro}</p><div className="scan-field"><header><span>1</span><div><h2>{t.upload}</h2><small>{t.uploadHelp}</small></div></header><label className="scan-upload"><input type="file" accept="application/pdf" multiple onChange={addCvs}/><Icon name="upload" size={28}/><strong>{working==="upload"?t.reading:t.choose}</strong><span>{t.multi}</span></label>{cvs.length>0&&<div className="scan-files">{cvs.slice(0,4).map(cv=><div className="scan-file-static" key={cv.id}><b>PDF</b><span><strong>{cv.extracted_data?.candidate_name||cv.filename}</strong><small>{cv.filename}</small></span></div>)}</div>}</div><div className="scan-field"><header><span>2</span><div><h2>{t.jd}</h2><small>{t.jdHelp}</small></div></header>{jobs.length>0&&<label className="saved-job-select">{t.saved}<select value={jobId} onChange={e=>setJobId(e.target.value)}><option value="">{t.chooseJd}</option>{jobs.map(j=><option value={j.id} key={j.id}>{j.title}</option>)}</select></label>}<label className="jd-compose"><span>{t.orPaste}</span><textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder={t.placeholder}/></label></div><button className="scan-submit" type="button" onClick={run} disabled={!ready||Boolean(working)}><Icon name="radar"/>{working==="job"?t.preparing:t.start}</button></div><aside className="scan-preview" aria-label={t.report}><div className="preview-window"><header><span/><span/><span/><b>{t.report}</b></header><div className="preview-report"><div className="preview-score-ring"><strong>82</strong><small>/100</small></div><div><small>{t.fit}</small><h3>Backend Engineer</h3><p>{t.strengths}</p></div></div><div className="preview-findings"><p>{t.good1}</p><p>{t.good2}</p><p className="warn">{t.warn}</p></div></div></aside></section>{working==="matching"&&<div className="scan-modal-backdrop"><section className="scan-modal" role="dialog" aria-modal="true"><span className="scan-document"><Icon name="doc" size={30}/></span><h2>{t.analyzing}</h2><p>{t.analyzingText}</p><div className="scan-progress"><span style={{width:progress+"%"}}/></div><small>{t.wait}</small></section></div>}</main></div>}
