export interface TileData {
  letter: string;
  points: number;
  count: number;
  isBlank?: boolean;
}

export interface Tile {
  id: string;
  letter: string;
  points: number;
  isBlank: boolean;
}

export interface BoardCell {
  row: number;
  col: number;
  tile: Tile | null;
  bonus: BonusType;
  isNewlyPlaced?: boolean;
  placedByPlayer?: number;
}

export type BonusType = 
  | 'none' 
  | 'double-letter' 
  | 'triple-letter' 
  | 'double-word' 
  | 'triple-word'
  | 'center';

export interface Player {
  id: number;
  name: string;
  score: number;
  rack: Tile[];
}

export interface PlacedTile {
  row: number;
  col: number;
  tile: Tile;
}

export interface WordInfo {
  word: string;
  cells: BoardCell[];
  score: number;
  isValid: boolean;
}

export interface LastMove {
  playerIndex: number;
  words: WordInfo[];
  placedTiles: PlacedTile[];
  totalScore: number;
  turnNumber: number;
  tilesNeedDrawing: boolean; // For tournament mode - tiles drawn after challenge phase
}

export interface GameState {
  board: BoardCell[][];
  players: [Player, Player];
  currentPlayerIndex: number;
  tileBag: Tile[];
  turnNumber: number;
  placedThisTurn: PlacedTile[];
  isFirstMove: boolean;
  gameOver: boolean;
  winner: number | null;
  lastMove: LastMove | null;
  challengeAvailable: boolean;
}
