export function makeId(prefix: string) {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  const parts: string[] = [];
  for (const b of bytes) {
    parts.push(b.toString(16).padStart(2, "0"));
  }

  return prefix + "_" + parts.join("");
}
