import { describe, expect, it } from 'vitest';
import { phaseProgress, workflowToPhaseIndex } from '@/features/scan/client/lib/phases';

describe('workflowToPhaseIndex', () => {
  it('returns 0 for capture', () => {
    expect(workflowToPhaseIndex('capture')).toBe(0);
  });

  it('returns 1 for processing extract', () => {
    expect(workflowToPhaseIndex('processing', 'extract')).toBe(1);
  });

  it('returns 2 for processing catalog', () => {
    expect(workflowToPhaseIndex('processing', 'catalog')).toBe(2);
  });

  it('returns 3 for review', () => {
    expect(workflowToPhaseIndex('review')).toBe(3);
  });
});

describe('phaseProgress', () => {
  it('returns 20% for capture (phase 1/5)', () => {
    expect(phaseProgress('capture')).toBe(20);
  });

  it('returns 40% for processing extract (phase 2/5)', () => {
    expect(phaseProgress('processing', 'extract')).toBe(40);
  });

  it('returns 60% for processing catalog (phase 3/5)', () => {
    expect(phaseProgress('processing', 'catalog')).toBe(60);
  });

  it('returns 80% for review (phase 4/5)', () => {
    expect(phaseProgress('review')).toBe(80);
  });
});
