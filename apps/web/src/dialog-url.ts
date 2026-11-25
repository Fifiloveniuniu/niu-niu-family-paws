const nested: Record<string, string[]> = {
  'dialog.location-edit': ['house-edit', 'room-edit'],
  'dialog.validity-templates': ['validity-template-edit'],
  'dialog.pet-details': ['pet-tab'],
  'dialog.pet-view': ['pet-tab'],
};
/** Preserve page filters, language and anchors while changing only dialog context. */
export function dialogUrl(input: string, key: string, value: string | null) {
  if (!/^dialog\.[a-z0-9-]+$/.test(key)) throw Error('Invalid dialog key');
  const url = new URL(input, 'https://family-paws.invalid');
  if (value === null) {
    url.searchParams.delete(key);
    for (const child of nested[key] ?? []) url.searchParams.delete('dialog.' + child);
  } else url.searchParams.set(key, value);
  return url.pathname + url.search + url.hash;
}
