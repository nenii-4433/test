const CONFIG_CACHE_KEY = "rawteeConfigCache";
const CONFIG_CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchStoreConfig() {
  try {
    const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CONFIG_CACHE_TTL_MS) return data;
    }
  } catch {
    sessionStorage.removeItem(CONFIG_CACHE_KEY);
  }

  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Could not load store config");
  const data = await res.json();
  sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  return data;
}
