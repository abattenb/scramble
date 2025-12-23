import { TileComponent } from './Tile';
import type { Tile } from '../types';
import './BlankLetterSelector.css';

interface BlankLetterSelectorProps {
  onSelectLetter: (letter: string) => void;
}

export function BlankLetterSelector({ onSelectLetter }: BlankLetterSelectorProps) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="blank-selector-overlay">
      <div className="blank-selector-modal">
        <h2>Choose a letter for the blank tile</h2>
        <div className="blank-selector-grid">
          {letters.map((letter) => {
            // Create a tile object for each letter
            const tile: Tile = {
              id: `blank-selector-${letter}`,
              letter: letter,
              points: 0,
              isBlank: true
            };

            return (
              <div
                key={letter}
                className="blank-selector-tile-wrapper"
                onClick={() => onSelectLetter(letter)}
                data-testid={`blank-letter-${letter}`}
              >
                <TileComponent tile={tile} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
