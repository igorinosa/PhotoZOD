export interface AppError {
  id: string;
  message: string;
  type: 'syntax' | 'execution' | 'engine' | 'system';
  timestamp: number;
}

type ErrorListener = (error: AppError) => void;
const listeners = new Set<ErrorListener>();

export const errorReporter = {
  report: (message: string, type: AppError['type'] = 'system') => {
    const now = Date.now();
    const error: AppError = {
      id: `error_${now}_${message.substring(0, 10).replace(/\s+/g, '_')}`,
      message,
      type,
      timestamp: now
    };
    listeners.forEach(l => l(error));
    console.error(`[${type.toUpperCase()} ERROR]`, message);
  },
  subscribe: (listener: ErrorListener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
};
