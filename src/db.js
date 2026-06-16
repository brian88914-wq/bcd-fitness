const SUPABASE_URL = "https://jymsxejkjgwgegbjswhj.supabase.co";
const SUPABASE_KEY = "sb_publishable_61aANPzkz-Wy9itVEehrcg_ya2p5zRM";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...options.headers,
    }
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`DB錯誤：${err}`); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function loadProfile(id) {
  try { const data = await sbFetch(`profiles?id=eq.${id}&select=data`); return data?.[0]?.data || null; } catch(e) { return null; }
}

export async function saveProfile(id, profileData) {
  await sbFetch(`profiles?id=eq.${id}`, { method: "DELETE" }).catch(()=>{});
  await sbFetch(`profiles`, { method: "POST", body: JSON.stringify({ id, data: profileData, updated_at: new Date().toISOString() }) });
}

export async function loadLogs(profileId) {
  try { const data = await sbFetch(`logs?profile_id=eq.${profileId}&select=date,data&order=date.asc`); const result = {}; (data || []).forEach(row => { result[row.date] = row.data; }); return result; } catch(e) { return {}; }
}

export async function saveLog(profileId, date, logData) {
  const id = `${profileId}_${date}`;
  await sbFetch(`logs?id=eq.${id}`, { method: "DELETE" }).catch(()=>{});
  await sbFetch(`logs`, { method: "POST", body: JSON.stringify({ id, profile_id: profileId, date, data: logData, updated_at: new Date().toISOString() }) });
}

export async function saveAllLogs(profileId, logs) {
  for (const [date, logData] of Object.entries(logs)) { await saveLog(profileId, date, logData); }
}

export function getDeviceId() {
  let id = localStorage.getItem("bcd_device_id");
  if (!id) { id = "user_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("bcd_device_id", id); }
  return id;
}
