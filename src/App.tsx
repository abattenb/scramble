import { useState, useCallback, useEffect, useRef } from 'react';
import type { Tile, Player, GameState, PlacedTile } from './types';
import { createTileBag, drawTiles } from './data/tiles';
import { createEmptyBoard } from './data/board';
import { loadDictionary } from './data/dictionary';
import { findWordsFromPlacement } from './data/scoring';
import { GameBoard } from './components/GameBoard';
import { PlayerRack } from './components/PlayerRack';
import './App.css';

const STORAGE_KEY = 'scramble-game-state';
const PLAYER_NAMES_KEY = 'scramble-player-names';
const GAME_SETTINGS_KEY = 'scramble-game-settings';

interface GameSettings {
  expertMode: boolean;
}

function saveGameSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save game settings:', error);
  }
}

function loadGameSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(GAME_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved) as GameSettings;
    }
  } catch (error) {
    console.error('Failed to load game settings:', error);
  }
  return { expertMode: false };
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

function savePlayerNames(names: { player1: string; player2: string }): void {
  try {
    localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(names));
  } catch (error) {
    console.error('Failed to save player names:', error);
  }
}

function loadPlayerNames(): { player1: string; player2: string } {
  try {
    const saved = localStorage.getItem(PLAYER_NAMES_KEY);
    if (saved) {
      return JSON.parse(saved) as { player1: string; player2: string };
    }
  } catch (error) {
    console.error('Failed to load player names:', error);
  }
  return { player1: 'Player 1', player2: 'Player 2' };
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
  // Player names for the start modal
  const [player1Name, setPlayer1Name] = useState<string>(() => loadPlayerNames().player1);
  const [player2Name, setPlayer2Name] = useState<string>(() => loadPlayerNames().player2);
  // Game settings
  const [expertMode, setExpertMode] = useState<boolean>(() => loadGameSettings().expertMode);
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

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
        const cell = element?.closest('.board-cell') as HTMLElement;
        if (cell) {
          const row = parseInt(cell.dataset.row || '-1');
          const col = parseInt(cell.dataset.col || '-1');
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
    // eslint-disable-next-line react-hooks/immutability
    handleDropTileRef.current = handleDropTile;
  }, [handleDropTile]);

  // Keep ref updated with latest handleDropToRack
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    handleDropToRackRef.current = handleDropToRack;
  }, [handleDropToRack]);

  const handleRecallTiles = useCallback(() => {
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
    setMessage(null);
  }, []);

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
      const isInvalidWordError = errorMessage.includes('is not a valid word');
      
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
      // Clear newly placed flags
      const newBoard = prev.board.map((r) => 
        r.map((c) => ({ ...c, isNewlyPlaced: false }))
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
    setGameState((prev) => ({
      ...prev,
      currentPlayerIndex: prev.currentPlayerIndex === 0 ? 1 : 0,
      turnNumber: prev.turnNumber + 1,
    }));
    
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
    // Save player names and settings for future sessions
    const name1 = player1Name.trim() || 'Player 1';
    const name2 = player2Name.trim() || 'Player 2';
    savePlayerNames({ player1: name1, player2: name2 });
    saveGameSettings({ expertMode });
    
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
  }, [player1Name, player2Name, expertMode]);

  const handleNewGame = useCallback(() => {
    // Show start modal when clicking New Game
    setGamePhase('start');
  }, []);

  const handleCloseModal = useCallback(() => {
    // Only allow closing if there's an existing game in progress
    const saved = loadGameState();
    if (saved && !saved.gameOver) {
      setGamePhase('playing');
    }
  }, []);

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
            <h2>Welcome to Scramble!</h2>
            <p>A word game for 2 players</p>
            <div className="player-name-inputs">
              <div className="player-name-field">
                <label htmlFor="player1-name">Player 1</label>
                <input
                  id="player1-name"
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  placeholder="Player 1"
                  maxLength={20}
                />
              </div>
              <div className="player-name-field">
                <label htmlFor="player2-name">Player 2</label>
                <input
                  id="player2-name"
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  placeholder="Player 2"
                  maxLength={20}
                />
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
                  <span className="toggle-subtext">Wrong word ends turn</span>
                </span>
              </label>
            </div>
            <button onClick={handleStartGame} className="start-game-btn">
              Start Game
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <header className="header">
        <h1>Scramble <span className="version">v1.5.0</span></h1>
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
            />

            <div className="turn-controls">
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
              <button 
                onClick={handlePass} 
                disabled={gameState.gameOver}
                className="control-btn pass-btn"
              >
                Pass Turn
              </button>
            </div>
          </div>

          <aside className="game-sidebar">
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
          </aside>
        </div>

        <div className="player-racks">
          {gameState.players.map((player, index) => (
            <div key={player.id} className="player-section">
              <div className={`score-card ${index === gameState.currentPlayerIndex ? 'current' : ''}`}>
                <span className="score-value">{player.score}</span>
                {index === gameState.currentPlayerIndex && (
                  <span className="turn-indicator">Your Turn</span>
                )}
              </div>
              <PlayerRack
                tiles={player.rack}
                playerName={player.name}
                score={player.score}
                isCurrentPlayer={index === gameState.currentPlayerIndex}
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
            </div>
          ))}
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
