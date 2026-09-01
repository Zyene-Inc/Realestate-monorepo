export function rawJsonProperty(payload: Buffer, property: string) {
  const json = payload.toString('utf8');
  const marker = `"${property}"`;
  const propertyIndex = json.indexOf(marker);
  if (propertyIndex < 0) return null;
  const colonIndex = json.indexOf(':', propertyIndex + marker.length);
  if (colonIndex < 0) return null;
  let start = colonIndex + 1;
  while (/\s/.test(json[start] ?? '')) start += 1;
  const opening = json[start];
  if (opening !== '{' && opening !== '[' && opening !== '"') {
    const end = json.slice(start).search(/[,}]/);
    return end < 0
      ? json.slice(start).trim()
      : json.slice(start, start + end).trim();
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < json.length; index += 1) {
    const character = json[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') {
        inString = false;
        if (opening === '"') return json.slice(start, index + 1);
      }
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{' || character === '[') depth += 1;
    else if (character === '}' || character === ']') {
      depth -= 1;
      if (depth === 0) return json.slice(start, index + 1);
    }
  }
  return null;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
