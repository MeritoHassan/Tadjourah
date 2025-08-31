// --- Catégories (absence/retard par séance) ---
export async function addCategory({ type, meeting_date, label, notes }) {
  const { data: u } = await supabase.auth.getUser();
  const user_id = u?.user?.id ?? null;
  const { data, error } = await supabase
    .from('meeting_categories')
    .insert([{ type, meeting_date, label, notes, user_id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories({ from, to, type } = {}) {
  let q = supabase
    .from('meeting_categories')
    .select('*')
    .order('meeting_date', { ascending: false })
    .limit(500);
  if (from) q = q.gte('meeting_date', from);
  if (to)   q = q.lte('meeting_date', to);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('meeting_categories').delete().eq('id', id);
  if (error) throw error;
}
