// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { supabase } from "./lib/supabaseClient.js";
import Logo from "./components/Logo.jsx";
import {
  getSettings, upsertSettings,
  listTeam, addTeamMember, updateTeamMember, deleteTeamMember,
  listRecordsBetween, addRecord, deleteRecord
} from "./lib/db.js";

/* ---------------- Helpers UI & Data ---------------- */

// Convertit n'importe quoi en tableau propre (pour settings.reasons)
const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
  if (typeof v === "object") return Object.values(v); // jsonb en objet {0:"",1:"",...}
  return [];
};

const MONTHS_FR   = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const WEEKDAYS_FR = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const inferMonthCycle = (startYear, startMonth0) =>
  Array.from({ length: 12 }, (_, i) => {
    const baseMonth = Number.isFinite(startMonth0) ? startMonth0 : 0;
    const m = (baseMonth + i) % 12;
    const y = (startYear ?? new Date().getFullYear()) + Math.floor((baseMonth + i) / 12);
    const label = `${(MONTHS_FR[m] || `M${m}`).slice(0, 3)} ${y}`;
    return { label, year: y, month0: m };
  });

const statusColor = (s) =>
  s === "Présent" ? "bg-emerald-100 text-emerald-800" :
  s === "Absent"  ? "bg-rose-100 text-rose-800"     :
  s === "Retard"  ? "bg-amber-100 text-amber-800"    :
  s === "Vacances"? "bg-sky-100 text-sky-800"        :
                    "bg-gray-100 text-gray-700";

const Chip = ({ children, className = "" }) =>
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;

const GlossySection = ({ title, children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.35 }}
    className={`rounded-2xl p-4 bg-white/70 backdrop-blur border border-indigo-200/40 shadow ${className}`}
  >
    <div className="text-sm font-semibold text-slate-700 mb-3">{title}</div>
    {children}
  </motion.div>
);

/* ---------------------- App (parent) ---------------------- */

export default function App() {
  // Petit nettoyage : si une ancienne session est périmée, évite les 400 en boucle
  useEffect(() => {
    try {
      const hasSb = Object.keys(localStorage).some(k => k.startsWith("sb-"));
      if (hasSb) {
        supabase.auth.getSession().then(({ data }) => { if (!data?.session) supabase.auth.signOut(); });
      }
    } catch {}
  }, []);

  return <PrivateApp />;
}

/* --------------- App privée (lecture/écriture) --------------- */
function PrivateApp() {
  // Valeurs par défaut robustes (notamment "reasons" = tableau)
  const DEFAULT_SETTINGS = {
    startYear: new Date().getFullYear(),
    startMonth0: 8,      // septembre
    tardyThreshold: 3,
    warnThreshold: 2,
    excludeJustified: false,
    reasons: ["Maladie","RDV","Justifiée","Non justifiée","Transport","Grève","Familial","Autre"],
    meetingWeekday: 6,       // 0=dimanche … 6=samedi
    countRetardAsPresent: true,
  };

  // State
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const [team, setTeam] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dérivés
  const months = useMemo(
    () => inferMonthCycle(settings.startYear ?? DEFAULT_SETTINGS.startYear,
                          Number.isFinite(settings.startMonth0) ? settings.startMonth0 : DEFAULT_SETTINGS.startMonth0),
    [settings.startYear, settings.startMonth0]
  );
  const current = months[selectedMonthIdx] ?? months[0];
  const names = useMemo(() => (team || []).map(m => m.name).filter(Boolean), [team]);
  const reasonsList = useMemo(() => toArray(settings.reasons), [settings.reasons]);

  // Chargement initial : settings + team + records du mois courant
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await getSettings();
        if (s) setSettings(prev => ({ ...prev, ...s, reasons: toArray(s.reasons) }));
        else await upsertSettings(DEFAULT_SETTINGS);

        const t = await listTeam();
        setTeam(Array.isArray(t) ? t : []);

        await refreshRecords(current.year, current.month0);
      } catch (e) {
        console.error(e);
        alert("Erreur de chargement (Supabase). Vérifie ta connexion et les policies RLS.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand on change de mois, recharge les enregistrements
  useEffect(() => {
    refreshRecords(current.year, current.month0).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthIdx, settings.startYear, settings.startMonth0]);

  async function refreshRecords(year, month0) {
    try {
      const start = new Date(Date.UTC(year, month0, 1)).toISOString().slice(0, 10);
      const end   = new Date(Date.UTC(year, month0 + 1, 0)).toISOString().slice(0, 10);
      const rows  = await listRecordsBetween(start, end);
      setRecords(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
    }
  }

  // Auto-enregistrer les settings (debounce léger)
  useEffect(() => {
    const t = setTimeout(() => { upsertSettings({ ...settings, reasons: toArray(settings.reasons) }).catch(console.error); }, 600);
    return () => clearTimeout(t);
  }, [settings]);

  // Formulaire de saisie
  const [form, setForm] = useState({
    dateISO: new Date().toISOString().slice(0, 10),
    name: "",
    status: "Présent",
    reason: "",
    minutesLate: 0,
    justified: false,
    comment: ""
  });
  const mustReason = form.status === "Absent" || form.status === "Retard";
  const canSubmit  = form.name && form.dateISO && form.status && (mustReason ? form.reason : true);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await addRecord({ ...form });
      setForm(f => ({ ...f, comment: "", minutesLate: 0, reason: mustReason ? f.reason : "" }));
      await refreshRecords(current.year, current.month0);
    } catch (e) {
      console.error(e);
      alert("Échec d'ajout (vérifie que tu es admin et les policies).");
    }
  };

  const removeRecord = async (id) => {
    if (!confirm("Supprimer cet enregistrement ?")) return;
    try {
      await deleteRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Échec de suppression (permissions ?).");
    }
  };

  // Team CRUD
  const addMember = async (name, role) => {
    if (!String(name || "").trim()) return;
    await addTeamMember({ name: name.trim(), role: String(role || "").trim(), onVacation: false });
    setTeam(await listTeam());
  };
  const updateMember = async (id, patch) => {
    await updateTeamMember(id, patch);
    setTeam(await listTeam());
  };
  const deleteMember = async (id) => {
    await deleteTeamMember(id);
    setTeam(await listTeam());
  };

  // Stats
  const statsByName = useMemo(() => {
    const map = new Map();
    names.forEach(n => map.set(n, { name: n, abs: 0, retards: 0 }));
    for (const r of records) {
      if (!map.has(r.name)) continue;
      if (settings.excludeJustified && r.justified) continue;
      if (r.status === "Absent") map.get(r.name).abs += 1;
      if (r.status === "Retard") map.get(r.name).retards += 1;
    }
    const th = Math.max(1, settings.tardyThreshold || 1);
    return Array.from(map.values()).map(x => ({ ...x, eq: x.abs + Math.floor(x.retards / th) }));
  }, [records, names, settings.tardyThreshold, settings.excludeJustified]);

  const alerts = useMemo(
    () => statsByName.filter(s => s.eq >= (settings.warnThreshold || 2)),
    [statsByName, settings.warnThreshold]
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 text-slate-900">
      <header className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={() => supabase.auth.signOut()} className="rounded-xl px-3 py-2 bg-white/20 hover:bg-white/30">Se déconnecter</button>
          </div>
        </div>
      </header>

      {/* ====== CONTENU PRINCIPAL ====== */}
      <main className="px-6 py-6 max-w-7xl mx-auto grid grid-cols-1 2xl:grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-6 2xl:col-span-1">
          <GlossySection title="Paramètres">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Année de départ
                <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  value={settings.startYear}
                  onChange={(e)=>setSettings(s=>({ ...s, startYear: Number(e.target.value || 0) }))}/>
              </label>
              <label className="text-sm">Mois de départ
                <select className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  value={settings.startMonth0}
                  onChange={(e)=>setSettings(s=>({ ...s, startMonth0: Number(e.target.value) }))}>
                  {MONTHS_FR.map((m,i)=>(<option key={i} value={i}>{m}</option>))}
                </select>
              </label>
              <label className="text-sm">Seuil retards → 1 absence
                <input type="number" min={1} className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  value={settings.tardyThreshold}
                  onChange={(e)=>setSettings(s=>({ ...s, tardyThreshold: Math.max(1, Number(e.target.value || 0)) }))}/>
              </label>
              <label className="text-sm">Avertissement à partir de
                <input type="number" min={1} className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  value={settings.warnThreshold}
                  onChange={(e)=>setSettings(s=>({ ...s, warnThreshold: Math.max(1, Number(e.target.value || 0)) }))}/>
              </label>
              <label className="text-sm">Jour de séance (hebdo)
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  value={settings.meetingWeekday}
                  onChange={(e)=>setSettings(s=>({ ...s, meetingWeekday: Number(e.target.value) }))}
                >
                  {WEEKDAYS_FR.map((d,i)=><option key={i} value={i}>{d}</option>)}
                </select>
              </label>

              <label className="flex items-center gap-2 col-span-2 text-sm">
                <input type="checkbox"
                  checked={!!settings.countRetardAsPresent}
                  onChange={(e)=>setSettings(s=>({ ...s, countRetardAsPresent: e.target.checked }))}/>
                Compter les retards comme présence (pour le taux)
              </label>

              <label className="flex items-center gap-2 col-span-2 text-sm">
                <input type="checkbox"
                  checked={!!settings.excludeJustified}
                  onChange={(e)=>setSettings(s=>({ ...s, excludeJustified: e.target.checked }))}/>
                Exclure les justifiés du calcul
              </label>
            </div>
          </GlossySection>

          <GlossySection title="Motifs (personnalisables)">
            <div className="flex flex-wrap gap-2 mb-3">
              {reasonsList.map((r, idx) => (
                <Chip key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {r}
                  <button
                    className="ml-2 text-indigo-500 hover:text-rose-600"
                    onClick={()=>setSettings(s=>{
                      const arr = toArray(s.reasons).filter((_,i)=>i!==idx);
                      return { ...s, reasons: arr };
                    })}
                    title="Supprimer">×</button>
                </Chip>
              ))}
            </div>
            <AddReason onAdd={(label)=> label && setSettings(s => ({ ...s, reasons: [...toArray(s.reasons), label] }))} />
          </GlossySection>

          <GlossySection title="Équipe">
            <TeamEditor
              team={team}
              onAdd={addMember}
              onUpdate={(idx, patch) => updateMember(team[idx].id, patch)}
              onDelete={(idx) => deleteMember(team[idx].id)}
            />
          </GlossySection>

          <GlossySection title="Export / Import (JSON local)">
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={()=>{
                  const blob = new Blob([JSON.stringify({ settings, team, records }, null, 2)], { type:"application/json" });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href = url; a.download = "absences_retards_app.json"; a.click();
                  URL.revokeObjectURL(url);
                }}
              >💾 Export JSON</button>

              <label className="rounded-xl px-3 py-2 border cursor-pointer hover:bg-slate-50">
                📥 Import JSON
                <input
                  type="file" accept="application/json" className="hidden"
                  onChange={(e)=>{
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                      try {
                        const obj = JSON.parse(String(r.result));
                        if (obj.settings) setSettings({ ...settings, ...obj.settings, reasons: toArray(obj.settings.reasons) });
                        if (obj.team) alert("Import équipe : merci d’ajouter via la section Équipe (sécurité RLS).");
                        if (obj.records) alert("Import des enregistrements : à gérer via Supabase (sécurité RLS).");
                      } catch { alert("Fichier invalide"); }
                    };
                    r.readAsText(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </GlossySection>
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-6 2xl:col-span-2">
          <GlossySection title="Saisie d'un pointage">
            <AddRecordForm
              form={form} setForm={setForm}
              names={names}
              reasons={reasonsList}
              onSubmit={submit}
              canSubmit={canSubmit}
            />
          </GlossySection>

          <GlossySection title={`Liste des enregistrements — ${current.label}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-sm">Mois/année :
                <select className="ml-2 rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                        value={selectedMonthIdx}
                        onChange={(e)=>setSelectedMonthIdx(Number(e.target.value))}>
                  {months.map((m, idx) => (<option key={idx} value={idx}>{m.label}</option>))}
                </select>
              </label>
            </div>
            <RecordsTable records={records} onDelete={removeRecord} />
          </GlossySection>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <GlossySection title={`Tableau de bord — ${current.label}`} className="xl:col-span-2">
              <Dashboard stats={statsByName} warnThreshold={settings.warnThreshold} />
              <div className="h-72 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsByName} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} interval={0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="eq" isAnimationActive>
                      <LabelList dataKey="eq" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlossySection>

            <GlossySection title="Alertes (≥ seuil)">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-600">Aucune alerte pour ce mois.</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <motion.li key={a.name} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                      className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm">Équiv. absences : <b>{a.eq}</b></div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </GlossySection>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            Statuts colorés :
            <span className={`ml-2 ${statusColor("Présent")} inline-flex rounded-full px-2 py-0.5 text-xs`}>Présent</span>
            <span className={`ml-2 ${statusColor("Absent")} inline-flex rounded-full px-2 py-0.5 text-xs`}>Absent</span>
            <span className={`ml-2 ${statusColor("Retard")} inline-flex rounded-full px-2 py-0.5 text-xs`}>Retard</span>
            <span className={`ml-2 ${statusColor("Vacances")} inline-flex rounded-full px-2 py-0.5 text-xs`}>Vacances</span>
          </div>
          <div className="text-[10px] text-slate-500">AFARIS © {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------ Sous-composants ------------------ */

function AddReason({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input className="rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
             placeholder="Ajouter un motif…" value={val} onChange={(e)=>setVal(e.target.value)} />
      <button
        className="rounded-xl px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
        onClick={()=>{ if(val.trim()){ onAdd(val.trim()); setVal(""); } }}
      >➕ Ajouter</button>
    </div>
  );
}

function TeamEditor({ team, onAdd, onUpdate, onDelete }) {
  const [newName, setNewName] = useState(""); const [newRole, setNewRole] = useState("");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="rounded-xl border px-3 py-2 md:col-span-2 focus:outline-none focus:ring focus:ring-indigo-200"
               placeholder="Nom" value={newName} onChange={(e)=>setNewName(e.target.value)} />
        <input className="rounded-xl border px-3 py-2 md:col-span-1 focus:outline-none focus:ring focus:ring-indigo-200"
               placeholder="Rôle (optionnel)" value={newRole} onChange={(e)=>setNewRole(e.target.value)} />
        <button className="rounded-xl px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={()=>{ onAdd(newName, newRole); setNewName(""); setNewRole(""); }}>➕ Ajouter</button>
      </div>

      <div className="max-h-56 overflow-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-indigo-50/60">
              <th className="text-left p-2">Nom</th>
              <th className="text-left p-2">Rôle</th>
              <th className="text-left p-2">Vacances</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(team || []).map((m, idx) => (
              <tr key={m.id || idx} className="border-t hover:bg-indigo-50/40 transition-colors">
                <td className="p-2">
                  <input className="w-full rounded-lg border px-2 py-1 focus:outline-none focus:ring focus:ring-indigo-200"
                         value={m.name} onChange={(e)=>onUpdate(m.id, { name:e.target.value, role:m.role, onVacation:m.onVacation })} />
                </td>
                <td className="p-2">
                  <input className="w-full rounded-lg border px-2 py-1 focus:outline-none focus:ring focus:ring-indigo-200"
                         value={m.role || ""} onChange={(e)=>onUpdate(m.id, { name:m.name, role:e.target.value, onVacation:m.onVacation })} />
                </td>
                <td className="p-2">
                  <label className="text-xs flex items-center gap-2">
                    <input type="checkbox" checked={!!m.onVacation}
                           onChange={(e)=>onUpdate(m.id, { name:m.name, role:m.role, onVacation:e.target.checked })}/>
                    En vacances
                  </label>
                </td>
                <td className="p-2 text-right">
                  <button className="text-rose-600 hover:underline" onClick={()=>onDelete(m.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddRecordForm({ form, setForm, names, reasons, onSubmit, canSubmit }) {
  const status = form.status; const mustReason = status === "Absent" || status === "Retard";
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      <label className="text-sm">Date
        <input type="date" className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
               value={form.dateISO} onChange={(e)=>setForm(f=>({...f, dateISO: e.target.value }))} />
      </label>
      <label className="text-sm md:col-span-2">Nom
        <select className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))}>
          <option value="">— Sélectionner —</option>
          {names.map((n)=><option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="text-sm">Statut
        <select className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                value={status} onChange={(e)=>setForm(f=>({...f, status:e.target.value}))}>
          <option>Présent</option><option>Absent</option><option>Retard</option><option>Vacances</option>
        </select>
      </label>
      <label className="text-sm md:col-span-2">Motif {mustReason && <span className="text-rose-500">*</span>}
        <select className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                value={form.reason} onChange={(e)=>setForm(f=>({...f, reason:e.target.value}))}
                disabled={!mustReason}>
          <option value="">{mustReason ? "— Sélectionner —" : "(non requis)"}</option>
          {reasons.map((r,i)=><option key={i} value={r}>{r}</option>)}
        </select>
      </label>
      {status === "Retard" ? (
        <label className="text-sm">Minutes de retard
          <input type="number" min={0} className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                 value={form.minutesLate} onChange={(e)=>setForm(f=>({...f, minutesLate:Number(e.target.value||0)}))} />
        </label>
      ) : (
        <label className="text-sm">Justifié ?
          <select className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  value={String(form.justified)} onChange={(e)=>setForm(f=>({...f, justified: e.target.value==='true'}))}>
            <option value="false">Non</option><option value="true">Oui</option>
          </select>
        </label>
      )}
      <label className="text-sm md:col-span-3">Commentaire
        <input className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
               value={form.comment} onChange={(e)=>setForm(f=>({...f, comment:e.target.value}))} placeholder="Optionnel" />
      </label>
      <div className="md:col-span-4 flex items-end">
        <button className={`rounded-xl px-4 py-2 ${canSubmit ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                disabled={!canSubmit} onClick={onSubmit}>Ajouter</button>
      </div>
    </div>
  );
}

function RecordsTable({ records, onDelete }) {
  if (!Array.isArray(records) || records.length === 0) return <p className="text-sm text-slate-600">Aucun enregistrement ce mois.</p>;
  return (
    <div className="overflow-auto border rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-50/60">
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Nom</th>
            <th className="p-2 text-left">Statut</th>
            <th className="p-2 text-left">Motif</th>
            <th className="p-2 text-left">Min. retard</th>
            <th className="p-2 text-left">Justifié</th>
            <th className="p-2 text-left">Commentaire</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <motion.tr key={r.id} initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="border-t hover:bg-indigo-50/40 transition-colors">
              <td className="p-2 whitespace-nowrap">{fmtDate(r.dateISO)}</td>
              <td className="p-2">{r.name}</td>
              <td className="p-2"><Chip className={statusColor(r.status)}>{r.status}</Chip></td>
              <td className="p-2">{r.reason || ""}</td>
              <td className="p-2">{r.status === 'Retard' ? r.minutesLate || 0 : ''}</td>
              <td className="p-2">{r.justified ? "Oui" : "Non"}</td>
              <td className="p-2">{r.comment || ""}</td>
              <td className="p-2 text-right"><button className="text-rose-600 hover:underline" onClick={()=>onDelete(r.id)}>Supprimer</button></td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard({ stats, warnThreshold }) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPI title="Total absences équivalentes" value={stats.reduce((s, x) => s + x.eq, 0)} />
        <KPI title="Total absences" value={stats.reduce((s, x) => s + x.abs, 0)} />
        <KPI title="Total retards" value={stats.reduce((s, x) => s + x.retards, 0)} />
      </div>
      <div className="mt-4 overflow-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-indigo-50/60">
              <th className="p-2 text-left">Nom</th>
              <th className="p-2 text-left">Absences</th>
              <th className="p-2 text-left">Retards</th>
              <th className="p-2 text-left">Équiv. absences</th>
              <th className="p-2 text-left">Alerte</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.name} className="border-t hover:bg-indigo-50/40 transition-colors">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.abs}</td>
                <td className="p-2">{s.retards}</td>
                <td className="p-2 font-medium">{s.eq}</td>
                <td className="p-2">{s.eq >= warnThreshold ? <Chip className="bg-rose-100 text-rose-800">Avertissement</Chip> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function KPI({ title, value }) {
  return (
    <motion.div initial={{opacity:0, y:6, scale:.98}} animate={{opacity:1, y:0, scale:1}} transition={{duration:.35}}
      className="rounded-2xl border p-4 bg-white/80 backdrop-blur">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </motion.div>
  );
}
