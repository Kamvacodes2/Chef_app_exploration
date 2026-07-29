export type ClassValue = string | number | boolean | null | undefined | ClassValue[];

function flatten(value: ClassValue): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flatten);
  return [String(value)];
}

/** Minimal classnames combinator: filters falsy values, joins with a space. */
export function cn(...values: ClassValue[]): string {
  return values.flatMap(flatten).filter(Boolean).join(" ");
}
