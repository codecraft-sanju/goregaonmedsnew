//src/utils/mongoError.js
export function duplicateKeyField(error) {
  if (error?.code !== 11000) return null;
  const pattern = error.keyPattern ?? error.keyValue ?? {};
  return Object.keys(pattern)[0] ?? null;
}
