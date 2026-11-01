export function get(obj: any, path: string): any {
  return path.split('.').reduce((o, key) => o?.[key], obj);
}
