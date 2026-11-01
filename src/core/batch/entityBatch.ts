export function fuseBatchAndEntityOps(batchCode: string, entityCodes: string[]): string {
  if (!batchCode && entityCodes.length === 0) return '';
  if (!batchCode) return entityCodes.join('\n\n');
  if (entityCodes.length === 0) return batchCode;

  // Simple string concatenation for now
  // In a real implementation, we would parse and merge ASTs to avoid conflicts
  // But since PhotoCode is executed sequentially, appending entity codes
  // at the end will naturally override the batch global ops for those specific entities.
  
  return `${batchCode}\n\n${entityCodes.join('\n\n')}`;
}
