export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toLocaleUpperCase('tr-TR'))
      .join('') || '?'
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
