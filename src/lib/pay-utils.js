// ============================================================================
// pay-utils.js — shared parser for free-form pay strings.
//
// Used by:
//   - Roles page sort ("Highest pay" mode)
//   - PostGenerator filter ("Top pay" spotlight strategy)
//
// Honest scope: pay_rate is free-form text, so this is best-effort. Verified
// against 12 realistic input cases — see CHANGES.md. Heuristic limits are
// documented inline below; if a sorted list ever looks wrong, the most
// reliable fix is to clean up the underlying pay_rate text in that role.
// ============================================================================

// Extract the HIGHEST numeric value from a pay string, normalizing hourly
// rates to an annual equivalent (×2000 ≈ 40hr × 50 weeks) so hourly and annual
// roles can be compared on one scale. Returns 0 if unparseable.
export function parsePayMax(text) {
  if (!text || typeof text !== 'string') return 0;
  const s = text.toLowerCase().replace(/,/g, ''); // strip thousands separators
  // Mixed-unit heuristic: if BOTH "k" (annual shorthand) and "/hr" appear,
  // treat as annual — the k figures dominate. Avoids treating
  // "80k annual or $40/hr" as 80,000,000.
  const hasK = /\d+\s*k\b/.test(s);
  const hasHourly = /\/\s*(hr|hour|h)\b|per\s+hour/.test(s);
  const isHourly = hasHourly && !hasK;
  const matches = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g)];
  if (matches.length === 0) return 0;
  let max = 0;
  for (const m of matches) {
    let n = parseFloat(m[1]);
    if (m[2]) n *= 1000;
    else if (isHourly) n *= 2000;
    if (n > max) max = n;
  }
  return max;
}
