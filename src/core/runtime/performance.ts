export function shouldYield(startTime: number, limitMs = 16): boolean {
  return performance.now() - startTime > limitMs;
}

export async function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function executeWithYield<T>(
  items: T[], 
  processItem: (item: T) => void | Promise<void>,
  limitMs = 16
): Promise<void> {
  let startTime = performance.now();
  
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    
    if (shouldYield(startTime, limitMs)) {
      await yieldToMain();
      startTime = performance.now();
    }
  }
}
