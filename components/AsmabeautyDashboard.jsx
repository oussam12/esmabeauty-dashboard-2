
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Plus, Trash2, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const AB = { black:"#000000", rosePoudre:"#F5E8E7", roseNude:"#F4E7E7" };

const CAT_PRESTATIONS = [
  "Extensions de cils : Pose cil à cil",
  "Extensions de cils : poses légères",
  "Extensions de cils : pose volume russe",
  "Extensions de cils : Pose Liner & Fox eyes",
  "Extensions de cils : pose signature Esma beauty",
  "Suppléments aux extensions de cils",
  "Déposes",
];

const CAT_DEPENSES = [
  "loyer","facture electricité","facture internet","telephone","fournisseur cil",
  "materiel","logiciel planity","canva pro","capcut pro","chatgpt","icloud stockage",
  "meta ads","meta verified","autres"
];

const LS_KEY = "asmabeauty-data-v1";
const fmt€ = (n)=> (n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});

const startOfDay=(d)=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const endOfDay=(d)=>{const x=new Date(d);x.setHours(23,59,59,999);return x;};
const startOfMonth=(d)=>{const x=new Date(d.getFullYear(), d.getMonth(), 1);x.setHours(0,0,0,0);return x;};
const endOfMonth=(d)=>{const x=new Date(d.getFullYear(), d.getMonth()+1, 0);x.setHours(23,59,59,999);return x;};
const startOfYear=(d)=>{const x=new Date(d.getFullYear(), 0, 1);x.setHours(0,0,0,0);return x;};
const endOfYear=(d)=>{const x=new Date(d.getFullYear(), 11, 31);x.setHours(23,59,59,999);return x;};

export default function AsmabeautyDashboard(){
  const [data, setData] = useState(()=>{
    try{ const raw=localStorage.getItem(LS_KEY); return raw? JSON.parse(raw):{prestations:[], depenses:[]}; }
    catch{ return {prestations:[], depenses:[]}; }
  });
  useEffect(()=>{ localStorage.setItem(LS_KEY, JSON.stringify(data)); }, [data]);

  const [vue, setVue] = useState("mois");
  const [dateRef, setDateRef] = useState(()=> new Date());
  const periode = useMemo(()=>{
    const d=dateRef;
    if(vue==="jour") return {from:startOfDay(d),to:endOfDay(d), label:d.toLocaleDateString("fr-FR")};
    if(vue==="mois") return {from:startOfMonth(d),to:endOfMonth(d), label:d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})};
    return {from:startOfYear(d),to:endOfYear(d), label:String(d.getFullYear())};
  },[vue,dateRef]);
  const inPeriode = (iso)=>{ const t=new Date(iso).getTime(); return t>=periode.from.getTime() && t<=periode.to.getTime(); };

  const prestationsPeriode = useMemo(()=> data.prestations.filter(p=> inPeriode(p.date)), [data.prestations,periode]);
  const depensesPeriode = useMemo(()=> data.depenses.filter(d=> inPeriode(d.date)), [data.depenses,periode]);

  const caTotal = useMemo(()=> prestationsPeriode.reduce((s,p)=> s + (p.montant||0), 0), [prestationsPeriode]);
  const nbPrestations = prestationsPeriode.length;
  const panierMoyen = nbPrestations? caTotal/nbPrestations:0;
  const chargesVariables = depensesPeriode.filter(d=> d.variable).reduce((s,d)=> s+d.montant, 0);
  const margeNette = caTotal - chargesVariables;

  const {prevLabel, prevCA} = useMemo(()=>{
    if(vue!=="mois") return {prevLabel:null, prevCA:null};
    const prev = new Date(dateRef.getFullYear(), dateRef.getMonth()-1, 15);
    const from = startOfMonth(prev).getTime(); const to = endOfMonth(prev).getTime();
    const ca = data.prestations.filter(p=>{ const t=new Date(p.date).getTime(); return t>=from && t<=to; }).reduce((s,p)=>s+(p.montant||0),0);
    return { prevLabel: prev.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}), prevCA: ca };
  },[vue,dateRef,data.prestations]);
  const caDeltaPct = useMemo(()=>{
    if(prevCA==null) return null;
    if(prevCA===0) return caTotal>0?100:0;
    return ((caTotal - prevCA)/prevCA)*100;
  },[caTotal,prevCA]);

  const repartition = useMemo(()=>{
    const map=new Map();
    prestationsPeriode.forEach(p=> map.set(p.categorie,(map.get(p.categorie)||0)+p.montant));
    const total = Array.from(map.values()).reduce((s,v)=>s+v,0)||1;
    return Array.from(map.entries()).map(([name,value])=>({name,value,pct:Math.round((value/total)*100)}));
  },[prestationsPeriode]);

  const tauxRecurrence = useMemo(()=>{
    const byClient=new Map();
    data.prestations.forEach(p=>{
      const c=p.client||{};
      const key=(c.email||"")+"|"+(c.telephone||"")+"|"+(c.nom||"")+"|"+(c.prenom||"");
      if(!byClient.has(key)) byClient.set(key,[]);
      byClient.get(key).push(new Date(p.date).getTime());
    });
    let rec=0, tot=0;
    byClient.forEach(arr=>{
      arr.sort((a,b)=>a-b); tot+=1;
      for(let i=1;i<arr.length;i++){ const d=Math.abs(arr[i]-arr[i-1])/(1000*60*60*24); if(d>=21 && d<=35){rec+=1; break;} }
    });
    return tot? Math.round((rec/tot)*100):0;
  },[data.prestations]);

  const serieCA = useMemo(()=>{
    const map=new Map();
    prestationsPeriode.forEach(p=>{
      const d=new Date(p.date);
      let key=d.toLocaleDateString("fr-FR");
      if(vue==="annee") key=d.toLocaleDateString("fr-FR",{month:"short"});
      if(vue==="mois") key=String(d.getDate());
      map.set(key,(map.get(key)||0)+p.montant);
    });
    return Array.from(map.entries()).map(([name, montant])=>({name, montant}));
  },[prestationsPeriode, vue]);

  const [formP,setFormP]=useState({date:new Date().toISOString(), nom:"",prenom:"",adresse:"",email:"",telephone:"",categorie:CAT_PRESTATIONS[0],montant:"",commentaire:""});
  const [formD,setFormD]=useState({date:new Date().toISOString(), categorie:CAT_DEPENSES[0], montant:"", commentaire:"", variable:true});

  const addPrestation=(e)=>{e.preventDefault();
    const v={id:crypto.randomUUID?.()||Math.random().toString(36).slice(2), date:formP.date, client:{nom:formP.nom,prenom:formP.prenom,adresse:formP.adresse,email:formP.email,telephone:formP.telephone}, categorie:formP.categorie, montant:parseFloat(formP.montant||"0"), commentaire:formP.commentaire};
    setData(d=>({...d, prestations:[v,...d.prestations]})); setFormP({...formP, montant:"", commentaire:""});
  };
  const addDepense=(e)=>{e.preventDefault();
    const v={id:crypto.randomUUID?.()||Math.random().toString(36).slice(2), date:formD.date, categorie:formD.categorie, montant:parseFloat(formD.montant||"0"), commentaire:formD.commentaire, variable:!!formD.variable};
    setData(d=>({...d, depenses:[v,...d.depenses]})); setFormD({...formD, montant:"", commentaire:""});
  };
  const delP=(id)=> setData(d=>({...d, prestations:d.prestations.filter(p=>p.id!==id)}));
  const delD=(id)=> setData(d=>({...d, depenses:d.depenses.filter(p=>p.id!==id)}));

  const exportCSV=()=>{
    const rows=[["type","date","categorie","montant","nom","prenom","adresse","email","telephone","commentaire","variable"],
      ...data.prestations.map(p=>["prestation",p.date,p.categorie,p.montant,p.client?.nom||"",p.client?.prenom||"",p.client?.adresse||"",p.client?.email||"",p.client?.telephone||"",p.commentaire||"",""]),
      ...data.depenses.map(d=>["depense",d.date,d.categorie,d.montant,"","","","","",d.commentaire||"",d.variable?"oui":"non"])
    ];
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`asmabeauty_export_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/asmabeauty-logo.svg" alt="Asmabeauty" className="h-10 w-auto rounded-xl" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Asmabeauty – Tableau de bord</h1>
            <p className="text-sm text-zinc-600">Ventes, dépenses & KPI</p>
          </div>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </header>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex rounded-2xl border border-zinc-200 p-1">
            {["jour","mois","annee"].map(v=>(
              <button key={v} onClick={()=>setVue(v)} className={`px-3 py-1.5 rounded-xl text-sm ${vue===v? "bg-black text-white":"hover:bg-zinc-50"}`}>
                {v==="jour"?"Jour":v==="mois"?"Mois":"Année"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium">Période :</span>
            <span>{periode.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={()=> setDateRef(new Date())} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50">Aujourd'hui</button>
            <button onClick={()=> setDateRef(new Date(dateRef.getFullYear(), dateRef.getMonth() - (vue==="annee"?12:vue==="mois"?1:0), dateRef.getDate() - (vue==="jour"?1:0))) } className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50">◀</button>
            <button onClick={()=> setDateRef(new Date(dateRef.getFullYear(), dateRef.getMonth() + (vue==="annee"?12:vue==="mois"?1:0), dateRef.getDate() + (vue==="jour"?1:0))) } className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50">▶</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {title:`CA ${vue==='mois'?'du mois':'de la période'}`, value:fmt€(caTotal), extra:(prevCA!=null?`vs ${prevLabel}: ${Math.round(caDeltaPct)}%`:null)},
          {title:"Nombre de prestations", value:nbPrestations, extra:"Total enregistré(s)"},
          {title:"Panier moyen", value:fmt€(panierMoyen), extra:"CA ÷ nb prestations"},
          {title:"Marge nette (période)", value:fmt€(margeNette), extra:"Recettes – charges variables"},
        ].map((k,i)=>(
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-zinc-500">{k.title}</div>
            <div className="mt-1 text-3xl font-semibold text-black">{k.value}</div>
            {k.extra && <div className="mt-1 text-sm text-zinc-500">{k.extra}</div>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2 font-medium">Évolution du CA ({periode.label})</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieCA}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v)=> fmt€(Number(v))} />
                <Bar dataKey="montant" radius={[8,8,0,0]} fill={AB.black} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 font-medium">Répartition par prestation</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={repartition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {repartition.map((_,i)=>(<Cell key={i} fill={["#000000","#1f2937","#F4E7E7","#F5E8E7","#9ca3af","#d1d5db","#e5e7eb"][i % 7]} />))}
                </Pie>
                <Tooltip formatter={(v, n, p)=> [fmt€(Number(v)), p?.payload?.name]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-medium">Taux de récurrence des clientes (3–4 semaines)</div>
          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-[#F5E8E7] px-2.5 py-0.5 text-base">{tauxRecurrence}%</span>
        </div>
        <p className="mt-2 text-sm text-zinc-600">Basé sur les retours entre 21 et 35 jours pour une même cliente (email/téléphone/nom).</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-lg font-semibold">Ajouter une prestation</div>
          <form onSubmit={addPrestation} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Date</label>
                <input type="datetime-local" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={new Date(formP.date).toISOString().slice(0,16)} onChange={(e)=> setFormP({ ...formP, date: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Catégorie</label>
                <select className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={formP.categorie} onChange={(e)=> setFormP({ ...formP, categorie:e.target.value })}>
                  {CAT_PRESTATIONS.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Montant</label>
                <input type="number" step="0.01" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={formP.montant} onChange={(e)=> setFormP({ ...formP, montant:e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Commentaire</label>
                <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={formP.commentaire} onChange={(e)=> setFormP({ ...formP, commentaire:e.target.value })} placeholder="Optionnel" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1 block text-xs font-medium text-zinc-600">Nom</label><input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm" value={formP.nom} onChange={(e)=> setFormP({ ...formP, nom:e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-600">Prénom</label><input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm" value={formP.prenom} onChange={(e)=> setFormP({ ...formP, prenom:e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-600">Adresse</label><input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm" value={formP.adresse} onChange={(e)=> setFormP({ ...formP, adresse:e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-600">Email</label><input type="email" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm" value={formP.email} onChange={(e)=> setFormP({ ...formP, email:e.target.value })} /></div>
              <div className="md:col-span-2"><label className="mb-1 block text-xs font-medium text-zinc-600">Téléphone</label><input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm" value={formP.telephone} onChange={(e)=> setFormP({ ...formP, telephone:e.target.value })} /></div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-2 text-sm font-medium text-white hover:bg-zinc-900">
                <Plus className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-lg font-semibold">Ajouter une dépense</div>
          <form onSubmit={addDepense} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Date</label>
                <input type="datetime-local" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={new Date(formD.date).toISOString().slice(0,16)} onChange={(e)=> setFormD({ ...formD, date: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Catégorie</label>
                <select className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={formD.categorie} onChange={(e)=> setFormD({ ...formD, categorie:e.target.value })}>
                  {CAT_DEPENSES.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Montant</label>
                <input type="number" step="0.01" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={formD.montant} onChange={(e)=> setFormD({ ...formD, montant:e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Commentaire</label>
                <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm"
                  value={formD.commentaire} onChange={(e)=> setFormD({ ...formD, commentaire:e.target.value })} placeholder="Optionnel" />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" className="h-4 w-4" checked={!!formD.variable} onChange={(e)=> setFormD({ ...formD, variable:e.target.checked })} />
                Charge variable (comptée dans la marge)
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-2 text-sm font-medium text-white hover:bg-zinc-900">
                <Plus className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-semibold">Prestations ({prestationsPeriode.length})</div>
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-[#F5E8E7] px-2.5 py-0.5 text-xs">{fmt€(caTotal)}</span>
          </div>
          <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#F4E7E7] text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {prestationsPeriode.sort((a,b)=> new Date(b.date)-new Date(a.date)).map(p=> (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{new Date(p.date).toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2">{p.client.prenom} {p.client.nom}<div className="text-xs text-zinc-500">{p.client.telephone}</div></td>
                    <td className="px-3 py-2">{p.categorie}</td>
                    <td className="px-3 py-2 font-medium">{fmt€(p.montant)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={()=> delP(p.id)} className="text-rose-600 hover:underline" title="Supprimer">
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-semibold">Dépenses ({depensesPeriode.length})</div>
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-[#F4E7E7] px-2.5 py-0.5 text-xs">
              {fmt€(depensesPeriode.reduce((s,d)=> s + d.montant, 0))}
            </span>
          </div>
          <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#F5E8E7] text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Variable</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {depensesPeriode.sort((a,b)=> new Date(b.date)-new Date(a.date)).map(d=> (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2">{new Date(d.date).toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2">{d.categorie}</td>
                    <td className="px-3 py-2 font-medium">{fmt€(d.montant)}</td>
                    <td className="px-3 py-2">{d.variable? <span className="inline-flex items-center rounded-full border border-zinc-200 bg-[#F5E8E7] px-2.5 py-0.5 text-xs">Oui</span> : <span className="inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs">Non</span>}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={()=> delD(d.id)} className="text-rose-600 hover:underline" title="Supprimer">
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-zinc-400">
        Design Asmabeauty — Noir & Roses poudrés • Données locales (navigateur)
      </footer>
    </div>
  );
}
