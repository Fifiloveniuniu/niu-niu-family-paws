export const uuidSchema = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
};
export const emptyObjectSchema = { type: 'object', additionalProperties: false, properties: {} };

export function containsControlCharacters(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}
