import type { Tile } from '../types';
import './Tile.css';

interface TileProps {
  tile: Tile;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, tile: Tile) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function TileComponent({ tile, isDragging, onDragStart, onDragEnd }: TileProps) {
  return (
    <div
      className={`tile ${isDragging ? 'dragging' : ''} ${tile.isBlank ? 'blank' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, tile)}
      onDragEnd={(e) => onDragEnd?.(e)}
    >
      <span className="tile-letter">{tile.isBlank ? '' : tile.letter}</span>
      <span className="tile-points">{tile.isBlank ? '' : tile.points}</span>
    </div>
  );
}
