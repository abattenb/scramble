import type { BoardCell, WordInfo } from '../types';
import { isValidWord } from './dictionary';

export interface PlacementResult {
  isValid: boolean;
  words: WordInfo[];
  totalScore: number;
  errors: string[];
}

// Validate all words - blank tiles already have their letters assigned by the player
function validateWordsWithBlanks(words: WordInfo[], _board: BoardCell[][]): boolean {
  // Just validate all words normally - blank tiles already have their selected letters
  const allValid = words.every((w) => isValidWord(w.word));
  return allValid;
}

// Find all words formed by the current placement
export function findWordsFromPlacement(
  board: BoardCell[][],
  placedTiles: { row: number; col: number }[],
  isFirstMove: boolean
): PlacementResult {
  if (placedTiles.length === 0) {
    return { isValid: false, words: [], totalScore: 0, errors: ['No tiles placed'] };
  }

  // Check if all tiles are in the same row or column
  const rows = [...new Set(placedTiles.map((t) => t.row))];
  const cols = [...new Set(placedTiles.map((t) => t.col))];
  
  const isHorizontal = rows.length === 1;
  const isVertical = cols.length === 1;
  
  if (!isHorizontal && !isVertical) {
    return { 
      isValid: false, 
      words: [], 
      totalScore: 0, 
      errors: ['Tiles must be placed in a single row or column'] 
    };
  }

  // Check for gaps in placement
  if (isHorizontal) {
    const row = rows[0];
    const sortedCols = cols.sort((a, b) => a - b);
    for (let c = sortedCols[0]; c <= sortedCols[sortedCols.length - 1]; c++) {
      if (!board[row][c].tile) {
        return { 
          isValid: false, 
          words: [], 
          totalScore: 0, 
          errors: ['Tiles must be placed without gaps'] 
        };
      }
    }
  } else {
    const col = cols[0];
    const sortedRows = rows.sort((a, b) => a - b);
    for (let r = sortedRows[0]; r <= sortedRows[sortedRows.length - 1]; r++) {
      if (!board[r][col].tile) {
        return { 
          isValid: false, 
          words: [], 
          totalScore: 0, 
          errors: ['Tiles must be placed without gaps'] 
        };
      }
    }
  }

  // Check first move goes through center
  if (isFirstMove) {
    const touchesCenter = placedTiles.some((t) => t.row === 7 && t.col === 7);
    if (!touchesCenter) {
      return { 
        isValid: false, 
        words: [], 
        totalScore: 0, 
        errors: ['First word must go through the center square'] 
      };
    }
  }

  // Check if placement connects to existing tiles (not first move)
  if (!isFirstMove) {
    const connectsToExisting = placedTiles.some((pos) => {
      const { row, col } = pos;
      // Check adjacent cells for existing tiles (not newly placed)
      const adjacent = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      return adjacent.some(([r, c]) => {
        if (r < 0 || r > 14 || c < 0 || c > 14) return false;
        const cell = board[r][c];
        // Has a tile that wasn't just placed
        return cell.tile && !placedTiles.some((p) => p.row === r && p.col === c);
      });
    });

    if (!connectsToExisting) {
      return { 
        isValid: false, 
        words: [], 
        totalScore: 0, 
        errors: ['Word must connect to existing tiles'] 
      };
    }
  }

  // Find all words formed
  const words: WordInfo[] = [];
  const placedSet = new Set(placedTiles.map((t) => `${t.row},${t.col}`));

  // Get the main word (in the direction of placement)
  const mainWord = getWordAt(
    board,
    placedTiles[0].row,
    placedTiles[0].col,
    isHorizontal ? 'horizontal' : 'vertical',
    placedSet
  );

  if (mainWord && mainWord.cells.length > 1) {
    words.push(mainWord);
  }

  // Get perpendicular words formed by each placed tile
  for (const pos of placedTiles) {
    const perpWord = getWordAt(
      board,
      pos.row,
      pos.col,
      isHorizontal ? 'vertical' : 'horizontal',
      placedSet
    );

    if (perpWord && perpWord.cells.length > 1) {
      // Check if this word is already added
      const isDuplicate = words.some(
        (w) => w.cells[0].row === perpWord.cells[0].row &&
               w.cells[0].col === perpWord.cells[0].col &&
               w.word === perpWord.word
      );
      if (!isDuplicate) {
        words.push(perpWord);
      }
    }
  }

  if (words.length === 0) {
    return {
      isValid: false,
      words: [],
      totalScore: 0,
      errors: ['Must form at least one word']
    };
  }

  // Validate all words (blank tiles already have their letters assigned)
  const isValid = validateWordsWithBlanks(words, board);

  if (!isValid) {
    const wordList = words.map((w) => w.word.toUpperCase()).join(', ');
    return {
      isValid: false,
      words,
      totalScore: 0,
      errors: [`Cannot form valid words with this placement: ${wordList}`]
    };
  }

  const totalScore = words.reduce((sum, w) => sum + w.score, 0);

  // Bonus for using all 7 tiles
  const finalScore = placedTiles.length === 7 ? totalScore + 50 : totalScore;

  return { isValid: true, words, totalScore: finalScore, errors: [] };
}

/**
 * Calculate score for placement without validating words against dictionary
 * Used in tournament mode to allow invalid words through
 * Validates placement rules only (alignment, gaps, connections)
 */
export function calculateTournamentScore(
  board: BoardCell[][],
  placedTiles: { row: number; col: number }[],
  isFirstMove: boolean
): PlacementResult {
  if (placedTiles.length === 0) {
    return { isValid: false, words: [], totalScore: 0, errors: ['No tiles placed'] };
  }

  // Check if all tiles are in the same row or column
  const rows = [...new Set(placedTiles.map((t) => t.row))];
  const cols = [...new Set(placedTiles.map((t) => t.col))];

  const isHorizontal = rows.length === 1;
  const isVertical = cols.length === 1;

  if (!isHorizontal && !isVertical) {
    return {
      isValid: false,
      words: [],
      totalScore: 0,
      errors: ['Tiles must be placed in a single row or column']
    };
  }

  // Check for gaps in placement
  if (isHorizontal) {
    const row = rows[0];
    const sortedCols = cols.sort((a, b) => a - b);
    for (let c = sortedCols[0]; c <= sortedCols[sortedCols.length - 1]; c++) {
      if (!board[row][c].tile) {
        return {
          isValid: false,
          words: [],
          totalScore: 0,
          errors: ['Tiles must be placed without gaps']
        };
      }
    }
  } else {
    const col = cols[0];
    const sortedRows = rows.sort((a, b) => a - b);
    for (let r = sortedRows[0]; r <= sortedRows[sortedRows.length - 1]; r++) {
      if (!board[r][col].tile) {
        return {
          isValid: false,
          words: [],
          totalScore: 0,
          errors: ['Tiles must be placed without gaps']
        };
      }
    }
  }

  // Check first move goes through center
  if (isFirstMove) {
    const touchesCenter = placedTiles.some((t) => t.row === 7 && t.col === 7);
    if (!touchesCenter) {
      return {
        isValid: false,
        words: [],
        totalScore: 0,
        errors: ['First word must go through the center square']
      };
    }
  }

  // Check if placement connects to existing tiles (not first move)
  if (!isFirstMove) {
    const connectsToExisting = placedTiles.some((pos) => {
      const { row, col } = pos;
      // Check adjacent cells for existing tiles (not newly placed)
      const adjacent = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      return adjacent.some(([r, c]) => {
        if (r < 0 || r > 14 || c < 0 || c > 14) return false;
        const cell = board[r][c];
        // Has a tile that wasn't just placed
        return cell.tile && !placedTiles.some((p) => p.row === r && p.col === c);
      });
    });

    if (!connectsToExisting) {
      return {
        isValid: false,
        words: [],
        totalScore: 0,
        errors: ['Word must connect to existing tiles']
      };
    }
  }

  // Find all words formed
  const words: WordInfo[] = [];
  const placedSet = new Set(placedTiles.map((t) => `${t.row},${t.col}`));

  // Get the main word (in the direction of placement)
  const mainWord = getWordAt(
    board,
    placedTiles[0].row,
    placedTiles[0].col,
    isHorizontal ? 'horizontal' : 'vertical',
    placedSet
  );

  if (mainWord && mainWord.cells.length > 1) {
    words.push(mainWord);
  }

  // Get perpendicular words formed by each placed tile
  for (const pos of placedTiles) {
    const perpWord = getWordAt(
      board,
      pos.row,
      pos.col,
      isHorizontal ? 'vertical' : 'horizontal',
      placedSet
    );

    if (perpWord && perpWord.cells.length > 1) {
      // Check if this word is already added
      const isDuplicate = words.some(
        (w) => w.cells[0].row === perpWord.cells[0].row &&
               w.cells[0].col === perpWord.cells[0].col &&
               w.word === perpWord.word
      );
      if (!isDuplicate) {
        words.push(perpWord);
      }
    }
  }

  if (words.length === 0) {
    return {
      isValid: false,
      words: [],
      totalScore: 0,
      errors: ['Must form at least one word']
    };
  }

  // SKIP dictionary validation - this is tournament mode
  // Calculate total score normally
  const totalScore = words.reduce((sum, w) => sum + w.score, 0);

  // Bonus for using all 7 tiles
  const finalScore = placedTiles.length === 7 ? totalScore + 50 : totalScore;

  return { isValid: true, words, totalScore: finalScore, errors: [] };
}

function getWordAt(
  board: BoardCell[][],
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical',
  newlyPlacedSet: Set<string>
): WordInfo | null {
  const cells: BoardCell[] = [];

  if (direction === 'horizontal') {
    // Find start of word
    let startCol = col;
    while (startCol > 0 && board[row][startCol - 1].tile) {
      startCol--;
    }
    // Collect all cells in word
    let c = startCol;
    while (c < 15 && board[row][c].tile) {
      cells.push(board[row][c]);
      c++;
    }
  } else {
    // Find start of word
    let startRow = row;
    while (startRow > 0 && board[startRow - 1][col].tile) {
      startRow--;
    }
    // Collect all cells in word
    let r = startRow;
    while (r < 15 && board[r][col].tile) {
      cells.push(board[r][col]);
      r++;
    }
  }

  if (cells.length < 2) return null;

  // Build word from tiles (blank tiles already have their selected letters)
  const word = cells.map((c) => c.tile!.letter).join('');
  const score = calculateWordScore(cells, newlyPlacedSet);

  return { word, cells, score, isValid: true };
}

function calculateWordScore(cells: BoardCell[], newlyPlacedSet: Set<string>): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const cell of cells) {
    if (!cell.tile) continue;
    
    let letterScore = cell.tile.points;
    const isNewlyPlaced = newlyPlacedSet.has(`${cell.row},${cell.col}`);

    // Only apply bonuses for newly placed tiles
    if (isNewlyPlaced) {
      switch (cell.bonus) {
        case 'double-letter':
          letterScore *= 2;
          break;
        case 'triple-letter':
          letterScore *= 3;
          break;
        case 'double-word':
        case 'center':
          wordMultiplier *= 2;
          break;
        case 'triple-word':
          wordMultiplier *= 3;
          break;
      }
    }

    wordScore += letterScore;
  }

  return wordScore * wordMultiplier;
}
