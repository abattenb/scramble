import './GameMessage.css';

interface GameMessageProps {
  text: string;
  type: 'success' | 'error' | 'info';
}

export function GameMessage({ text, type }: GameMessageProps) {
  return (
    <div className={`game-message game-message-${type}`}>
      {text}
    </div>
  );
}
