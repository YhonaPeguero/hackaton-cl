const API_BASE = '/api';

export async function searchComuna(query) {
  const res = await fetch(`${API_BASE}/comunas/search/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getComunaDetail(nombre) {
  const res = await fetch(`${API_BASE}/comunas/${encodeURIComponent(nombre)}`);
  if (!res.ok) throw new Error('Detail failed');
  return res.json();
}