// src/lib/db.js
// -------------------------------------------------------------
// Accès Supabase : settings, team, records, dues_payments
// -------------------------------------------------------------
import { supabase } from './supabaseClient.js'

// ID utilisateur courant
async function currentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user?.id
}

/* ============ SETTINGS (JSON) ============ */
export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('data').maybeSingle()
  if (error) throw error
  return data?.data || null
}
export async function upsertSettings(settingsObj) {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: uid, data: settingsObj }, { onConflict: 'user_id' })
    .select('data')
    .single()
  if (error) throw error
  return data.data
}

/* =============== TEAM =============== */
export async function listTeam() {
  const { data, error } = await supabase.from('team').select('*').order('name', { ascending: true })
  if (error) throw error
  return data.map(t => ({
    id: t.id,
    name: t.name,
    role: t.role || '',
    onVacation: !!t.on_vacation,
    monthlyFee: Number(t.monthly_fee || 0),
    exempt: !!t.exempt,
  }))
}
export async function addTeamMember({ name, role = '', onVacation = false, monthlyFee = 0, exempt = false }) {
  const uid = await currentUserId()
  const { error } = await supabase.from('team').insert({
    user_id: uid, name, role, on_vacation: onVacation, monthly_fee: monthlyFee, exempt
  })
  if (error) throw error
}
export async function updateTeamMember(id, { name, role, onVacation, monthlyFee, exempt }) {
  const patch = {}
  if (name !== undefined) patch.name = name
  if (role !== undefined) patch.role = role
  if (onVacation !== undefined) patch.on_vacation = onVacation
  if (monthlyFee !== undefined) patch.monthly_fee = monthlyFee
  if (exempt !== undefined) patch.exempt = exempt
  const { error } = await supabase.from('team').update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteTeamMember(id) {
  const { error } = await supabase.from('team').delete().eq('id', id)
  if (error) throw error
}

/* =============== RECORDS =============== */
export async function listRecordsBetween(startISO, endISO) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(r => ({
    id: r.id,
    dateISO: r.date,
    name: r.name,
    status: r.status,
    reason: r.reason || '',
    minutesLate: r.minutes_late || 0,
    justified: !!r.justified,
    comment: r.comment || ''
  }))
}
export async function addRecord(viewRec) {
  const uid = await currentUserId()
  const payload = {
    user_id: uid,
    date: viewRec.dateISO,
    name: viewRec.name,
    status: viewRec.status,
    reason: (viewRec.status === 'Présent' || viewRec.status === 'Vacances') ? '' : (viewRec.reason || ''),
    minutes_late: viewRec.status === 'Retard' ? Number(viewRec.minutesLate || 0) : 0,
    justified: !!viewRec.justified,
    comment: viewRec.comment || ''
  }
  const { data, error } = await supabase.from('records').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}
export async function deleteRecord(id) {
  const { error } = await supabase.from('records').delete().eq('id', id)
  if (error) throw error
}

/* =============== DUES (cotisations) =============== */
export async function listDuesBetween(startISO, endISO) {
  const { data, error } = await supabase
    .from('dues_payments')
    .select('*')
    .gte('period_date', startISO)
    .lte('period_date', endISO)
    .order('period_date', { ascending: false })
  if (error) throw error
  return data.map(p => ({
    id: p.id,
    memberId: p.member_id,
    memberName: p.member_name,
    periodISO: p.period_date,
    amount: Number(p.amount || 0),
    method: p.method || '',
    status: p.status || 'Payé',
    note: p.note || ''
  }))
}
export async function addDuePayment({ memberId, memberName, periodISO, amount, method, status, note }) {
  const uid = await currentUserId()
  const payload = {
    user_id: uid,
    member_id: memberId || null,
    member_name: memberName,
    period_date: periodISO,        // 1er jour du mois
    amount: Number(amount || 0),
    method: method || null,
    status: status || 'Payé',
    note: note || null
  }
  const { data, error } = await supabase.from('dues_payments').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}
export async function deleteDuePayment(id) {
  const { error } = await supabase.from('dues_payments').delete().eq('id', id)
  if (error) throw error
}
