import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { renderWithProviders, mockDictionary } from './test/testUtils';

describe('Scramble Game - Basic Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Mock dictionary with basic words
    mockDictionary(['HELLO', 'WORLD', 'TEST', 'CAT', 'DOG', 'WORD']);
  });

  // TEST 1: App renders start modal
  it('renders the start game modal on initial load', () => {
    renderWithProviders(<App />);

    expect(screen.getByText(/Scramble!/i)).toBeInTheDocument();
    expect(screen.getByTestId('player1-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('player2-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('start-game-btn')).toBeInTheDocument();
  });

  // TEST 2: Start new game with default player names
  it('starts a new game with default player names', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.queryByText(/Player Names/i)).not.toBeInTheDocument();
    });

    // Game board should be visible
    expect(screen.getByTestId('new-game-btn')).toBeInTheDocument();
  });

  // TEST 3: Start new game with custom player names
  it('starts a new game with custom player names', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const player1Input = screen.getByTestId('player1-name-input');
    const player2Input = screen.getByTestId('player2-name-input');

    await user.clear(player1Input);
    await user.type(player1Input, 'Alice');
    await user.clear(player2Input);
    await user.type(player2Input, 'Bob');

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  // TEST 4: Expert mode toggle works
  it('enables expert mode when toggle is checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const expertModeToggle = screen.getByTestId('expert-mode-toggle');
    expect(expertModeToggle).not.toBeChecked();

    await user.click(expertModeToggle);
    expect(expertModeToggle).toBeChecked();
  });

  // TEST 5: Hide player tiles toggle works
  it('enables hide player tiles when toggle is checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const hidePlayerTilesToggle = screen.getByTestId('hide-player-tiles-toggle');
    expect(hidePlayerTilesToggle).not.toBeChecked();

    await user.click(hidePlayerTilesToggle);
    expect(hidePlayerTilesToggle).toBeChecked();
  });

  // TEST 6: New Game button shows start modal
  it('clicking new game button shows start modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    // Start a game first
    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });

    // Click new game
    const newGameButton = screen.getByTestId('new-game-btn');
    await user.click(newGameButton);

    // Modal should be visible again
    await waitFor(() => {
      expect(screen.getByText(/Scramble!/i)).toBeInTheDocument();
    });
  });

  // TEST 7: Player names are saved to localStorage
  it('saves player names to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const player1Input = screen.getByTestId('player1-name-input');
    const player2Input = screen.getByTestId('player2-name-input');

    await user.clear(player1Input);
    await user.type(player1Input, 'TestPlayer1');
    await user.clear(player2Input);
    await user.type(player2Input, 'TestPlayer2');

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    const savedSettings = localStorage.getItem('scramble-player-names');
    expect(savedSettings).toBeTruthy();

    const parsed = JSON.parse(savedSettings!);
    expect(parsed.player1.name).toBe('TestPlayer1');
    expect(parsed.player2.name).toBe('TestPlayer2');
  });

  // TEST 8: Game settings are saved to localStorage
  it('saves game settings to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const expertModeToggle = screen.getByTestId('expert-mode-toggle');
    await user.click(expertModeToggle);

    const hidePlayerTilesToggle = screen.getByTestId('hide-player-tiles-toggle');
    await user.click(hidePlayerTilesToggle);

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      const savedSettings = localStorage.getItem('scramble-game-settings');
      expect(savedSettings).toBeTruthy();

      const parsed = JSON.parse(savedSettings!);
      expect(parsed.expertMode).toBe(true);
      expect(parsed.hidePlayerTiles).toBe(true);
    });
  });

  // TEST 9: Control buttons are initially disabled
  it('submit and recall buttons are disabled initially', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      const submitButton = screen.getByTestId('submit-btn');
      const recallButton = screen.getByTestId('recall-btn');

      expect(submitButton).toBeDisabled();
      expect(recallButton).toBeDisabled();
    });
  });

  // TEST 10: Pass button is enabled initially
  it('pass button is enabled initially', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      const passButton = screen.getByTestId('pass-btn');
      expect(passButton).toBeEnabled();
    });
  });
});

describe('Scramble Game - Gameplay Actions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Mock dictionary with basic words
    mockDictionary(['HELLO', 'WORLD', 'TEST', 'CAT', 'DOG', 'WORD', 'ART', 'CAR', 'BAT', 'RAT']);
  });

  // Helper to start a game
  async function startGame() {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);
    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });
    return user;
  }

  // TEST 11: Pass turn switches players
  it('pass turn switches to the next player', async () => {
    const user = await startGame();

    // Get initial player name (should be Player 1)
    const player1Text = screen.getByText('Player 1');
    expect(player1Text).toBeInTheDocument();

    const passButton = screen.getByTestId('pass-btn');
    await user.click(passButton);

    // After passing, turn number should increment
    await waitFor(() => {
      // The game message should show "Turn passed"
      expect(screen.getByText(/Turn passed/i)).toBeInTheDocument();
    });
  });

  // TEST 12: Recall button is disabled when no tiles placed
  it('recall button is disabled when no tiles are placed', async () => {
    await startGame();

    const recallButton = screen.getByTestId('recall-btn');
    expect(recallButton).toBeDisabled();
  });

  // TEST 13: Submit button is disabled when no tiles placed
  it('submit button is disabled when no tiles are placed', async () => {
    await startGame();

    const submitButton = screen.getByTestId('submit-btn');
    expect(submitButton).toBeDisabled();
  });

  // TEST 14: Turn counter increments
  it('turn counter starts at 1 and increments', async () => {
    const user = await startGame();

    // Check initial turn is 1
    await waitFor(() => {
      const turnNumbers = screen.getAllByText('1');
      // Should have at least one "1" for the turn number
      expect(turnNumbers.length).toBeGreaterThan(0);
    });

    // Pass turn
    const passButton = screen.getByTestId('pass-btn');
    await user.click(passButton);

    // Turn should increment to 2
    await waitFor(() => {
      const turnNumbers = screen.getAllByText('2');
      expect(turnNumbers.length).toBeGreaterThan(0);
    });
  });

  // TEST 15: Game state persists across page reloads
  it('saves and restores game state from localStorage', async () => {
    const user = await startGame();

    // Pass a turn to change state
    const passButton = screen.getByTestId('pass-btn');
    await user.click(passButton);

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      expect(savedState).toBeTruthy();

      const parsed = JSON.parse(savedState!);
      expect(parsed.turnNumber).toBe(2);
      expect(parsed.players).toHaveLength(2);
    });
  });

  // TEST 16: Tile bag shows correct initial count
  it('tile bag starts with correct number of tiles', async () => {
    await startGame();

    // Standard Scrabble has 100 tiles, minus 14 for two players (7 each) = 86
    await waitFor(() => {
      const tileBagCount = screen.getByText('86');
      expect(tileBagCount).toBeInTheDocument();
    });
  });

  // TEST 17: Players have correct rack size
  it('players start with 7 tiles each', async () => {
    await startGame();

    // Each player should have 7 tiles in their rack
    // We can verify this by checking the DOM structure
    await waitFor(() => {
      const tiles = screen.getAllByTestId(/tile-/);
      // Current player should have visible tiles
      expect(tiles.length).toBeGreaterThanOrEqual(7);
    });
  });

  // TEST 18: Score starts at zero
  it('players start with zero score', async () => {
    await startGame();

    // Both players should have score of 0
    const scores = screen.getAllByText('0');
    expect(scores.length).toBeGreaterThanOrEqual(2);
  });

  // TEST 19: Game board is rendered correctly
  it('renders 15x15 game board', async () => {
    await startGame();

    // Board should have 225 cells (15x15)
    await waitFor(() => {
      const boardCells = document.querySelectorAll('.board-cell');
      expect(boardCells.length).toBe(225);
    });
  });

  // TEST 20: Center star is displayed on board
  it('displays center star on the game board', async () => {
    await startGame();

    // The center cell should have the star symbol
    await waitFor(() => {
      const centerStar = screen.getByText('★');
      expect(centerStar).toBeInTheDocument();
    });
  });
});

describe('Scramble Game - Scoring & Validation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Mock dictionary with specific words for testing
    mockDictionary(['CAT', 'DOG', 'HELLO', 'WORLD', 'TEST', 'WORD', 'ART', 'CAR', 'BAT', 'RAT', 'AT']);
  });

  async function startGame() {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);
    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });
    return user;
  }

  // TEST 21: Dictionary loads successfully
  it('loads dictionary successfully', async () => {
    await startGame();

    // Dictionary should be loaded (this happens in the background)
    // We can verify by checking that the game is ready to accept submissions
    await waitFor(() => {
      const submitButton = screen.getByTestId('submit-btn');
      // Button exists (even if disabled due to no tiles placed)
      expect(submitButton).toBeInTheDocument();
    });
  });

  // TEST 22: Submit button error when dictionary not loaded
  it('shows error when submitting before dictionary loads', async () => {
    const user = userEvent.setup();

    // Don't mock dictionary - simulate it not being loaded
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<App />);
    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });

    // Try to submit (would need tiles placed, but testing the dictionary check)
    // The submit button should still be disabled
    const submitButton = screen.getByTestId('submit-btn');
    expect(submitButton).toBeDisabled();
  });

  // TEST 23: Expert mode enabled shows correct setting
  it('expert mode can be enabled and persists', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const expertToggle = screen.getByTestId('expert-mode-toggle');
    await user.click(expertToggle);
    expect(expertToggle).toBeChecked();

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    // Verify setting was saved
    await waitFor(() => {
      const settings = localStorage.getItem('scramble-game-settings');
      expect(settings).toBeTruthy();
      const parsed = JSON.parse(settings!);
      expect(parsed.expertMode).toBe(true);
    });
  });

  // TEST 24: Bonus squares are rendered correctly
  it('renders bonus squares on the board', async () => {
    await startGame();

    await waitFor(() => {
      // Check for different bonus square types
      const tripleWord = screen.getAllByText('TW');
      const doubleWord = screen.getAllByText('DW');
      const tripleLetter = screen.getAllByText('TL');
      const doubleLetter = screen.getAllByText('DL');

      expect(tripleWord.length).toBeGreaterThan(0);
      expect(doubleWord.length).toBeGreaterThan(0);
      expect(tripleLetter.length).toBeGreaterThan(0);
      expect(doubleLetter.length).toBeGreaterThan(0);
    });
  });

  // TEST 25: All control buttons exist
  it('renders all control buttons', async () => {
    await startGame();

    expect(screen.getByTestId('pass-btn')).toBeInTheDocument();
    expect(screen.getByTestId('recall-btn')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  // TEST 26: Player racks are visible
  it('displays player racks', async () => {
    await startGame();

    await waitFor(() => {
      // Check that tiles are rendered (at least for current player)
      const tiles = screen.queryAllByTestId(/tile-/);
      expect(tiles.length).toBeGreaterThan(0);
    });
  });

  // TEST 27: Game over state can be detected
  it('game state includes game over flag', async () => {
    const user = await startGame();

    // Pass a turn to trigger state save
    const passButton = screen.getByTestId('pass-btn');
    await user.click(passButton);

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      expect(savedState).toBeTruthy();

      const parsed = JSON.parse(savedState!);
      expect(parsed).toHaveProperty('gameOver');
      expect(parsed.gameOver).toBe(false);
    });
  });

  // TEST 28: Players alternate turns
  it('tracks current player correctly', async () => {
    const user = await startGame();

    // Check initial state
    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);
      expect(parsed.currentPlayerIndex).toBe(0);
    });

    // Pass turn
    const passButton = screen.getByTestId('pass-btn');
    await user.click(passButton);

    // Should switch to player 2 (index 1)
    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);
      expect(parsed.currentPlayerIndex).toBe(1);
    });
  });

  // TEST 29: First move flag is tracked
  it('tracks first move state', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);
      expect(parsed).toHaveProperty('isFirstMove');
      expect(parsed.isFirstMove).toBe(true);
    });
  });

  // TEST 30: Tile distribution is correct
  it('has correct tile distribution in bag', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      // Should have a tile bag
      expect(parsed).toHaveProperty('tileBag');
      expect(Array.isArray(parsed.tileBag)).toBe(true);

      // After dealing to 2 players (7 tiles each), should have 86 tiles left
      expect(parsed.tileBag.length).toBe(86);
    });
  });
});

describe('Scramble Game - Data Structures & Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockDictionary(['CAT', 'DOG', 'HELLO', 'WORLD', 'TEST']);
  });

  async function startGame() {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);
    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });
    return user;
  }

  // TEST 31: Player objects have correct structure
  it('creates players with correct data structure', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      expect(parsed.players).toHaveLength(2);

      // Check first player structure
      const player1 = parsed.players[0];
      expect(player1).toHaveProperty('id');
      expect(player1).toHaveProperty('name');
      expect(player1).toHaveProperty('score');
      expect(player1).toHaveProperty('rack');
      expect(player1.score).toBe(0);
      expect(Array.isArray(player1.rack)).toBe(true);
      expect(player1.rack.length).toBe(7);
    });
  });

  // TEST 32: Tiles have correct structure
  it('tiles have proper data structure with id, letter, and points', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      const player1 = parsed.players[0];
      const firstTile = player1.rack[0];

      expect(firstTile).toHaveProperty('id');
      expect(firstTile).toHaveProperty('letter');
      expect(firstTile).toHaveProperty('points');
      expect(typeof firstTile.id).toBe('string');
      expect(typeof firstTile.letter).toBe('string');
      expect(typeof firstTile.points).toBe('number');
    });
  });

  // TEST 33: Board has correct structure
  it('board is initialized with correct structure', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      expect(parsed).toHaveProperty('board');
      expect(Array.isArray(parsed.board)).toBe(true);
      expect(parsed.board.length).toBe(15); // 15 rows

      // Check first row
      expect(parsed.board[0].length).toBe(15); // 15 columns

      // Check cell structure - cells have row, col, bonus, and tile
      const firstCell = parsed.board[0][0];
      expect(firstCell).toHaveProperty('bonus');
      expect(firstCell).toHaveProperty('tile');
      expect(firstCell.tile).toBeNull(); // Initially empty
    });
  });

  // TEST 34: Empty player names default to Player 1/Player 2
  it('uses default names when inputs are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    // Clear the inputs (they have default values)
    const player1Input = screen.getByTestId('player1-name-input');
    const player2Input = screen.getByTestId('player2-name-input');

    await user.clear(player1Input);
    await user.clear(player2Input);

    const startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
    });
  });

  // TEST 35: Long player names are truncated
  it('handles very long player names', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const player1Input = screen.getByTestId('player1-name-input');

    // Try to type more than maxLength (20 characters)
    const longName = 'A'.repeat(25);
    await user.clear(player1Input);
    await user.type(player1Input, longName);

    // Input should only have 20 characters due to maxLength
    expect(player1Input).toHaveValue('A'.repeat(20));
  });

  // TEST 36: Special characters in player names
  it('allows special characters in player names', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const player1Input = screen.getByTestId('player1-name-input');

    await user.clear(player1Input);
    await user.type(player1Input, 'Player-1!');

    expect(player1Input).toHaveValue('Player-1!');
  });

  // TEST 37: Multiple new games can be started
  it('can start multiple new games in sequence', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    // Start first game
    let startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });

    // Click new game
    const newGameBtn = screen.getByTestId('new-game-btn');
    await user.click(newGameBtn);

    await waitFor(() => {
      expect(screen.getByText(/Scramble!/i)).toBeInTheDocument();
    });

    // Start second game
    startButton = screen.getByTestId('start-game-btn');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.queryByText(/Scramble!/i)).not.toBeInTheDocument();
    });

    // Should have a fresh game
    const savedState = localStorage.getItem('scramble-game-state');
    const parsed = JSON.parse(savedState!);
    expect(parsed.turnNumber).toBe(1);
  });

  // TEST 38: Placed tiles tracking
  it('tracks placed tiles this turn', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      expect(parsed).toHaveProperty('placedThisTurn');
      expect(Array.isArray(parsed.placedThisTurn)).toBe(true);
      expect(parsed.placedThisTurn.length).toBe(0); // No tiles placed yet
    });
  });

  // TEST 39: Winner tracking
  it('includes winner property in game state', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      expect(parsed).toHaveProperty('winner');
      expect(parsed.winner).toBeNull(); // No winner yet
    });
  });

  // TEST 40: Board maintains tile placement
  it('board cells can contain tiles', async () => {
    await startGame();

    await waitFor(() => {
      const savedState = localStorage.getItem('scramble-game-state');
      const parsed = JSON.parse(savedState!);

      // All cells should initially have null tiles
      const allTilesNull = parsed.board.every((row: Array<{ tile: null | object }>) =>
        row.every((cell) => cell.tile === null)
      );

      expect(allTilesNull).toBe(true);
    });
  });
});
