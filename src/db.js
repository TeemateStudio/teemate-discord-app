import Database from 'better-sqlite3';

// Create a new database connection.
// This will create the file 'teemate.db' in the same directory if it doesn't exist.
const db = new Database('teemate.db');

// It's a good practice for performance to enable WAL (Write-Ahead Logging) mode.
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS mocks(
    id INTEGER PRIMARY KEY,
    mock_id TEXT UNIQUE NOT NULL, -- ex: MOCK_1234
    created_at INTEGER NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS queues (
    discord_id INTEGER PRIMARY KEY,
    game TEXT NOT NULL,
    mode TEXT NOT NULL,
    enqueued_at INTEGER NOT NULL
  );
`);

// Export the database connection to be used in other parts of your application
export default db;
