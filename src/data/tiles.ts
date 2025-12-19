import type { Tile, TileData } from '../types';
import tilesData from '../../scramble_tiles.json';

export function createTileBag(): Tile[] {
  const bag: Tile[] = [];
  let tileId = 0;

  (tilesData.tiles as TileData[]).forEach((tileData) => {
    for (let i = 0; i < tileData.count; i++) {
      bag.push({
        id: `tile-${tileId++}`,
        letter: tileData.letter,
        points: tileData.points,
        isBlank: tileData.isBlank || false,
      });
    }
  });

  return shuffleBag(bag);
}

export function shuffleBag(bag: Tile[]): Tile[] {
  const shuffled = [...bag];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, count);
  const remaining = bag.slice(count);
  return { drawn, remaining };
}
