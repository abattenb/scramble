import type { Tile } from '../types';
import { TileComponent } from './Tile';
import './PlayerRack.css';

interface PlayerRackProps {
  tiles: Tile[];
  playerName: string;
  isCurrentPlayer: boolean;
  onDragStart: (e: React.DragEvent, tile: Tile) => void;
  onDragEnd: (e: React.DragEvent) => void;
  draggingTileId: string | null;
}

export function PlayerRack({ 
  tiles, 
  playerName, 
  isCurrentPlayer, 
  onDragStart, 
  onDragEnd,
  draggingTileId 
}: PlayerRackProps) {
  return (
    <div className={`player-rack ${isCurrentPlayer ? 'current-player' : ''}`}>
      <div className="rack-header">
        <span className="player-name">{playerName}</span>
        {isCurrentPlayer && <span className="turn-indicator">Your Turn</span>}
      </div>
      <div className="rack-tiles">
        {tiles.map((tile) => (
          <TileComponent
            key={tile.id}
            tile={tile}
            isDragging={draggingTileId === tile.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
