import type { Tile } from '../types';
import { TileComponent } from './Tile';
import './PlayerRack.css';

interface PlayerRackProps {
  tiles: Tile[];
  playerName: string;
  score: number;
  isCurrentPlayer: boolean;
  onDragStart: (e: React.DragEvent, tile: Tile) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent, tile: Tile) => void;
  draggingTileId: string | null;
  exchangeMode: boolean;
  selectedForExchange: Set<string>;
  onToggleExchangeMode: () => void;
  onToggleTileSelection: (tile: Tile) => void;
  onConfirmExchange: () => void;
  canExchange: boolean;
  tilesPlacedThisTurn: boolean;
}

export function PlayerRack({ 
  tiles, 
  playerName, 
  score,
  isCurrentPlayer, 
  onDragStart, 
  onDragEnd,
  onTouchStart,
  draggingTileId,
  exchangeMode,
  selectedForExchange,
  onToggleExchangeMode,
  onToggleTileSelection,
  onConfirmExchange,
  canExchange,
  tilesPlacedThisTurn,
}: PlayerRackProps) {
  return (
    <div className={`player-rack ${isCurrentPlayer ? 'current-player' : ''} ${exchangeMode ? 'exchange-mode' : ''}`}>
      <div className="rack-header">
        <span className="player-name">{playerName}<span className="mobile-score"> - {score}</span></span>
        {isCurrentPlayer && exchangeMode && <span className="turn-indicator exchange">Select tiles to exchange</span>}
        {isCurrentPlayer && (
          <div className="rack-actions">
            {!exchangeMode ? (
              <button 
                className="exchange-btn"
                onClick={onToggleExchangeMode}
                disabled={!canExchange || tilesPlacedThisTurn}
                title={!canExchange ? "Not enough tiles in bag" : tilesPlacedThisTurn ? "Recall tiles first" : "Exchange tiles with the bag"}
              >
                Exchange Tiles
              </button>
            ) : (
              <>
                <button 
                  className="cancel-exchange-btn"
                  onClick={onToggleExchangeMode}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-exchange-btn"
                  onClick={onConfirmExchange}
                  disabled={selectedForExchange.size === 0}
                >
                  Confirm ({selectedForExchange.size})
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="rack-tiles">
        {tiles.map((tile) => (
          <TileComponent
            key={tile.id}
            tile={tile}
            isDragging={draggingTileId === tile.id}
            isSelected={selectedForExchange.has(tile.id)}
            onDragStart={exchangeMode ? undefined : onDragStart}
            onDragEnd={exchangeMode ? undefined : onDragEnd}
            onTouchStart={exchangeMode ? undefined : onTouchStart}
            onClick={exchangeMode ? onToggleTileSelection : undefined}
          />
        ))}
      </div>
    </div>
  );
}
