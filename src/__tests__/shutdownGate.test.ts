import { describe, expect, it } from 'vitest';
import { createShutdownGate } from '../utils/shutdownGate.js';

describe('shutdown gate', () => {
  it('allows the first shutdown and ignores later signals', () => {
    const gate = createShutdownGate();
    expect(gate.tryStart()).toBe(true);
    expect(gate.tryStart()).toBe(false);
    expect(gate.tryStart()).toBe(false);
  });
});
