import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Plus, Trash2, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// --- Utils ---
const CURRENCY = "€";

function fmtCurrency(n) {
  return (n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfYear(d) {
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfYear(d) {
  const x = new Date(d.getFullYear(), 11, 31);
  x.setHours(23, 59, 59, 999);
  return x;
}

// --- Catégories ---
const CATEGORIES_PRESTATIONS = [
  "Extensions de cils : Pose cil à cil",
  "Extensions de cils : poses légères",
  "Extensions de cils : pose volume russe",
  "Extensions de cils : Pose Liner & Fox eyes",
  "Extensions de cils : pose signature Esma beauty",
  "Suppléments aux extensions de cils",
  "Déposes",
];

const CATEGORIES_DEPENSES = [
  "loyer",
  "facture electricité",
  "facture internet",
  "telephone",
  "fournisseur cil",
  "materiel",
  "logiciel planity",
  "canva pro",
  "capcut pro",
  "chatgpt",
  "icloud stockage",
  "meta ads",
  "meta verified",
  "autres",
];

// --- Local Storage Helpers ---
const LS_KEY = "asmabeauty-dashboard-v1";
function loadLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { prestations: [], depenses: [] };
  } catch {
    return { prestations: [], depenses: [] };
  }
}
function saveLS(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// --- Types (JSDoc only) ---
/** @typedef {{ id:string, date:string, client:{nom:string, prenom:string, adresse?:string, email?:string, telephone?:string}, categorie:string, montant:number, commentaire?:string }} Prestation */
/** @typedef {{ id:string, date:string, categorie:string, montant:number, commentaire?:string, variable:boolean }} Depense */

// --- Main Component ---
export default function AsmabeautyDashboard() {
  const [{ prestations, depenses }, setData] = useState(loadLS());

  useEffect(() => {
    saveLS({ prestations, depenses });
  }, [prestations, depenses]);

  // Filtres d'affichage
  const [vue, setVue] = useState("mois"); // jour | mois | annee
  const [dateRef, setDateRef] = useState(() => new Date());

  const periode = useMemo(() => {
    const d = dateRef;
    if (vue === "jour") return { from: startOfDay(d), to: endOfDay(d), label: d.toLocaleDateString("fr-FR") };
    if (vue === "mois") return { from: startOfMonth(d), to: endOfMonth(d), label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) };
    return { from: startOfYear(d), to: endOfYear(d), label: d.getFullYear().toString() };
  }, [vue, dateRef]);

  const inPeriode = (iso) => {
    const t = new Date(iso).getTime();
    return t >= periode.from.getTime() && t <= periode.to.getTime();
  };

  const prestationsPeriode = useMemo(() => prestations.filter(p => inPeriode(p.date)), [prestations, periode]);
  const depensesPeriode = useMemo(() => depenses.filter(d => inPeriode(d.date)), [depenses, periode]);

  // --- KPIs ---
  const caTotal = useMemo(() => prestationsPeriode.reduce((s, p) => s + (p.montant || 0), 0), [prestationsPeriode]);
  const nbPrestations = prestationsPeriode.length;
  const panierMoyen = nbPrestations ? caTotal / nbPrestations : 0;
  const chargesVariables = depensesPeriode.filter(d => d.variable).reduce((s, d) => s + d.montant, 0);
  const margeNette = caTotal - chargesVariables;

  // CA mois précédent (pour comparaison)
  const { prevLabel, prevCA } = useMemo(() => {
    if (vue !== "mois") return { prevLabel: null, prevCA: null };
    const prev = new Date(dateRef.getFullYear(), dateRef.getMonth() - 1, 15);
    const from = startOfMonth(prev).getTime();
    const to = endOfMonth(prev).getTime();
    const ca = prestations
      .filter(p => {
        const t = new Date(p.date).getTime();
        return t >= from && t <= to;
      })
      .reduce((s, p) => s + (p.montant || 0), 0);
    const label = prev.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { prevLabel: label, prevCA: ca };
  }, [vue, dateRef, prestations]);

  const caDeltaPct = useMemo(() => {
    if (prevCA == null) return null;
    if (prevCA === 0) return caTotal > 0 ? 100 : 0;
    return ((caTotal - prevCA) / prevCA) * 100;
  }, [caTotal, prevCA]);

  // Répartition ventes par prestation
  const repartition = useMemo(() => {
    const map = new Map();
    prestationsPeriode.forEach(p => map.set(p.categorie, (map.get(p.categorie) || 0) + p.montant));
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
    return Array.from(map.entries()).map(([categorie, montant]) => ({
      name: categorie,
      value: montant,
      pct: Math.round((montant / total) * 100),
    }));
  }, [prestationsPeriode]);

  // Taux de récurrence des clientes (revenues dans 3-4 semaines)
  const tauxRecurrence = useMemo(() => {
    // Principe: pour chaque cliente (email+tel+nom), si elle a >1 prestation et deux prestations espacées de 21 à 35 jours, on compte comme "récurrente".
    const byClient = new Map();
    prestations.forEach(p => {
      const key = (p.client?.email || "") + "|" + (p.client?.telephone || "") + "|" + (p.client?.nom || "") + "|" + (p.client?.prenom || "");
      if (!byClient.has(key)) byClient.set(key, []);
      byClient.get(key).push(new Date(p.date).getTime());
    });
    let recurrentes = 0;
    let totalClients = 0;
    byClient.forEach(times => {
      times.sort((a, b) => a - b);
      totalClients += 1;
      for (let i = 1; i < times.length; i++) {
        const diffDays = Math.abs(times[i] - times[i - 1]) / (1000 * 60 * 60 * 24);
        if (diffDays >= 21 && diffDays <= 35) {
          recurrentes += 1;
          break;
        }
      }
    });
    if (totalClients === 0) return 0;
    return Math.round((recurrentes / totalClients) * 100);
  }, [prestations]);

  // Séries temporelles (CA par jour pour la vue sélectionnée)
  const serieCA = useMemo(() => {
    const map = new Map();
    prestationsPeriode.forEach(p => {
      const d = new Date(p.date);
      let key = d.toLocaleDateString("fr-FR");
      if (vue === "annee") key = d.toLocaleDateString("fr-FR", { month: "short" });
      if (vue === "mois") key = d.getDate().toString();
      map.set(key, (map.get(key) || 0) + p.montant);
    });
    return Array.from(map.entries()).map(([name, montant]) => ({ name, montant }));
  }, [prestationsPeriode, vue]);

  // --- Form state ---
  const [formP, setFormP] = useState({
    date: new Date().toISOString(),
    nom: "",
    prenom: "",
    adresse: "",
    email: "",
    telephone: "",
    categorie: CATEGORIES_PRESTATIONS[0],
    montant: "",
    commentaire: "",
  });

  const [formD, setFormD] = useState({
    date: new Date().toISOString(),
    categorie: CATEGORIES_DEPENSES[0],
    montant: "",
    commentaire: "",
    variable: true,
  });

  function addPrestation(e) {
    e.preventDefault();
    const val = {
      id: crypto.randomUUID(),
      date: formP.date,
      client: {
        nom: formP.nom,
        prenom: formP.prenom,
        adresse: formP.adresse,
        email: formP.email,
        telephone: formP.telephone,
      },
      categorie: formP.categorie,
      montant: parseFloat(formP.montant || 0),
      commentaire: formP.commentaire,
    };
    setData((d) => ({ ...d, prestations: [val, ...d.prestations] }));
    setFormP({
      ...formP,
      montant: "",
      commentaire: "",
    });
  }

  function addDepense(e) {
    e.preventDefault();
    const val = {
      id: crypto.randomUUID(),
      date: formD.date,
      categorie: formD.categorie,
      montant: parseFloat(formD.montant || 0),
      commentaire: formD.commentaire,
      variable: !!formD.variable,
    };
    setData((d) => ({ ...d, depenses: [val, ...d.depenses] }));
    setFormD({ ...formD, montant: "", commentaire: "" });
  }

  function deletePrestation(id) {
    setData((d) => ({ ...d, prestations: d.prestations.filter((p) => p.id !== id) }));
  }
  function deleteDepense(id) {
    setData((d) => ({ ...d, depenses: d.depenses.filter((p) => p.id !== id) }));
  }

  // Export CSV rapide
  function exportCSV() {
    const rows = [
      ["type", "date", "categorie", "montant", "nom", "prenom", "adresse", "email", "telephone", "commentaire", "variable"],
      ...prestations.map(p => ["prestation", p.date, p.categorie, p.montant, p.client.nom, p.client.prenom, p.client.adresse, p.client.email, p.client.telephone, p.commentaire, ""]).concat(
        depenses.map(d => ["depense", d.date, d.categorie, d.montant, "", "", "", "", "", d.commentaire, d.variable ? "oui" : "non"]) 
      )
    ];
    const csv = rows.map(r => r.map(v => `"${(v ?? "").toString().replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asmabeauty_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Palette chic pour camembert
  const PIE_COLORS = [
    "#111827",
    "#4B5563",
    "#6B7280",
    "#9CA3AF",
    "#D1D5DB",
    "#E5E7EB",
    "#F3F4F6",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Asmabeauty – Tableau de bord</h1>
            <p className="text-sm text-zinc-500">Suivez vos ventes, dépenses & KPI en un clin d'œil.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </header>

        {/* Contrôles de période */}
        <Card className="mb-6 border-zinc-200 shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <Tabs value={vue} onValueChange={setVue} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="jour">Jour</TabsTrigger>
                <TabsTrigger value="mois">Mois</TabsTrigger>
                <TabsTrigger value="annee">Année</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
              <CalendarIcon className="h-4 w-4" />
              <span className="font-medium">Période :</span>
              <span>{periode.label}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={() => setDateRef(new Date())}>Aujourd'hui</Button>
              <Button variant="outline" onClick={() => setDateRef(new Date(dateRef.getFullYear(), dateRef.getMonth() - (vue === 'annee' ? 12 : vue === 'mois' ? 1 : 0), dateRef.getDate() - (vue === 'jour' ? 1 : 0)))}>◀</Button>
              <Button variant="outline" onClick={() => setDateRef(new Date(dateRef.getFullYear(), dateRef.getMonth() + (vue === 'annee' ? 12 : vue === 'mois' ? 1 : 0), dateRef.getDate() + (vue === 'jour' ? 1 : 0)))}>▶</Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-zinc-500">CA {vue === 'mois' ? 'du mois' : 'de la période'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{fmtCurrency(caTotal)}</div>
              {prevCA != null && (
                <p className="mt-1 text-sm text-zinc-500">
                  vs {prevLabel}: <span className={caDeltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {caDeltaPct >= 0 ? '+' : ''}{Math.round(caDeltaPct)}%
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-zinc-500">Nombre de prestations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{nbPrestations}</div>
              <p className="mt-1 text-sm text-zinc-500">{nbPrestations === 0 ? 'Aucune prestation' : 'Total enregistré(s)'} </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-zinc-500">Panier moyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{fmtCurrency(panierMoyen)}</div>
              <p className="mt-1 text-sm text-zinc-500">CA ÷ nb prestations</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-zinc-500">Marge nette (période)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{fmtCurrency(margeNette)}</div>
              <p className="mt-1 text-xs text-zinc-500">Recettes – <Badge variant="outline">charges variables</Badge></p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Évolution du CA ({periode.label})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serieCA}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => fmtCurrency(v)} />
                  <Bar dataKey="montant" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Répartition par prestation</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={repartition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {repartition.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [fmtCurrency(v), p?.payload?.name]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Taux de récurrence */}
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">Taux de récurrence des clientes (3–4 semaines)
              <Badge variant="secondary" className="text-base">{tauxRecurrence}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Basé sur les retours entre 21 et 35 jours pour une même cliente (email/téléphone/nom). Plus vous saisissez d'informations, plus le calcul est précis.</p>
          </CardContent>
        </Card>

        {/* Saisie */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ajouter une prestation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addPrestation} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Date</Label>
                    <Input type="datetime-local" value={new Date(formP.date).toISOString().slice(0,16)} onChange={(e) => setFormP({ ...formP, date: new Date(e.target.value).toISOString() })} />
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={formP.categorie} onValueChange={(v) => setFormP({ ...formP, categorie: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES_PRESTATIONS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Montant</Label>
                    <Input type="number" step="0.01" value={formP.montant} onChange={(e) => setFormP({ ...formP, montant: e.target.value })} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Commentaire</Label>
                    <Input value={formP.commentaire} onChange={(e) => setFormP({ ...formP, commentaire: e.target.value })} placeholder="Optionnel" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nom</Label>
                    <Input value={formP.nom} onChange={(e) => setFormP({ ...formP, nom: e.target.value })} />
                  </div>
                  <div>
                    <Label>Prénom</Label>
                    <Input value={formP.prenom} onChange={(e) => setFormP({ ...formP, prenom: e.target.value })} />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input value={formP.adresse} onChange={(e) => setFormP({ ...formP, adresse: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formP.email} onChange={(e) => setFormP({ ...formP, email: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Téléphone</Label>
                    <Input value={formP.telephone} onChange={(e) => setFormP({ ...formP, telephone: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="rounded-2xl px-6"> <Plus className="mr-2 h-4 w-4"/> Enregistrer</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ajouter une dépense</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addDepense} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Date</Label>
                    <Input type="datetime-local" value={new Date(formD.date).toISOString().slice(0,16)} onChange={(e) => setFormD({ ...formD, date: new Date(e.target.value).toISOString() })} />
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={formD.categorie} onValueChange={(v) => setFormD({ ...formD, categorie: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES_DEPENSES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Montant</Label>
                    <Input type="number" step="0.01" value={formD.montant} onChange={(e) => setFormD({ ...formD, montant: e.target.value })} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Commentaire</Label>
                    <Input value={formD.commentaire} onChange={(e) => setFormD({ ...formD, commentaire: e.target.value })} placeholder="Optionnel" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="variable" checked={formD.variable} onCheckedChange={(v) => setFormD({ ...formD, variable: v })} />
                    <Label htmlFor="variable">Charge variable (comptée dans la marge)</Label>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="rounded-2xl px-6"> <Plus className="mr-2 h-4 w-4"/> Enregistrer</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tables récap */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Prestations ({prestationsPeriode.length})</CardTitle>
              <Badge variant="outline">{fmtCurrency(caTotal)}</Badge>
            </CardHeader>
            <CardContent>
              {prestationsPeriode.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune prestation sur cette période.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Client</th>
                        <th className="px-3 py-2 font-medium">Catégorie</th>
                        <th className="px-3 py-2 font-medium">Montant</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {prestationsPeriode.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2">{new Date(p.date).toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2">{p.client.prenom} {p.client.nom}<div className="text-xs text-zinc-500">{p.client.telephone}</div></td>
                          <td className="px-3 py-2">{p.categorie}</td>
                          <td className="px-3 py-2 font-medium">{fmtCurrency(p.montant)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => deletePrestation(p.id)} title="Supprimer">
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Dépenses ({depensesPeriode.length})</CardTitle>
              <Badge variant="outline">{fmtCurrency(depensesPeriode.reduce((s,d)=>s+d.montant,0))}</Badge>
            </CardHeader>
            <CardContent>
              {depensesPeriode.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune dépense sur cette période.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Catégorie</th>
                        <th className="px-3 py-2 font-medium">Montant</th>
                        <th className="px-3 py-2 font-medium">Variable</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {depensesPeriode.map((d) => (
                        <tr key={d.id} className="border-t">
                          <td className="px-3 py-2">{new Date(d.date).toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2">{d.categorie}</td>
                          <td className="px-3 py-2 font-medium">{fmtCurrency(d.montant)}</td>
                          <td className="px-3 py-2">{d.variable ? <Badge variant="secondary">Oui</Badge> : <Badge variant="outline">Non</Badge>}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteDepense(d.id)} title="Supprimer">
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <footer className="mt-10 text-center text-xs text-zinc-400">
          <p>Design épuré • Données stockées en local (navigateur) • Conçu pour Asmabeauty</p>
        </footer>
      </div>
    </div>
  );
}
