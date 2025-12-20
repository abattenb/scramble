import { useState, useCallback, useEffect, useRef } from 'react';
import type { Tile, Player, GameState, PlacedTile } from './types';
import { createTileBag, drawTiles } from './data/tiles';
import { createEmptyBoard } from './data/board';
import { loadDictionary } from './data/dictionary';
import { findWordsFromPlacement } from './data/scoring';
import { GameBoard } from './components/GameBoard';
import { PlayerRack } from './components/PlayerRack';
import { VERSION } from './version';
import './App.css';

const STORAGE_KEY = 'scramble-game-state';
const PLAYER_NAMES_KEY = 'scramble-player-names';
const GAME_SETTINGS_KEY = 'scramble-game-settings';

interface PlayerSettings {
  name: string;
  color: string;
}

interface GameSettings {
  expertMode: boolean;
  hidePlayerTiles: boolean;
  randomizePlayer1: boolean;
  showPlayerColorOnTiles: boolean;
}

// Available player colors
const PLAYER_COLORS = [
  '#ffd700', // Gold
  '#4caf50', // Green
  '#2196f3', // Blue
  '#f44336', // Red
  '#ba68c8', // Purple (lighter tint)
  '#ff9800', // Orange
];

function saveGameSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save game settings:', error);
  }
}

function loadGameSettings(): GameSettings {
  const defaults: GameSettings = { expertMode: false, hidePlayerTiles: false, randomizePlayer1: false, showPlayerColorOnTiles: false };
  try {
    const saved = localStorage.getItem(GAME_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all properties are defined
      return { ...defaults, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load game settings:', error);
  }
  return defaults;
}

// Count remaining tiles by letter
function countTilesByLetter(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const letter = tile.isBlank ? '?' : tile.letter;
    counts.set(letter, (counts.get(letter) || 0) + 1);
  }
  return counts;
}

function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as GameState;
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}

function savePlayerSettings(settings: { player1: PlayerSettings; player2: PlayerSettings }): void {
  try {
    localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save player settings:', error);
  }
}

function loadPlayerSettings(): { player1: PlayerSettings; player2: PlayerSettings } {
  const defaults = {
    player1: { name: 'Player 1', color: PLAYER_COLORS[0] },
    player2: { name: 'Player 2', color: PLAYER_COLORS[1] }
  };
  try {
    const saved = localStorage.getItem(PLAYER_NAMES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Handle legacy format (just names) and migrate to new format
      if (typeof parsed.player1 === 'string') {
        return {
          player1: { name: parsed.player1, color: PLAYER_COLORS[0] },
          player2: { name: parsed.player2, color: PLAYER_COLORS[1] }
        };
      }
      return parsed as { player1: PlayerSettings; player2: PlayerSettings };
    }
  } catch (error) {
    console.error('Failed to load player settings:', error);
  }
  return defaults;
}

function loadPlayerNames(): { player1: string; player2: string } {
  const settings = loadPlayerSettings();
  return {
    player1: settings.player1.name,
    player2: settings.player2.name
  };
}

function getPlayerColor(playerName: string): string {
  const settings = loadPlayerSettings();
  if (playerName === settings.player1.name) {
    return settings.player1.color;
  }
  if (playerName === settings.player2.name) {
    return settings.player2.color;
  }
  // Fallback to first color if no match
  return PLAYER_COLORS[0];
}

function initializeGame(player1Name: string, player2Name: string): GameState {
  const tileBag = createTileBag();
  
  // Draw 7 tiles for each player
  const { drawn: player1Tiles, remaining: bag1 } = drawTiles(tileBag, 7);
  const { drawn: player2Tiles, remaining: finalBag } = drawTiles(bag1, 7);
  
  const players: [Player, Player] = [
    { id: 1, name: player1Name || 'Player 1', score: 0, rack: player1Tiles },
    { id: 2, name: player2Name || 'Player 2', score: 0, rack: player2Tiles },
  ];
  
  return {
    board: createEmptyBoard(),
    players,
    currentPlayerIndex: 0,
    tileBag: finalBag,
    turnNumber: 1,
    placedThisTurn: [],
    isFirstMove: true,
    gameOver: false,
    winner: null,
  };
}

// Game phase state machine
type GamePhase = 'start' | 'playing' | 'gameOver';

function App() {
    // Rack reveal state: { activeRack: 0|1, readyPending: boolean }
    // Initialize to player 0, will sync with gameState after mount
    const [rackRevealState, setRackRevealState] = useState<{ activeRack: number; readyPending: boolean }>({
      activeRack: 0,
      readyPending: false,
    });
  const [gameState, setGameState] = useState<GameState>(() => {
    // Try to load saved game state, otherwise initialize with default names
    const saved = loadGameState();
    const names = loadPlayerNames();
    return saved || initializeGame(names.player1, names.player2);
  });
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    // Determine initial phase based on saved game state
    const saved = loadGameState();
    if (!saved) return 'start';
    if (saved.gameOver) return 'gameOver';
    return 'playing';
  });
  // Player settings for the start modal
  const [player1Name, setPlayer1Name] = useState<string>(() => loadPlayerSettings().player1.name);
  const [player2Name, setPlayer2Name] = useState<string>(() => loadPlayerSettings().player2.name);
  const [player1Color, setPlayer1Color] = useState<string>(() => loadPlayerSettings().player1.color);
  const [player2Color, setPlayer2Color] = useState<string>(() => loadPlayerSettings().player2.color);
  const [showColorPicker, setShowColorPicker] = useState<1 | 2 | null>(null);
  // Game settings
  const [expertMode, setExpertMode] = useState<boolean>(() => loadGameSettings().expertMode);
  const [hidePlayerTiles, setHidePlayerTiles] = useState<boolean>(() => loadGameSettings().hidePlayerTiles);
  const [randomizePlayer1, setRandomizePlayer1] = useState<boolean>(() => loadGameSettings().randomizePlayer1);
  const [showPlayerColorOnTiles, setShowPlayerColorOnTiles] = useState<boolean>(() => loadGameSettings().showPlayerColorOnTiles);
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [draggingTile, setDraggingTile] = useState<Tile | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  
  // Exchange tiles state
  const [exchangeMode, setExchangeMode] = useState(false);
  const [selectedForExchange, setSelectedForExchange] = useState<Set<string>>(new Set());
  
  // Track if tile is being dragged from board (vs rack)
  const [dragSourceCell, setDragSourceCell] = useState<{ row: number; col: number } | null>(null);

  // Sidebar accordion state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Escape hatch state
  const [escapeHatchTaps, setEscapeHatchTaps] = useState(0);
  const escapeHatchTimeoutRef = useRef<number | null>(null);

  // Update available state
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Recalling tiles animation state
  const [recallingTiles, setRecallingTiles] = useState<Array<{ tile: Tile; row: number; col: number; targetIndex: number }>>([]);

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Cleanup escape hatch timeout on unmount
  useEffect(() => {
    return () => {
      if (escapeHatchTimeoutRef.current) {
        clearTimeout(escapeHatchTimeoutRef.current);
      }
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('swUpdateAvailable', handleUpdate);
    return () => window.removeEventListener('swUpdateAvailable', handleUpdate);
  }, []);

  // Load dictionary on mount
  useEffect(() => {
    loadDictionary().then(() => {
      setDictionaryLoaded(true);
    });
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Ref to store handleDropTile for use in touch handlers
  const handleDropTileRef = useRef<((row: number, col: number) => void) | null>(null);

  // Track mouse/touch position during drag
  useEffect(() => {
    if (!draggingTile) return;

    const handleDragOver = (e: DragEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setDragPosition({ x: touch.clientX, y: touch.clientY });
        
        // Find which cell we're over
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const cellWrapper = element?.closest('.board-cell-wrapper') as HTMLElement;
        if (cellWrapper) {
          const row = parseInt(cellWrapper.dataset.row || '-1');
          const col = parseInt(cellWrapper.dataset.col || '-1');
          if (row >= 0 && col >= 0) {
            setDragOverCell({ row, col });
          }
        } else {
          setDragOverCell(null);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Check where we ended up
      const touch = e.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Check if dropping on player rack
      const rack = element?.closest('.player-rack[data-player-rack="current"]');
      if (rack && handleDropToRackRef.current) {
        handleDropToRackRef.current();
      } else {
        // Try to drop on board cell
        const currentDragOverCell = dragOverCell;
        if (currentDragOverCell && handleDropTileRef.current) {
          handleDropTileRef.current(currentDragOverCell.row, currentDragOverCell.col);
        }
      }
      
      setDraggingTile(null);
      setDragPosition(null);
      setDragOverCell(null);
      setDragSourceCell(null);
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingTile, dragOverCell]);

  const handleDragStart = useCallback((e: React.DragEvent, tile: Tile) => {
    // This is from the rack - allow drag
    setDraggingTile(tile);
    setDragPosition({ x: e.clientX, y: e.clientY });
    setDragSourceCell(null);
    e.dataTransfer.effectAllowed = 'move';
    
    // Hide the default drag image
    const emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  }, []);

  // Touch handlers for mobile drag and drop
  const handleTouchStart = useCallback((e: React.TouchEvent, tile: Tile) => {
    e.preventDefault();
    const touch = e.touches[0];
    setDraggingTile(tile);
    setDragPosition({ x: touch.clientX, y: touch.clientY });
    setDragSourceCell(null);
  }, []);

  const handleBoardTileTouchStart = useCallback((e: React.TouchEvent, tile: Tile, row: number, col: number) => {
    e.preventDefault();
    const touch = e.touches[0];
    setDraggingTile(tile);
    setDragPosition({ x: touch.clientX, y: touch.clientY });
    setDragSourceCell({ row, col });
  }, []);

  const handleBoardTileDragStart = useCallback((e: React.DragEvent, tile: Tile, row: number, col: number) => {
    // Dragging a tile from the board that was placed this turn
    setDraggingTile(tile);
    setDragPosition({ x: e.clientX, y: e.clientY });
    setDragSourceCell({ row, col });
    e.dataTransfer.effectAllowed = 'move';
    
    // Hide the default drag image
    const emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTile(null);
    setDragPosition(null);
    setDragOverCell(null);
    setDragSourceCell(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverCell({ row, col });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleDropTile = useCallback((row: number, col: number) => {
    if (!draggingTile) return;
    
    // Check if cell is already occupied (and not the source cell)
    if (gameState.board[row][col].tile && 
        !(dragSourceCell && dragSourceCell.row === row && dragSourceCell.col === col)) {
      setDraggingTile(null);
      setDragOverCell(null);
      setDragSourceCell(null);
      return;
    }

    // If dropping on the same cell, do nothing
    if (dragSourceCell && dragSourceCell.row === row && dragSourceCell.col === col) {
      setDraggingTile(null);
      setDragOverCell(null);
      setDragSourceCell(null);
      return;
    }

    setGameState((prev) => {
      const newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
      
      // If dragging from board, clear the source cell
      if (dragSourceCell) {
        newBoard[dragSourceCell.row][dragSourceCell.col] = {
          ...newBoard[dragSourceCell.row][dragSourceCell.col],
          tile: null,
          isNewlyPlaced: false,
        };
      }
      
      newBoard[row][col] = {
        ...newBoard[row][col],
        tile: draggingTile,
        isNewlyPlaced: true,
      };

      // Only update rack if dragging from rack (not from board)
      let newPlayers = prev.players;
      if (!dragSourceCell) {
        newPlayers = [...prev.players] as [Player, Player];
        newPlayers[prev.currentPlayerIndex] = {
          ...newPlayers[prev.currentPlayerIndex],
          rack: newPlayers[prev.currentPlayerIndex].rack.filter(
            (t) => t.id !== draggingTile.id
          ),
        };
      }

      // Update placed tiles tracking
      let newPlacedThisTurn: PlacedTile[];
      if (dragSourceCell) {
        // Moving tile on board - update the position
        newPlacedThisTurn = prev.placedThisTurn.map((p) =>
          p.tile.id === draggingTile.id ? { row, col, tile: draggingTile } : p
        );
      } else {
        // New tile from rack
        newPlacedThisTurn = [
          ...prev.placedThisTurn,
          { row, col, tile: draggingTile },
        ];
      }

      return {
        ...prev,
        board: newBoard,
        players: newPlayers,
        placedThisTurn: newPlacedThisTurn,
      };
    });

    setDraggingTile(null);
    setDragOverCell(null);
    setDragSourceCell(null);
    setMessage(null);
  }, [draggingTile, gameState.board, dragSourceCell]);

  // Handle dropping a tile back to the rack (only for tiles placed this turn)
  const handleDropToRack = useCallback(() => {
    if (!draggingTile || !dragSourceCell) return;
    
    // Verify this tile was placed this turn
    const placedTile = gameState.placedThisTurn.find(p => p.tile.id === draggingTile.id);
    if (!placedTile) return;

    setGameState((prev) => {
      const newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
      
      // Clear the tile from the board
      newBoard[dragSourceCell.row][dragSourceCell.col] = {
        ...newBoard[dragSourceCell.row][dragSourceCell.col],
        tile: null,
        isNewlyPlaced: false,
      };

      // Add tile back to rack
      const newPlayers = [...prev.players] as [Player, Player];
      newPlayers[prev.currentPlayerIndex] = {
        ...newPlayers[prev.currentPlayerIndex],
        rack: [...newPlayers[prev.currentPlayerIndex].rack, draggingTile],
      };

      // Remove from placed tiles tracking
      const newPlacedThisTurn = prev.placedThisTurn.filter(
        p => p.tile.id !== draggingTile.id
      );

      return {
        ...prev,
        board: newBoard,
        players: newPlayers,
        placedThisTurn: newPlacedThisTurn,
      };
    });

    setDraggingTile(null);
    setDragOverCell(null);
    setDragSourceCell(null);
  }, [draggingTile, dragSourceCell, gameState.placedThisTurn]);

  // Ref for handleDropToRack for touch handlers
  const handleDropToRackRef = useRef<(() => void) | null>(null);

  // Keep ref updated with latest handleDropTile
  useEffect(() => {
    handleDropTileRef.current = handleDropTile;
  }, [handleDropTile]);


  const handleRecallTiles = useCallback(() => {
    // Calculate target positions in the rack
    const currentRackLength = gameState.players[gameState.currentPlayerIndex].rack.length;

    // Start animation by setting recalling tiles with target positions
    const tilesToRecall = gameState.placedThisTurn.map((placed, index) => ({
      tile: placed.tile,
      row: placed.row,
      col: placed.col,
      targetIndex: currentRackLength + index // Position in the rack after adding tiles back
    }));

    setRecallingTiles(tilesToRecall);

    // After animation completes, update game state
    setTimeout(() => {
      setGameState((prev) => {
        const newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
        const tilesReturned: Tile[] = [];

        // Remove placed tiles from board
        for (const placed of prev.placedThisTurn) {
          newBoard[placed.row][placed.col] = {
            ...newBoard[placed.row][placed.col],
            tile: null,
            isNewlyPlaced: false,
          };
          tilesReturned.push(placed.tile);
        }

        // Return tiles to player's rack
        const newPlayers = [...prev.players] as [Player, Player];
        newPlayers[prev.currentPlayerIndex] = {
          ...newPlayers[prev.currentPlayerIndex],
          rack: [...newPlayers[prev.currentPlayerIndex].rack, ...tilesReturned],
        };

        return {
          ...prev,
          board: newBoard,
          players: newPlayers,
          placedThisTurn: [],
        };
      });
      setRecallingTiles([]);
      setMessage(null);
    }, 600); // Match CSS animation duration
  }, [gameState.placedThisTurn, gameState.players, gameState.currentPlayerIndex]);

  const handleSubmitWord = useCallback(() => {
    if (!dictionaryLoaded) {
      setMessage({ text: 'Dictionary is still loading...', type: 'info' });
      return;
    }

    if (gameState.placedThisTurn.length === 0) {
      setMessage({ text: 'Place at least one tile before submitting', type: 'error' });
      return;
    }

    // Validate the placement
    const placedPositions = gameState.placedThisTurn.map((p) => ({ row: p.row, col: p.col }));
    const result = findWordsFromPlacement(gameState.board, placedPositions, gameState.isFirstMove);

    if (!result.isValid) {
      const errorMessage = result.errors[0] || 'Invalid placement';
      const isInvalidWordError = errorMessage.includes('Cannot form valid words');
      
      // Expert mode: end turn on invalid word (but not placement errors)
      if (expertMode && isInvalidWordError) {
        setMessage({ text: `${errorMessage} - Turn lost!`, type: 'error' });

        // Return tiles to rack and switch turns
        setGameState((prev) => {
          const newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
          const tilesReturned: Tile[] = [];

          // Remove placed tiles from board
          for (const placed of prev.placedThisTurn) {
            tilesReturned.push(placed.tile);
            newBoard[placed.row][placed.col] = {
              ...newBoard[placed.row][placed.col],
              tile: null,
              isNewlyPlaced: false,
            };
          }

          // Return tiles to current player's rack
          const newPlayers = [...prev.players] as [Player, Player];
          newPlayers[prev.currentPlayerIndex] = {
            ...newPlayers[prev.currentPlayerIndex],
            rack: [...newPlayers[prev.currentPlayerIndex].rack, ...tilesReturned],
          };

          // Switch to next player
          const nextPlayerIndex = prev.currentPlayerIndex === 0 ? 1 : 0;
          setRackRevealState({ activeRack: prev.currentPlayerIndex, readyPending: true });

          return {
            ...prev,
            board: newBoard,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            placedThisTurn: [],
            turnNumber: prev.turnNumber + 1,
          };
        });
        return;
      }
      
      setMessage({ text: errorMessage, type: 'error' });
      return;
    }

    // Valid play! Update score and switch turns
    setGameState((prev) => {
      // Clear newly placed flags and mark tiles with player ID
      const newBoard = prev.board.map((r) =>
        r.map((c) => ({
          ...c,
          isNewlyPlaced: false,
          // Mark tiles that were just placed with the current player's ID
          placedByPlayer: c.isNewlyPlaced ? prev.currentPlayerIndex : c.placedByPlayer
        }))
      );

      // Update score
      const newPlayers = [...prev.players] as [Player, Player];
      newPlayers[prev.currentPlayerIndex] = {
        ...newPlayers[prev.currentPlayerIndex],
        score: newPlayers[prev.currentPlayerIndex].score + result.totalScore,
      };

      // Draw new tiles
      const tilesToDraw = Math.min(prev.placedThisTurn.length, prev.tileBag.length);
      const { drawn, remaining } = drawTiles(prev.tileBag, tilesToDraw);
      newPlayers[prev.currentPlayerIndex] = {
        ...newPlayers[prev.currentPlayerIndex],
        rack: [...newPlayers[prev.currentPlayerIndex].rack, ...drawn],
      };

      // Check for game over
      const currentPlayerOutOfTiles = newPlayers[prev.currentPlayerIndex].rack.length === 0 && remaining.length === 0;
      const isGameOver = currentPlayerOutOfTiles;
      
      let winner: number | null = null;
      if (isGameOver) {
        // The player who used all their tiles wins if scores are equal
        winner = newPlayers[0].score >= newPlayers[1].score ? 0 : 1;
      }

      // Switch to next player
      const nextPlayerIndex = prev.currentPlayerIndex === 0 ? 1 : 0;
      setRackRevealState({ activeRack: prev.currentPlayerIndex, readyPending: true });
      return {
        ...prev,
        board: newBoard,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        tileBag: remaining,
        turnNumber: prev.turnNumber + 1,
        placedThisTurn: [],
        isFirstMove: false,
        gameOver: isGameOver,
        winner,
      };
    });

    // Check if game is over after state update
    setGameState(prev => {
      if (prev.gameOver) {
        setGamePhase('gameOver');
      }
      return prev;
    });

    const wordsPlayed = result.words.map((w) => w.word.toUpperCase()).join(', ');
    setMessage({ 
      text: `+${result.totalScore} points! Words: ${wordsPlayed}`, 
      type: 'success' 
    });
  }, [dictionaryLoaded, gameState.placedThisTurn, gameState.board, gameState.isFirstMove, expertMode]);

  const handlePass = useCallback(() => {
    // Return any placed tiles
    handleRecallTiles();
    // Switch turns
    setGameState((prev) => {
      const nextPlayerIndex = prev.currentPlayerIndex === 0 ? 1 : 0;
      setRackRevealState({ activeRack: prev.currentPlayerIndex, readyPending: true });
      return {
        ...prev,
        currentPlayerIndex: nextPlayerIndex,
        turnNumber: prev.turnNumber + 1,
      };
    });
    setMessage({ text: 'Turn passed', type: 'info' });
  }, [handleRecallTiles]);

  // Exchange tiles handlers
  const handleToggleExchangeMode = useCallback(() => {
    setExchangeMode((prev) => !prev);
    setSelectedForExchange(new Set());
  }, []);

  const handleToggleTileSelection = useCallback((tile: Tile) => {
    setSelectedForExchange((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tile.id)) {
        newSet.delete(tile.id);
      } else {
        newSet.add(tile.id);
      }
      return newSet;
    });
  }, []);

  const handleConfirmExchange = useCallback(() => {
    if (selectedForExchange.size === 0) return;
    if (gameState.tileBag.length < selectedForExchange.size) {
      setMessage({ text: 'Not enough tiles in the bag', type: 'error' });
      return;
    }

    setGameState((prev) => {
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      
      // Separate tiles to exchange and tiles to keep
      const tilesToExchange = currentPlayer.rack.filter((t) => selectedForExchange.has(t.id));
      const tilesToKeep = currentPlayer.rack.filter((t) => !selectedForExchange.has(t.id));
      
      // Draw new tiles from bag
      const { drawn, remaining } = drawTiles(prev.tileBag, tilesToExchange.length);
      
      // Put exchanged tiles back in bag and shuffle
      const newBag = [...remaining, ...tilesToExchange];
      // Shuffle the bag
      for (let i = newBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
      }
      
      // Update player's rack
      const newPlayers = [...prev.players] as [Player, Player];
      newPlayers[prev.currentPlayerIndex] = {
        ...currentPlayer,
        rack: [...tilesToKeep, ...drawn],
      };

      // Switch to next player
      const nextPlayerIndex = prev.currentPlayerIndex === 0 ? 1 : 0;
      setRackRevealState({ activeRack: prev.currentPlayerIndex, readyPending: true });

      return {
        ...prev,
        players: newPlayers,
        tileBag: newBag,
        currentPlayerIndex: nextPlayerIndex,
        turnNumber: prev.turnNumber + 1,
      };
    });

    setExchangeMode(false);
    setSelectedForExchange(new Set());
    setMessage({ text: `Exchanged ${selectedForExchange.size} tile(s)`, type: 'info' });
  }, [selectedForExchange, gameState.tileBag.length]);

  const handleStartGame = useCallback(() => {
    // Save player settings for future sessions
    let name1 = player1Name.trim() || 'Player 1';
    let name2 = player2Name.trim() || 'Player 2';
    let color1 = player1Color;
    let color2 = player2Color;

    // Randomize player order if enabled
    if (randomizePlayer1 && Math.random() < 0.5) {
      [name1, name2] = [name2, name1];
      [color1, color2] = [color2, color1];
    }

    savePlayerSettings({
      player1: { name: name1, color: color1 },
      player2: { name: name2, color: color2 }
    });
    saveGameSettings({ expertMode, hidePlayerTiles, randomizePlayer1, showPlayerColorOnTiles });

    clearGameState();
    const newGame = initializeGame(name1, name2);
    setGameState(newGame);
    setGamePhase('playing');
    setDraggingTile(null);
    setDragPosition(null);
    setDragOverCell(null);
    setDragSourceCell(null);
    setExchangeMode(false);
    setSelectedForExchange(new Set());
    setMessage(null);
    setShowAdditionalOptions(false);
    setShowColorPicker(null);

    // If hidePlayerTiles is enabled, require first player to click "Player ready"
    if (hidePlayerTiles) {
      setRackRevealState({ activeRack: -1, readyPending: true });
    } else {
      setRackRevealState({ activeRack: 0, readyPending: false });
    }
  }, [player1Name, player2Name, player1Color, player2Color, expertMode, hidePlayerTiles, randomizePlayer1, showPlayerColorOnTiles]);

  const handleNewGame = useCallback(() => {
    // Show start modal when clicking New Game
    setGamePhase('start');
    setShowAdditionalOptions(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    // Only allow closing if there's an existing game in progress
    const saved = loadGameState();
    if (saved && !saved.gameOver) {
      setGamePhase('playing');
    }
  }, []);

  const handleEscapeHatch = useCallback(() => {
    // Clear existing timeout
    if (escapeHatchTimeoutRef.current) {
      clearTimeout(escapeHatchTimeoutRef.current);
    }

    const newCount = escapeHatchTaps + 1;
    setEscapeHatchTaps(newCount);

    // Show countdown message after 4 taps
    if (newCount >= 4 && newCount < 8) {
      const remaining = 8 - newCount;
      setMessage({
        text: `${remaining} more tap${remaining === 1 ? '' : 's'} to reset game...`,
        type: 'info'
      });
    }

    // Reset everything at 8 taps
    if (newCount >= 8) {
      localStorage.clear();
      window.location.reload();
      return;
    }

    // Reset tap count after 2 seconds of inactivity
    escapeHatchTimeoutRef.current = setTimeout(() => {
      setEscapeHatchTaps(0);
    }, 2000);
  }, [escapeHatchTaps]);

  // Check if we can close the modal (has existing game)
  const canCloseModal = loadGameState() !== null && !loadGameState()?.gameOver;

  return (
    <div className="app">
      {/* Start Game Modal */}
      {gamePhase === 'start' && (
        <div className="modal-overlay">
          <div className="modal">
            {canCloseModal && (
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <span className="material-icons">close</span>
              </button>
            )}

            {!showAdditionalOptions ? (
              <>
                <h2>Scramble!</h2>
                <p>A word game for 2 players</p>
                <div className="player-name-inputs">
                  <div className="player-name-field">
                    <label htmlFor="player1-name">Player 1</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowColorPicker(showColorPicker === 1 ? null : 1)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid #8b4513',
                            background: player1Color,
                            cursor: 'pointer',
                            flexShrink: 0,
                            padding: 0
                          }}
                          aria-label="Choose color"
                        />
                        <input
                          id="player1-name"
                          type="text"
                          value={player1Name}
                          onChange={(e) => setPlayer1Name(e.target.value)}
                          placeholder="Player 1"
                          maxLength={20}
                          style={{ flex: 1 }}
                        />
                      </div>
                      {showColorPicker === 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '40px',
                          left: 0,
                          background: 'rgba(44, 24, 16, 0.98)',
                          border: '2px solid #8b4513',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          zIndex: 1000
                        }}>
                          {PLAYER_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setPlayer1Color(color);
                                setShowColorPicker(null);
                              }}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: player1Color === color ? '3px solid #ffd700' : '2px solid #8b4513',
                                background: color,
                                cursor: 'pointer',
                                padding: 0
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="player-name-field">
                    <label htmlFor="player2-name">Player 2</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowColorPicker(showColorPicker === 2 ? null : 2)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid #8b4513',
                            background: player2Color,
                            cursor: 'pointer',
                            flexShrink: 0,
                            padding: 0
                          }}
                          aria-label="Choose color"
                        />
                        <input
                          id="player2-name"
                          type="text"
                          value={player2Name}
                          onChange={(e) => setPlayer2Name(e.target.value)}
                          placeholder="Player 2"
                          maxLength={20}
                          style={{ flex: 1 }}
                        />
                      </div>
                      {showColorPicker === 2 && (
                        <div style={{
                          position: 'absolute',
                          top: '40px',
                          left: 0,
                          background: 'rgba(44, 24, 16, 0.98)',
                          border: '2px solid #8b4513',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          zIndex: 1000
                        }}>
                          {PLAYER_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setPlayer2Color(color);
                                setShowColorPicker(null);
                              }}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: player2Color === color ? '3px solid #ffd700' : '2px solid #8b4513',
                                background: color,
                                cursor: 'pointer',
                                padding: 0
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="game-settings">
                  <label className="toggle-setting">
                    <input
                      type="checkbox"
                      checked={expertMode}
                      onChange={(e) => setExpertMode(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      Expert Mode
                      <span className="toggle-subtext">Playing a wrong word ends turn</span>
                    </span>
                  </label>
                  <label className="toggle-setting">
                    <input
                      type="checkbox"
                      checked={hidePlayerTiles}
                      onChange={(e) => setHidePlayerTiles(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      Hide Player Tiles
                      <span className="toggle-subtext">Show ready prompt between turns</span>
                    </span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setShowAdditionalOptions(true)} className="start-game-btn" style={{ background: 'linear-gradient(180deg, #607d8b 0%, #455a64 100%)', flex: 1 }}>
                    Options
                  </button>
                  <button onClick={handleStartGame} className="start-game-btn" style={{ flex: 1 }}>
                    Start Game
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>More Options</h2>
                <p>Configure advanced game settings</p>
                <div className="game-settings">
                  <label className="toggle-setting">
                    <input
                      type="checkbox"
                      checked={randomizePlayer1}
                      onChange={(e) => setRandomizePlayer1(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      Randomize Player 1
                      <span className="toggle-subtext">Randomly choose who goes first</span>
                    </span>
                  </label>
                  <label className="toggle-setting">
                    <input
                      type="checkbox"
                      checked={showPlayerColorOnTiles}
                      onChange={(e) => setShowPlayerColorOnTiles(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      Show player color on tiles
                      <span className="toggle-subtext">Color tiles after successful word</span>
                    </span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setShowAdditionalOptions(false)} className="start-game-btn" style={{ background: 'linear-gradient(180deg, #9e9e9e 0%, #757575 100%)', flex: 1 }}>
                    Back
                  </button>
                  <button onClick={handleStartGame} className="start-game-btn" style={{ flex: 1 }}>
                    Start Game
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {updateAvailable && (
        <div className="update-notification">
          <span>New version available!</span>
          <button onClick={() => {
            if (typeof (window as any).updateServiceWorker === 'function') {
              (window as any).updateServiceWorker();
            } else {
              window.location.reload();
            }
          }} className="update-btn">
            Update Now
          </button>
          <button onClick={() => setUpdateAvailable(false)} className="update-dismiss">
            ✕
          </button>
        </div>
      )}

      <header className="header">
        <h1 onClick={handleEscapeHatch} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Scramble <span className="version">v{VERSION}</span>
        </h1>
        <div className="game-info">
          <button onClick={handleNewGame} className="new-game-btn">
            New Game
          </button>
        </div>
      </header>

      <main className="game-container">
        <div className="game-layout">
          <div className="game-spacer-left"></div>
          
          <div className="game-main">
            {gamePhase === 'gameOver' && (
              <div className="game-over">
                <h2>Game Over!</h2>
                <p>{gameState.players[gameState.winner!].name} wins with {gameState.players[gameState.winner!].score} points!</p>
              </div>
            )}

            <GameBoard
              board={gameState.board}
              onDropTile={handleDropTile}
              dragOverCell={dragOverCell}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onTileDragStart={handleBoardTileDragStart}
              onTileDragEnd={handleDragEnd}
              onTileTouchStart={handleBoardTileTouchStart}
              draggingTileId={draggingTile?.id ?? null}
              showPlayerColorOnTiles={showPlayerColorOnTiles}
              players={gameState.players}
            />

            {/* Recalling tiles animation */}
            {recallingTiles.map((recalling, index) => {
              // Get actual board cell position from DOM
              const boardCell = document.querySelector(
                `[data-row="${recalling.row}"][data-col="${recalling.col}"]`
              );

              // Get actual rack container position from DOM
              const rackContainer = document.querySelector(
                `.player-rack.current-player`
              );

              if (!boardCell || !rackContainer) {
                return null;
              }

              const cellRect = boardCell.getBoundingClientRect();
              const rackRect = rackContainer.getBoundingClientRect();

              // Start position (center of board cell)
              const startX = cellRect.left + cellRect.width / 2;
              const startY = cellRect.top + cellRect.height / 2;

              // Target position (approximate position in rack based on target index)
              // Rack tiles are approximately 60px wide with gaps
              const rackTileWidth = rackRect.width / (gameState.players[gameState.currentPlayerIndex].rack.length + recallingTiles.length);
              const targetX = rackRect.left + (recalling.targetIndex * rackTileWidth) + rackTileWidth / 2;
              const targetY = rackRect.top + rackRect.height / 2;

              // Calculate translation distances
              const translateX = targetX - startX;
              const translateY = targetY - startY;

              return (
                <div
                  key={`recalling-${recalling.tile.id}-${index}`}
                  className="recalling-tile"
                  style={{
                    left: `${startX}px`,
                    top: `${startY}px`,
                    '--tile-delay': `${index * 0.05}s`,
                    '--translate-x': `${translateX}px`,
                    '--translate-y': `${translateY}px`
                  } as React.CSSProperties}
                >
                  <div className="tile">
                    <span className="tile-letter">{recalling.tile.letter}</span>
                    {!recalling.tile.isBlank && <span className="tile-points">{recalling.tile.points}</span>}
                  </div>
                </div>
              );
            })}

            <div className="turn-controls">
              <button
                onClick={handlePass}
                disabled={gameState.gameOver || (hidePlayerTiles && rackRevealState.readyPending)}
                className="control-btn pass-btn"
              >
                Pass Turn
              </button>
              <button 
                onClick={handleRecallTiles} 
                disabled={gameState.placedThisTurn.length === 0 || gameState.gameOver}
                className="control-btn recall-btn"
              >
                Recall Tiles
              </button>
              <button 
                onClick={handleSubmitWord} 
                disabled={gameState.placedThisTurn.length === 0 || gameState.gameOver}
                className="control-btn submit-btn"
              >
                Submit Word
              </button>
            </div>
          </div>

          <aside className={`game-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button 
              className="sidebar-toggle" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
            >
              <span className="sidebar-toggle-content">
                <span className="sidebar-toggle-left">
                  <span className="material-icons">{sidebarOpen ? 'expand_less' : 'expand_more'}</span>
                  <span>Tile Bag ({gameState.tileBag.length})</span>
                </span>
                <span className="sidebar-toggle-turn">Turn {gameState.turnNumber}</span>
              </span>
            </button>
            <div className="sidebar-content">
              <div className="tile-bag-info">
                <h3>Tile Bag</h3>
                <div className="tile-count">{gameState.tileBag.length}</div>
                <span className="tile-label">tiles remaining</span>
              </div>
              
              <div className="letter-distribution">
                <h3>Letters Left</h3>
                <div className="letter-grid">
                  {(() => {
                    const counts = countTilesByLetter(gameState.tileBag);
                    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?'.split('');
                    return letters.map((letter) => {
                      const count = counts.get(letter) || 0;
                      return (
                        <div 
                          key={letter} 
                          className={`letter-item ${count === 0 ? 'empty' : ''}`}
                          title={`${letter === '?' ? 'Blank' : letter}: ${count}`}
                        >
                          <span className="letter">{letter}</span>
                          <span className="count">{count}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              <div className="turn-info">
                <h3>Turn</h3>
                <div className="turn-number">{gameState.turnNumber}</div>
              </div>
            </div>
          </aside>
        </div>

        <div className="player-racks">
          {gameState.players.map((player, index) => {
            // Determine rack state
            // Only obscure the rack of the player whose turn it is NOT
            const isCurrentPlayer = gameState.currentPlayerIndex === index;
            // Show Ready button overlay if hidePlayerTiles is enabled and it's the current player's turn, but rackRevealState is not yet updated
            const showReadyButton = hidePlayerTiles && rackRevealState.readyPending && isCurrentPlayer && rackRevealState.activeRack !== index;
            // Obscure rack only if hidePlayerTiles is enabled and (not current player OR showing Ready button)
            const isObscuredRack = (hidePlayerTiles && !isCurrentPlayer) || showReadyButton;
            // If obscured, blank out tiles and points
            const rackTiles = isObscuredRack
              ? player.rack.map((t) => ({ ...t, letter: '', points: 0, isBlank: false }))
              : player.rack;
            return (
              <div key={player.id} className="player-section">
                <div
                  className={`score-card ${index === gameState.currentPlayerIndex ? 'current' : ''}`}
                  style={index === gameState.currentPlayerIndex ? {
                    borderColor: getPlayerColor(player.name),
                    boxShadow: `0 0 20px ${getPlayerColor(player.name)}33`
                  } : undefined}
                >
                  <span className="score-value" style={{
                    color: getPlayerColor(player.name)
                  }}>{player.score}</span>
                  {index === gameState.currentPlayerIndex && (
                    <span className="turn-indicator" style={{
                      background: getPlayerColor(player.name)
                    }}>Your Turn</span>
                  )}
                </div>
                <div style={{
                  position: 'relative',
                  ...(isObscuredRack && !showReadyButton ? { pointerEvents: 'none', filter: 'blur(0.5px)' } : {})
                }}>
                  <PlayerRack
                    tiles={rackTiles}
                    playerName={player.name}
                    score={player.score}
                    isCurrentPlayer={index === gameState.currentPlayerIndex}
                    playerColor={getPlayerColor(player.name)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    draggingTileId={draggingTile?.id ?? null}
                    exchangeMode={index === gameState.currentPlayerIndex && exchangeMode}
                    selectedForExchange={selectedForExchange}
                    onToggleExchangeMode={handleToggleExchangeMode}
                    onToggleTileSelection={handleToggleTileSelection}
                    onConfirmExchange={handleConfirmExchange}
                    canExchange={gameState.tileBag.length >= 1}
                    tilesPlacedThisTurn={gameState.placedThisTurn.length > 0}
                    onDropToRack={index === gameState.currentPlayerIndex ? handleDropToRack : undefined}
                  />
                  {showReadyButton && (
                    <div className="ready-overlay" style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      zIndex: 10,
                      background: 'rgba(30, 30, 30, 0.85)'
                    }}>
                      <button
                        className="ready-btn"
                        style={{
                          fontSize: 32,
                          padding: '32px 64px',
                          borderRadius: 16,
                          background: 'linear-gradient(180deg, #ffd700 0%, #daa520 100%)',
                          color: '#2c1810',
                          fontWeight: 'bold',
                          border: '4px solid #8b4513',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setRackRevealState({ activeRack: index, readyPending: false })}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
                        }}
                      >
                        {player.name} ready!
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating drag preview */}
      {draggingTile && dragPosition && (
        <div
          className="drag-preview"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
          }}
        >
          <div className={`tile ${draggingTile.isBlank ? 'blank' : ''}`}>
            <span className="tile-letter">{draggingTile.isBlank ? '?' : draggingTile.letter}</span>
            <span className="tile-points">{draggingTile.points}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
