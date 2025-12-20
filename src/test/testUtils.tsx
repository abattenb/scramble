import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

// Custom render function that wraps components with any providers if needed
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

// Helper to mock dictionary loading
export function mockDictionary(words: string[]) {
  const dictText = words.join('\n');
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    text: async () => dictText,
  } as Response);
}

// Helper to create a mock tile
export function createMockTile(letter: string, points: number, id?: string) {
  return {
    id: id || `tile-${letter}-${Math.random()}`,
    letter,
    points,
  };
}

// Helper to wait for dictionary to load
export async function waitForDictionaryLoad() {
  // Wait a bit for the dictionary to load
  await new Promise((resolve) => setTimeout(resolve, 100));
}

export * from '@testing-library/react';
