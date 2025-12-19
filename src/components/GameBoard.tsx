import type { BoardCell, Tile } from '../types';
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
  draggingTileId?: string | null;
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
  draggingTileId,
}: GameBoardProps) {
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
                className={`board-cell ${cell.bonus} ${isDragOver ? 'drag-over' : ''} ${cell.isNewlyPlaced ? 'newly-placed' : ''}`}
                onDrop={() => onDropTile(rowIndex, colIndex)}
                onDragOver={(e) => {
                  e.preventDefault();
                  onDragOver(e, rowIndex, colIndex);
                }}
                onDragLeave={onDragLeave}
              >
                {cell.tile ? (
                  <TileComponent 
                    tile={cell.tile} 
                    isDragging={isDragging}
                    onDragStart={cell.isNewlyPlaced ? (e, tile) => onTileDragStart?.(e, tile, rowIndex, colIndex) : undefined}
                    onDragEnd={cell.isNewlyPlaced ? onTileDragEnd : undefined}
                  />
                ) : (
                  <span className="bonus-label">{getBonusLabel(cell.bonus)}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
