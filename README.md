# Code A Cuisine

Generate recipes from your available ingredients, save them to a library, and revisit favorites by cuisine.

## Features
- Ingredient-based recipe generation with preferences (cuisine, diet, cook time, portions).
- Recipe results with summaries and full details.
- Cookbook page with cuisine navigation.
- Cuisine library with pagination and recipe detail view.
- IP and global quota enforcement via n8n (with user-facing messages).

## Tech Stack
- Angular 17 (standalone components)
- Firebase Firestore
- n8n for orchestration and AI workflow

## Getting Started

### Prerequisites
- Node.js + npm
- Firebase project with Firestore enabled
- n8n instance (self-hosted or cloud)

### Install
```bash
npm install
```

### Run
```bash
npm start
```
Then open `http://localhost:4200`.

## Configuration

Edit `src/environments/environment.ts`:
- `firebase`: your Firebase app config
- `n8nWebhookUrl`: the n8n webhook used for recipe generation
- `n8nQuotaUrl`: optional endpoint to display remaining quota before generation

## Data Model (Firestore)

Collections used:
- `recipeRequests`: request status and generated results
- `recipes`: flattened recipe library entries used by the cuisine pages
- `quotaIpDaily` / `quotaGlobalDaily`: daily quota counters (written by n8n)

## n8n Integration

n8n is used to handle recipe generation and quota checks. For detailed workflow setup, contact the repository owner.

## Scripts
- `npm start`: run the dev server
- `npm run build`: build the app
- `npm test`: run unit tests

## Notes

- The cuisine library page relies on Firestore indexes for queries by `cuisine` and `createdAt`.
- If a query error mentions missing indexes, create the suggested index in Firebase Console.

## Contact

For workflow details or setup questions, contact the maintainer.
