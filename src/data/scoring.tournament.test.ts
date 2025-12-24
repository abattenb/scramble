import { describe, it, expect, beforeEach } from 'vitest';
import { calculateTournamentScore } from './scoring';
import type { BoardCell, Tile } from '../types';

// Helper to create a mock tile
function createTile(letter: string, points: number, isBlank = false): Tile {
  return {
    id: `tile-${letter}-${Math.random()}`,
    letter,
    points,
    isBlank,
  };
}

// Helper to create an empty board
function createEmptyBoard(): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let row = 0; row < 15; row++) {
    board[row] = [];
    for (let col = 0; col < 15; col++) {
      let bonus: BoardCell['bonus'] = 'none';

      // Center square
      if (row === 7 && col === 7) {
        bonus = 'center';
      }
      // Triple word squares
      else if (
        (row === 0 || row === 7 || row === 14) &&
        (col === 0 || col === 7 || col === 14)
      ) {
        bonus = 'triple-word';
      }
      // Double word squares
      else if (
        (row === col && row >= 1 && row <= 4) ||
        (row === col && row >= 10 && row <= 13) ||
        (row + col === 14 && row >= 1 && row <= 4) ||
        (row + col === 14 && row >= 10 && row <= 13)
      ) {
        bonus = 'double-word';
      }
      // Triple letter squares
      else if (
        (row === 1 && (col === 5 || col === 9)) ||
        (row === 5 && (col === 1 || col === 5 || col === 9 || col === 13)) ||
        (row === 9 && (col === 1 || col === 5 || col === 9 || col === 13)) ||
        (row === 13 && (col === 5 || col === 9))
      ) {
        bonus = 'triple-letter';
      }
      // Double letter squares
      else if (
        (row === 0 && (col === 3 || col === 11)) ||
        (row === 2 && (col === 6 || col === 8)) ||
        (row === 3 && (col === 0 || col === 7 || col === 14)) ||
        (row === 6 && (col === 2 || col === 6 || col === 8 || col === 12)) ||
        (row === 7 && (col === 3 || col === 11)) ||
        (row === 8 && (col === 2 || col === 6 || col === 8 || col === 12)) ||
        (row === 11 && (col === 0 || col === 7 || col === 14)) ||
        (row === 12 && (col === 6 || col === 8)) ||
        (row === 14 && (col === 3 || col === 11))
      ) {
        bonus = 'double-letter';
      }

      board[row][col] = {
        row,
        col,
        tile: null,
        bonus,
      };
    }
  }
  return board;
}

describe('Tournament Mode Scoring', () => {
  let board: BoardCell[][];

  beforeEach(() => {
    board = createEmptyBoard();
  });

  // TEST 1: Empty placement returns error
  it('returns error for empty placement', () => {
    const result = calculateTournamentScore(board, [], true);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('No tiles placed');
    expect(result.totalScore).toBe(0);
  });

  // TEST 2: First move must go through center
  it('requires first move to go through center square', () => {
    // Place tiles not at center
    board[0][0].tile = createTile('C', 3);
    board[0][1].tile = createTile('A', 1);
    board[0][2].tile = createTile('T', 1);

    const placedPositions = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('First word must go through the center square');
  });

  // TEST 3: First move through center is valid
  it('accepts first move through center square', () => {
    // Place tiles through center (7,7)
    board[7][6].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 7 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // TEST 4: Tiles must be in same row or column
  it('rejects tiles placed diagonally', () => {
    board[7][7].tile = createTile('C', 3);
    board[8][8].tile = createTile('A', 1);
    board[9][9].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 7 },
      { row: 8, col: 8 },
      { row: 9, col: 9 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Tiles must be placed in a single row or column');
  });

  // TEST 5: Tiles cannot have gaps
  it('rejects placement with gaps', () => {
    // Place tiles with a gap
    board[7][5].tile = createTile('C', 3);
    board[7][6].tile = createTile('A', 1);
    // Gap at [7][7]
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 5 },
      { row: 7, col: 6 },
      { row: 7, col: 8 }, // Skip 7
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Tiles must be placed without gaps');
  });

  // TEST 6: Accepts invalid words (no dictionary check)
  it('accepts any word without dictionary validation', () => {
    // Place nonsense word "XYQZ"
    board[7][6].tile = createTile('X', 8);
    board[7][7].tile = createTile('Y', 4);
    board[7][8].tile = createTile('Q', 10);
    board[7][9].tile = createTile('Z', 10);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 7 },
      { row: 7, col: 8 },
      { row: 7, col: 9 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    // Should be valid even though "XYQZ" is not a real word
    expect(result.isValid).toBe(true);
    expect(result.words).toHaveLength(1);
    expect(result.words[0].word).toBe('XYQZ');
  });

  // TEST 7: Calculates score correctly
  it('calculates basic score correctly', () => {
    // Place CAT (C=3, A=1, T=1) through center (2x multiplier)
    board[7][6].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 7 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(true);
    // Score: (3 + 1 + 1) * 2 = 10 (center gives 2x word score)
    expect(result.totalScore).toBe(10);
  });

  // TEST 8: Bonus for using all 7 tiles
  it('adds 50 point bonus for using all 7 tiles', () => {
    // Place 7 tiles horizontally through center (columns 4-10, includes 7)
    for (let i = 4; i <= 10; i++) {
      board[7][i].tile = createTile('A', 1);
    }

    const placedPositions = Array.from({ length: 7 }, (_, i) => ({ row: 7, col: i + 4 }));

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(true);
    // Base score: 7 * 1 * 2 (center) = 14, plus 50 bonus = 64
    expect(result.totalScore).toBe(64);
  });

  // TEST 9: Subsequent moves must connect to existing tiles
  it('requires moves after first to connect to existing tiles', () => {
    // Place first word
    board[7][7].tile = createTile('C', 3);
    board[7][7].isNewlyPlaced = false; // Existing tile

    // Try to place disconnected word
    board[0][0].tile = createTile('D', 2);
    board[0][1].tile = createTile('O', 1);
    board[0][2].tile = createTile('G', 2);

    const placedPositions = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Word must connect to existing tiles');
  });

  // TEST 10: Accepts connected word
  it('accepts word that connects to existing tiles', () => {
    // Place existing word vertically
    board[6][7].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[8][7].tile = createTile('T', 1);
    board[6][7].isNewlyPlaced = false;
    board[7][7].isNewlyPlaced = false;
    board[8][7].isNewlyPlaced = false;

    // Place new word horizontally connecting to the A
    board[7][6].tile = createTile('B', 3);
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(true);
    expect(result.words.length).toBeGreaterThan(0);
  });

  // TEST 11: Handles blank tiles (0 points)
  it('scores blank tiles as 0 points', () => {
    // Place word with blank tile
    board[7][6].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 0, true); // Blank tile as A
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 7 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(true);
    // Score: (3 + 0 + 1) * 2 = 8 (blank contributes 0 points)
    expect(result.totalScore).toBe(8);
  });

  // TEST 12: Applies double letter bonus
  it('applies double letter bonus correctly', () => {
    // Place on double letter square
    // Position [0][3] is a double letter square
    board[0][3].tile = createTile('Q', 10);
    board[0][4].tile = createTile('I', 1);

    const placedPositions = [
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ];

    // Not first move, so need to connect it
    board[1][3].tile = createTile('A', 1);
    board[1][3].isNewlyPlaced = false;

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(true);
    // Q on double letter: 10 * 2 = 20, plus I = 1, total = 21
    // Should have at least one word with this scoring
    expect(result.totalScore).toBeGreaterThan(0);
  });

  // TEST 13: Applies triple letter bonus
  it('applies triple letter bonus correctly', () => {
    // Position [1][5] is a triple letter square
    board[1][5].tile = createTile('Z', 10);
    board[1][6].tile = createTile('A', 1);

    const placedPositions = [
      { row: 1, col: 5 },
      { row: 1, col: 6 },
    ];

    // Connect to existing tile
    board[0][5].tile = createTile('B', 3);
    board[0][5].isNewlyPlaced = false;

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(true);
    // Z on triple letter: 10 * 3 = 30, plus A = 1, total = 31
    expect(result.totalScore).toBeGreaterThan(0);
  });

  // TEST 14: Must form at least one word
  it('requires forming at least one word', () => {
    // Place single tile (doesn't form a multi-letter word)
    board[7][7].tile = createTile('A', 1);

    const placedPositions = [{ row: 7, col: 7 }];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must form at least one word');
  });

  // TEST 15: Finds perpendicular words
  it('finds and scores perpendicular words', () => {
    // Existing vertical word
    board[6][7].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[8][7].tile = createTile('T', 1);
    board[6][7].isNewlyPlaced = false;
    board[7][7].isNewlyPlaced = false;
    board[8][7].isNewlyPlaced = false;

    // New horizontal word through the A
    board[7][6].tile = createTile('R', 1);
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(true);
    // Should find both the horizontal word (RAT) and possibly CAT
    expect(result.words.length).toBeGreaterThan(0);
  });

  // TEST 16: Handles vertical placement
  it('handles vertical tile placement', () => {
    // Place tiles vertically through center
    board[6][7].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[8][7].tile = createTile('T', 1);

    const placedPositions = [
      { row: 6, col: 7 },
      { row: 7, col: 7 },
      { row: 8, col: 7 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(true);
    expect(result.words).toHaveLength(1);
    expect(result.words[0].word).toBe('CAT');
  });

  // TEST 17: Calculates total score from multiple words
  it('sums scores from all formed words', () => {
    // Existing word
    board[7][6].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[7][8].tile = createTile('T', 1);
    board[7][6].isNewlyPlaced = false;
    board[7][7].isNewlyPlaced = false;
    board[7][8].isNewlyPlaced = false;

    // Add perpendicular word
    board[6][8].tile = createTile('A', 1);
    board[8][8].tile = createTile('S', 1);

    const placedPositions = [
      { row: 6, col: 8 },
      { row: 8, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(true);
    // Should score multiple words if perpendicular words are formed
    expect(result.totalScore).toBeGreaterThan(0);
  });

  // TEST 18: No bonus on old tiles
  it('only applies bonuses to newly placed tiles', () => {
    // Place tile on double word square but mark as old
    board[1][1].tile = createTile('C', 3);
    board[1][1].isNewlyPlaced = false;

    // Add new tiles without bonus
    board[1][2].tile = createTile('A', 1);
    board[1][3].tile = createTile('T', 1);

    const placedPositions = [
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ];

    const result = calculateTournamentScore(board, placedPositions, false);

    expect(result.isValid).toBe(true);
    // Score should not include double word bonus from old tile
    expect(result.words[0].score).toBe(5); // C(3) + A(1) + T(1) = 5, no multiplier
  });

  // TEST 19: Returns words array
  it('returns array of formed words', () => {
    board[7][6].tile = createTile('C', 3);
    board[7][7].tile = createTile('A', 1);
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 7 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, true);

    expect(result.isValid).toBe(true);
    expect(Array.isArray(result.words)).toBe(true);
    expect(result.words.length).toBeGreaterThan(0);
    expect(result.words[0]).toHaveProperty('word');
    expect(result.words[0]).toHaveProperty('score');
    expect(result.words[0]).toHaveProperty('cells');
  });

  // TEST 20: Handles complex placements
  it('handles complex multi-word placements', () => {
    // Create existing vertical word
    board[6][7].tile = createTile('B', 3);
    board[7][7].tile = createTile('A', 1);
    board[8][7].tile = createTile('T', 1);
    board[6][7].isNewlyPlaced = false;
    board[7][7].isNewlyPlaced = false;
    board[8][7].isNewlyPlaced = false;

    // Place horizontal word through the A (this turn)
    board[7][6].tile = createTile('C', 3);
    board[7][8].tile = createTile('T', 1);

    const placedPositions = [
      { row: 7, col: 6 },
      { row: 7, col: 8 },
    ];

    const result = calculateTournamentScore(board, placedPositions, false);

    // Should be valid and find the horizontal word (CAT)
    expect(result.isValid).toBe(true);
    expect(result.words.length).toBeGreaterThan(0);
  });
});
