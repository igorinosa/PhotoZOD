class CullingSession {
  private assetIds: string[] = [];
  private index = 0;
  private listeners = new Set<() => void>();

  start(assetIds: string[]) {
    this.assetIds = assetIds;
    this.index = 0;
    this.notify();
  }

  current(): string | undefined {
    return this.assetIds[this.index];
  }

  currentIndex(): number {
    return this.index;
  }

  total(): number {
    return this.assetIds.length;
  }

  getAll(): string[] {
    return this.assetIds;
  }

  next(): string | undefined {
    if (this.index < this.assetIds.length - 1) {
      this.index++;
      this.notify();
      return this.current();
    }
    return undefined;
  }

  prev(): string | undefined {
    if (this.index > 0) {
      this.index--;
      this.notify();
    }
    return this.current();
  }

  setIndex(index: number) {
    if (index >= 0 && index < this.assetIds.length) {
      this.index = index;
      this.notify();
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const cullingSession = new CullingSession();
