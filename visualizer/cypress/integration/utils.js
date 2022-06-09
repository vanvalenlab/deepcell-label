const ids = [];

/** Returns a random 12 character string. */
export function getUniqueId() {
  const id =
    Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
  if (ids.includes(id) || id.length !== 12) {
    return getUniqueId();
  }
  ids.push(id);
  return id;
}
