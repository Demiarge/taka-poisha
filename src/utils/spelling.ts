function letterTriples(text: string): Set<string> {
  const padded = ` ${text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()} `;
  const triples = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    triples.add(padded.slice(i, i + 3));
  }
  return triples;
}

/** 0 to 1: how many letter triples two spellings share ("birani" vs "biriyani" is 0.57). Same maths as embed_test.py. */
export function spellingSimilarity(a: string, b: string): number {
  const x = letterTriples(a);
  const y = letterTriples(b);
  if (x.size === 0 || y.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const triple of x) {
    if (y.has(triple)) shared++;
  }
  return (2 * shared) / (x.size + y.size);
}
