import type { Tile } from '../types';
import './Tile.css';

interface TileProps {
  tile: Tile;
  isDragging?: boolean;
  isSelected?: boolean;
  onDragStart?: (e: React.DragEvent, tile: Tile) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: (tile: Tile) => void;
}

export function TileComponent({ tile, isDragging, isSelected, onDragStart, onDragEnd, onClick }: TileProps) {
  return (
    <div
      className={`tile ${isDragging ? 'dragging' : ''} ${tile.isBlank ? 'blank' : ''} ${isSelected ? 'selected' : ''}`}
      draggable={!onClick}
      onDragStart={(e) => onDragStart?.(e, tile)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onClick={() => onClick?.(tile)}
    >
      <span className="tile-letter">{tile.isBlank ? '?' : tile.letter}</span>
      <span className="tile-points">{tile.points}</span>
    </div>
  );
}
