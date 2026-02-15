# Knockouts game codebase 

## Typescript conventions
1. Don't end lines with semicolons

## Coding conventions
1. When there is an enum for something use it. We don't want hardcoded strings. Ex:
```ts
const isAvailable = gameState === GameState.LOBBY && playerCount < maxPlayers;
```
