import { useEffect, useRef } from 'react';
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
  const tileRef = useRef<HTMLDivElement>(null);

  // Use ref to register touchstart with { passive: false } to allow preventDefault
  useEffect(() => {
    const element = tileRef.current;
    if (!element || !onTouchStart) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Wrap native TouchEvent in a React.TouchEvent-compatible object
      const syntheticEvent = {
        nativeEvent: e,
        currentTarget: e.currentTarget as EventTarget & HTMLDivElement,
        target: e.target as EventTarget & HTMLDivElement,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented,
        eventPhase: e.eventPhase,
        isTrusted: e.isTrusted,
        preventDefault: () => e.preventDefault(),
        isDefaultPrevented: () => e.defaultPrevented,
        stopPropagation: () => e.stopPropagation(),
        isPropagationStopped: () => false,
        persist: () => {},
        timeStamp: e.timeStamp,
        type: e.type,
        touches: e.touches,
        changedTouches: e.changedTouches,
        targetTouches: e.targetTouches,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        getModifierState: (_key: string) => false,
      } as unknown as React.TouchEvent;

      onTouchStart(syntheticEvent, tile);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
    };
  }, [onTouchStart, tile]);

  // Build custom style for player-colored letter
  const letterStyle: React.CSSProperties = playerColor
    ? { color: playerColor }
    : {};

  return (
    <div
      ref={tileRef}
      className={`tile ${isDragging ? 'dragging' : ''} ${tile.isBlank ? 'blank' : ''} ${isSelected ? 'selected' : ''}`}
      draggable={!onClick}
      onDragStart={(e) => onDragStart?.(e, tile)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onClick={() => onClick?.(tile)}
      data-testid={`tile-${tile.id}`}
    >
      <span className="tile-letter" style={letterStyle}>
        {tile.isBlank && tile.letter === '' ? '?' : tile.letter}
      </span>
      {!tile.isBlank && <span className="tile-points">{tile.letter === '' ? '' : tile.points}</span>}
    </div>
  );
}
