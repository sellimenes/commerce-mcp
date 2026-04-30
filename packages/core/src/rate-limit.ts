/**
 * Simple sliding-window token bucket. Trendyol limit: 50 req per 10s window,
 * shared across all endpoints for a supplier.
 */
export class TokenBucket {
  private timestamps: number[] = [];

  constructor(
    private readonly capacity: number,
    private readonly windowMs: number,
  ) {}

  async take(): Promise<void> {
    while (true) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
      if (this.timestamps.length < this.capacity) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0] ?? now;
      const wait = Math.max(0, this.windowMs - (now - oldest)) + 5;
      await sleep(wait);
    }
  }

  reset(): void {
    this.timestamps = [];
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
