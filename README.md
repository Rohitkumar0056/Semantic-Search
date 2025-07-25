# Semantic Search Service

A Node.js/TypeScript backend for hybrid, vector, and text-based search using MongoDB database, supporting advanced filtering, embedding generation, index generation, query variation, and logging.

## Features

- **Hybrid, Vector, and Text Search**: Query your collection using text, vector, or hybrid (combined) search.
- **Query Variations**: Automatically generates query variations using a text-to-embedding llm model.
- **Advanced Filtering**: Supports MongoDB-style filters (e.g., `$eq`, `$gt`, `$in`) via API.
- **Logging**: Integrates with a logging API for request/response tracking.
- **MongoDB Atlas Vector Search**: Uses MongoDB's vector search and text search indexes.

## Project Structure

```
src/
  index.ts                # Entry point (Express server)
  routes/
    search.ts             # Main API routes
  services/
    ...                   # Search, embedding, logging, etc.
  createIndex/
    textIndex.ts          # Script to create text index
    vectorIndex.ts        # Script to create vector index
  testing/
    ...                   # Test scripts for endpoints
.env                      # Environment variables
package.json
tsconfig.json
```

## Setup

1. **Install dependencies**
   ```sh
   npm install
   ```

2. **Configure environment variables**

   Copy `.env` and fill in your MongoDB URI, API keys, and other settings:
   ```
   MONGODB_URI=your-mongodb-uri
   DB_NAME=your-db-name
   COLLECTION_NAME=your-collection
   PORT=3001
   EMBEDDING_AI_URL=...
   AI_KEY=...
   CHAT_AI_URL=...
   ```

3. **Build the project**
   ```sh
   npm run build
   ```

4. **Start the server**
   ```sh
   npm start
   ```
   Or for development with hot reload:
   ```sh
   npm run dev
   ```

## Index Creation

Before running search, create the required indexes:

- **Text Index**:
  ```sh
  npx ts-node src/createIndex/textIndex.ts
  ```
- **Vector Index**:
  ```sh
  npx ts-node src/createIndex/vectorIndex.ts
  ```

## API Endpoints

- `GET /search/:type`  
  - `type`: `vector`, `text`, or `hybrid`
  - Query params: `query_text`, `bot_id`, `limit`, `number_of_queries`, `filters`, `user_id`
- `GET /vector-search`, `/text-search`, `/hybrid-search`  
  - Same query params as above

### Filters Example

Pass filters as a JSON string:
```
filters={"tags":{"eq":"abc"}}
```

## Testing

Test scripts are in [`src/testing/`](src/testing/):

- [`hybrid-test.ts`](src/testing/hybrid-test.ts)
- [`vector-test.ts`](src/testing/vector-test.ts)
- [`text-test.ts`](src/testing/text-test.ts)

Run with:
```sh
npx ts-node src/testing/hybrid-test.ts
```

## License

MIT
