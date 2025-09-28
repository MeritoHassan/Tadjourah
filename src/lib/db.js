// src/lib/db.js
import { supabase } from "./supabaseClient.js";

/** Noms de tables (si tu as d’autres noms, adapte ici) */
const TABLES = {
  settings: "settings",
  team: "team",
  records: "records",
  meeting_categories: "meeting_categories", // si tu l’utilises
};

/* -------------------- SETTINGS -------------------- */
export async function getSettings() {
  const { data, error } = await supabase
    .from(TABLES.settings)
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSettings(settings) {
  const row = { id: 1, ...settings };
  const { data, error } = await supabase
    .from(TABLES.settings)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* -------------------- TEAM -------------------- */
export async function listTeam() {
  const { data, error } = await supabase
    .from(TABLES.team)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTeamMember({ name, role = "", onVacation = false }) {
  const { data: u } = await supabase.auth.getUser();
  const payload = {
    name,
    role,
    onVacation: !!onVacation,
    user_id: u?.user?.id ?? null,
    is_public: true,
  };
  const { data, error } = await supabase
    .from(TABLES.team)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTeamMember(id, patch) {
  const { data, error } = await supabase
    .from(TABLES.team)
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteTeamMember(id) {
  const { error } = await supabase.from(TABLES.team).delete().eq("id", id);
  if (error) throw error;
}

/* -------------------- RECORDS -------------------- */
/**
 * listRecordsBetween : essaie d’abord la colonne "dateISO", puis "date"
 * (et avec/sans "created_at") pour s’adapter à ton schéma actuel.
 * Retourne toujours des rows avec une propriété "dateISO" normalisée.
 */
export async function listRecordsBetween(startISO, endISO) {
  const tries = [
    { col: "dateISO", withCreated: true },
    { col: "dateISO", withCreated: false },
    { col: "date",    withCreated: true },
    { col: "date",    withCreated: false },
  ];
  let lastErr = null;

  for (const t of tries) {
    try {
      let q = supabase
        .from(TABLES.records)
        .select("*")
        .order(t.col, { ascending: false });
      if (t.withCreated) q = q.order("created_at", { ascending: false });

      if (startISO) q = q.gte(t.col, startISO);
      if (endISO)   q = q.lte(t.col, endISO);

      const { data, error } = await q;
      if (error) {
        if (error.code === "42703") { lastErr = error; continue; } // colonne inconnue
        throw error;
      }
      return (data ?? []).map(r => ({ ...r, dateISO: r.dateISO || r.date }));
    } catch (e) {
      if (e.code === "42703") { lastErr = e; continue; }
      throw e;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

export async function addRecord(viewRecord) {
  const { data: u } = await supabase.auth.getUser();
  const base = {
    ...viewRecord,
    user_id: u?.user?.id ?? null,
    is_public: true,
  };

  // Essai 1 : insère tel quel (avec dateISO si existe)
  let { data, error } = await supabase
    .from(TABLES.records)
    .insert(base)
    .select()
    .single();

  // Si "dateISO" n'existe pas dans la table → re-tente avec "date"
  if (error && error.code === "42703") {
    const payload = { ...base };
    if (payload.dateISO && !payload.date) {
      payload.date = payload.dateISO;
      delete payload.dateISO;
    }
    ({ data, error } = await supabase
      .from(TABLES.records)
      .insert(payload)
      .select()
      .single());
  }
  if (error) throw error;
  return data;
}

export async function deleteRecord(id) {
  const { error } = await supabase.from(TABLES.records).delete().eq("id", id);
  if (error) throw error;
}

/* --------- (Optionnel) Catégories de séances --------- */
export async function addCategory({ type, meeting_date, label, notes }) {
  const { data: u } = await supabase.auth.getUser();
  const payload = {
    type, meeting_date, label, notes,
    user_id: u?.user?.id ?? null,
  };
  const { data, error } = await supabase
    .from(TABLES.meeting_categories)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories({ from, to, type } = {}) {
  let q = supabase
    .from(TABLES.meeting_categories)
    .select("*")
    .order("meeting_date", { ascending: false })
    .limit(500);
  if (from) q = q.gte("meeting_date", from);
  if (to)   q = q.lte("meeting_date", to);
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from(TABLES.meeting_categories)
    .delete()
    .eq("id", id);
  if (error) throw error;
}
