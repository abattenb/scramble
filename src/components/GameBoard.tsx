import type { BoardCell, Tile, Player } from '../types';
import { TileComponent } from './Tile';
import './GameBoard.css';

interface GameBoardProps {
  board: BoardCell[][];
  onDropTile: (row: number, col: number) => void;
  dragOverCell: { row: number; col: number } | null;
  onDragOver: (e: React.DragEvent, row: number, col: number) => void;
  onDragLeave: () => void;
  onTileDragStart?: (e: React.DragEvent, tile: Tile, row: number, col: number) => void;
  onTileDragEnd?: () => void;
  onTileTouchStart?: (e: React.TouchEvent, tile: Tile, row: number, col: number) => void;
  draggingTileId?: string | null;
  showPlayerColorOnTiles?: boolean;
  players?: [Player, Player];
}

function getBonusLabel(bonus: BoardCell['bonus']): string {
  switch (bonus) {
    case 'triple-word': return 'TW';
    case 'double-word': return 'DW';
    case 'triple-letter': return 'TL';
    case 'double-letter': return 'DL';
    case 'center': return '★';
    default: return '';
  }
}

export function GameBoard({
  board,
  onDropTile,
  dragOverCell,
  onDragOver,
  onDragLeave,
  onTileDragStart,
  onTileDragEnd,
  onTileTouchStart,
  draggingTileId,
  showPlayerColorOnTiles = false,
  players,
}: GameBoardProps) {
  // Helper to get player color by player index
  const getPlayerColorByIndex = (playerIndex: number | undefined): string | undefined => {
    if (!showPlayerColorOnTiles || playerIndex === undefined || !players) {
      return undefined;
    }
    // Load player settings to get colors
    const PLAYER_COLORS = [
      '#00838f', // Teal
      '#d32f2f', // Red
      '#388e3c', // Green
      '#1976d2', // Blue
      '#8e24aa', // Purple
      '#f57c00', // Orange
    ];
    try {
      const saved = localStorage.getItem('scramble-player-names');
      if (saved) {
        const settings = JSON.parse(saved);
        const player = players[playerIndex];
        if (player.name === settings.player1.name) {
          return settings.player1.color;
        }
        if (player.name === settings.player2.name) {
          return settings.player2.color;
        }
      }
    } catch (error) {
      // Fallback to default colors
    }
    return PLAYER_COLORS[playerIndex] || undefined;
  };
  return (
    <div className="game-board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, colIndex) => {
            const isDragOver = 
              dragOverCell?.row === rowIndex && 
              dragOverCell?.col === colIndex;
            const isDragging = cell.tile?.id === draggingTileId;
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="board-cell-wrapper"
                data-row={rowIndex}
                data-col={colIndex}
                onDrop={() => onDropTile(rowIndex, colIndex)}
                onDragOver={(e) => {
                  e.preventDefault();
                  onDragOver(e, rowIndex, colIndex);
                }}
                onDragLeave={onDragLeave}
              >
                <div className={`board-cell ${cell.bonus} ${isDragOver ? 'drag-over' : ''} ${cell.isNewlyPlaced ? 'newly-placed' : ''}`}>
                  {cell.tile ? (
                    <TileComponent
                      tile={cell.tile}
                      isDragging={isDragging}
                      onDragStart={cell.isNewlyPlaced ? (e, tile) => onTileDragStart?.(e, tile, rowIndex, colIndex) : undefined}
                      onDragEnd={cell.isNewlyPlaced ? onTileDragEnd : undefined}
                      onTouchStart={cell.isNewlyPlaced ? (e, tile) => onTileTouchStart?.(e, tile, rowIndex, colIndex) : undefined}
                      playerColor={getPlayerColorByIndex(cell.placedByPlayer)}
                    />
                  ) : (
                    <span className="bonus-label">{getBonusLabel(cell.bonus)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
