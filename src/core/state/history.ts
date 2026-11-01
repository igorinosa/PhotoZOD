import { Snapshot } from './snapshot';

class HistoryEngine {
  private history: Snapshot[] = [];
  private future: Snapshot[] = [];

  push(state: Snapshot) {
    this.history.push(state);
    // Clear future when new action is taken
    this.future = [];
  }

  undo(): Snapshot | null {
    if (this.history.length === 0) return null;
    
    const current = this.history.pop()!;
    this.future.push(current);
    
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  redo(): Snapshot | null {
    if (this.future.length === 0) return null;
    
    const next = this.future.pop()!;
    this.history.push(next);
    
    return next;
  }
  
  canUndo(): boolean {
    return this.history.length > 1; // Need at least one previous state
  }
  
  canRedo(): boolean {
    return this.future.length > 0;
  }
  
  clear() {
    this.history = [];
    this.future = [];
  }
}

export const historyEngine = new HistoryEngine();
