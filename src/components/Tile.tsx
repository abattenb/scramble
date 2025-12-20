import type { Tile } from '../types';
import './Tile.css';

interface TileProps {
  tile: Tile;
  isDragging?: boolean;
  isSelected?: boolean;
  onDragStart?: (e: React.DragEvent, tile: Tile) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: (tile: Tile) => void;
  onTouchStart?: (e: React.TouchEvent, tile: Tile) => void;
  playerColor?: string;
}

export function TileComponent({ tile, isDragging, isSelected, onDragStart, onDragEnd, onClick, onTouchStart, playerColor }: TileProps) {
  // Build custom style for player-colored letter
  const letterStyle: React.CSSProperties = playerColor
    ? { color: playerColor }
    : {};

  return (
    <div
      className={`tile ${isDragging ? 'dragging' : ''} ${tile.isBlank ? 'blank' : ''} ${isSelected ? 'selected' : ''}`}
      draggable={!onClick}
      onDragStart={(e) => onDragStart?.(e, tile)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onClick={() => onClick?.(tile)}
      onTouchStart={(e) => onTouchStart?.(e, tile)}
    >
      <span className="tile-letter" style={letterStyle}>{tile.isBlank ? '?' : tile.letter}</span>
      <span className="tile-points">{tile.letter === '' ? '' : tile.points}</span>
    </div>
  );
}
