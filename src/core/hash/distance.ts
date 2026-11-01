export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new Error("Hash length mismatch");
  }

  let distance = 0;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) distance++;
  }

  return distance;
}
