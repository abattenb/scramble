import { useState, useCallback, useEffect } from 'react';
import type { Tile, Player, GameState, PlacedTile } from './types';
import { createTileBag, drawTiles } from './data/tiles';
import { createEmptyBoard } from './data/board';
import { loadDictionary } from './data/dictionary';
import { findWordsFromPlacement } from './data/scoring';
import { GameBoard } from './components/GameBoard';
import { PlayerRack } from './components/PlayerRack';
import './App.css';

// Count remaining tiles by letter
function countTilesByLetter(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const letter = tile.isBlank ? '?' : tile.letter;
    counts.set(letter, (counts.get(letter) || 0) + 1);
  }
  return counts;
}

function initializeGame(): GameState {
  const tileBag = createTileBag();
  
  // Draw 7 tiles for each player
  const { drawn: player1Tiles, remaining: bag1 } = drawTiles(tileBag, 7);
  const { drawn: player2Tiles, remaining: finalBag } = drawTiles(bag1, 7);
  
  const players: [Player, Player] = [
    { id: 1, name: 'Player 1', score: 0, rack: player1Tiles },
    { id: 2, name: 'Player 2', score: 0, rack: player2Tiles },
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

function App() {
  const [gameState, setGameState] = useState<GameState>(initializeGame);
  const [draggingTile, setDraggingTile] = useState<Tile | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Load dictionary on mount
  useEffect(() => {
    loadDictionary().then(() => {
      setDictionaryLoaded(true);
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, tile: Tile) => {
    // Only allow current player to drag their tiles
    if (!gameState.placedThisTurn.some((p) => p.tile.id === tile.id)) {
      // This is from the rack - allow drag
      setDraggingTile(tile);
      e.dataTransfer.effectAllowed = 'move';
    }
  }, [gameState.placedThisTurn]);

  const handleDragEnd = useCallback(() => {
    setDraggingTile(null);
    setDragOverCell(null);
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
    
    // Check if cell is already occupied
    if (gameState.board[row][col].tile) {
      setDraggingTile(null);
      setDragOverCell(null);
      return;
    }

    setGameState((prev) => {
      const newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
      newBoard[row][col] = {
        ...newBoard[row][col],
        tile: draggingTile,
        isNewlyPlaced: true,
      };

      // Remove tile from current player's rack
      const newPlayers = [...prev.players] as [Player, Player];
      newPlayers[prev.currentPlayerIndex] = {
        ...newPlayers[prev.currentPlayerIndex],
        rack: newPlayers[prev.currentPlayerIndex].rack.filter(
          (t) => t.id !== draggingTile.id
        ),
      };

      // Track placed tile
      const newPlacedThisTurn: PlacedTile[] = [
        ...prev.placedThisTurn,
        { row, col, tile: draggingTile },
      ];

      return {
        ...prev,
        board: newBoard,
        players: newPlayers,
        placedThisTurn: newPlacedThisTurn,
      };
    });

    setDraggingTile(null);
    setDragOverCell(null);
    setMessage(null);
  }, [draggingTile, gameState.board]);

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
      setMessage({ text: result.errors[0] || 'Invalid placement', type: 'error' });
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
      const gameOver = currentPlayerOutOfTiles;
      
      let winner: number | null = null;
      if (gameOver) {
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
        gameOver,
        winner,
      };
    });

    const wordsPlayed = result.words.map((w) => w.word.toUpperCase()).join(', ');
    setMessage({ 
      text: `+${result.totalScore} points! Words: ${wordsPlayed}`, 
      type: 'success' 
    });
  }, [dictionaryLoaded, gameState.placedThisTurn, gameState.board, gameState.isFirstMove]);

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

  const handleNewGame = useCallback(() => {
    setGameState(initializeGame());
    setDraggingTile(null);
    setDragOverCell(null);
    setMessage(null);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Scramble</h1>
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
            {gameState.gameOver && (
              <div className="game-over">
                <h2>Game Over!</h2>
                <p>{gameState.players[gameState.winner!].name} wins with {gameState.players[gameState.winner!].score} points!</p>
              </div>
            )}

            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <GameBoard
              board={gameState.board}
              onDropTile={handleDropTile}
              dragOverCell={dragOverCell}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
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
                <span className="score-name">{player.name}</span>
                <span className="score-value">{player.score}</span>
              </div>
              <PlayerRack
                tiles={player.rack}
                playerName={player.name}
                isCurrentPlayer={index === gameState.currentPlayerIndex}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                draggingTileId={draggingTile?.id ?? null}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
