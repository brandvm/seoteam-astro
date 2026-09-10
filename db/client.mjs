export function database(env) {
  if (!env.DB?.prepare || !env.DB?.batch) throw new Error('Review database is unavailable');
  return env.DB;
}
