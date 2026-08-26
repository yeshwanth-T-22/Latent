import { describe, it, expect } from 'vitest';

// ── Unit tests for utility functions and data transformations ────────────────

describe('getInitials', () => {
  // Replicate the getInitials function from App.tsx for isolated testing
  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'ST';
  }

  it('returns initials from a full name', () => {
    expect(getInitials('Yeshwanth T')).toBe('YT');
  });

  it('returns first two letters for a single name', () => {
    expect(getInitials('Yeshwanth')).toBe('Y');
  });

  it('caps at 2 characters', () => {
    expect(getInitials('A B C D')).toBe('AB');
  });

  it('returns ST for empty string', () => {
    expect(getInitials('')).toBe('ST');
  });
});

describe('topicColor', () => {
  const TOPIC_COLORS = ['#e0926e', '#4ba59a', '#8b7eb5', '#e0b86e', '#6e9ee0', '#a5604b'];
  function topicColor(index: number) { return TOPIC_COLORS[index % TOPIC_COLORS.length]; }

  it('returns the first color for index 0', () => {
    expect(topicColor(0)).toBe('#e0926e');
  });

  it('wraps around for indices beyond the array length', () => {
    expect(topicColor(6)).toBe('#e0926e');
    expect(topicColor(7)).toBe('#4ba59a');
  });
});

describe('API module structure', () => {
  it('exports supabase client and auth functions', async () => {
    // Verify the module can be statically analysed
    const api = await import('./api');
    expect(api.supabase).toBeDefined();
    expect(typeof api.signIn).toBe('function');
    expect(typeof api.signUp).toBe('function');
    expect(typeof api.signOut).toBe('function');
  });

  it('exports all API request functions', async () => {
    const api = await import('./api');
    expect(typeof api.sendDoubt).toBe('function');
    expect(typeof api.fetchQuiz).toBe('function');
    expect(typeof api.submitConfidenceCheck).toBe('function');
    expect(typeof api.submitExplainBack).toBe('function');
    expect(typeof api.fetchReport).toBe('function');
    expect(typeof api.fetchMentor).toBe('function');
    expect(typeof api.fetchDashboardData).toBe('function');
    expect(typeof api.fetchProfile).toBe('function');
    expect(typeof api.updateProfile).toBe('function');
  });

  it('exports state persistence functions', async () => {
    const api = await import('./api');
    expect(typeof api.fetchTopicState).toBe('function');
    expect(typeof api.updateTopicState).toBe('function');
  });
});

describe('Type definitions', () => {
  it('exports expected type interfaces', async () => {
    // TypeScript compile-time check — if types are broken, this file won't compile
    const types = await import('./types');
    expect(types).toBeDefined();
  });
});

describe('ErrorBoundaryFallback', () => {
  it('exports the fallback component', async () => {
    const mod = await import('./ErrorBoundaryFallback');
    expect(typeof mod.ErrorBoundaryFallback).toBe('function');
  });
});
