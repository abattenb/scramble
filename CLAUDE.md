# Scramble - Project Guide for Claude

## Project Overview
Scramble is a Scrabble-like word game built as a static site for GitHub Pages. It's a 2-player local game played on the same screen.

## Tech Stack
- **Vite** + **React** + **TypeScript**
- HTML5 Drag & Drop with touch event support for mobile
- CSS with media queries for responsive design (breakpoints at 1090px and 600px)
- localStorage for game state persistence
- GitHub Actions for deployment to GitHub Pages

## Project Structure
- `src/App.tsx` - Main game component with all state management
- `src/components/` - React components (GameBoard, Tile, PlayerRack, Sidebar, etc.)
- `src/data/` - Game data (tiles, board layout, dictionary)
- `public/dict.txt` - Word dictionary file
- `.github/workflows/deploy.yml` - GitHub Pages deployment workflow

## Key Conventions
- Use `yarn` for package management (not npm)
- Version number is in `src/App.tsx` in the header - **increment on every push**
- Dictionary fetch uses `import.meta.env.BASE_URL` for GitHub Pages compatibility
- Touch events use refs for callbacks to avoid circular dependencies in useEffect

## Versioning (SemVer)
Follow semantic versioning (MAJOR.MINOR.PATCH) - current version is in `src/App.tsx` header.

**Before every push**, increment the version number:
- **PATCH** (x.x.X): Bug fixes, typo corrections, small tweaks
- **MINOR** (x.X.0): New features, enhancements, non-breaking changes
- **MAJOR** (X.0.0): Breaking changes, major rewrites, incompatible updates

Example progression: `1.0.1` → `1.0.2` (fix) → `1.1.0` (feature) → `2.0.0` (breaking)

## Game Rules
- 15x15 board with standard Scrabble bonus squares
- Players take turns placing tiles to form words
- Words must connect to existing tiles (except first word through center)
- All formed words are validated against the dictionary
- Scoring follows Scrabble rules with letter values and bonus multipliers

## Testing Changes
```bash
yarn dev    # Start dev server
yarn build  # Production build
```
