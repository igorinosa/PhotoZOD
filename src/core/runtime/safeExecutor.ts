export interface SafeExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: boolean;
  message?: string;
  context?: any;
}

export async function safeExecute<T>(fn: () => Promise<T> | T, context?: any): Promise<SafeExecutionResult<T>> {
  try {
    const result = await fn();
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('[SafeExecutor] Error:', error.message, context);
    return {
      success: false,
      error: true,
      message: error.message || 'Unknown error occurred',
      context
    };
  }
}
