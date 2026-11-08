const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "books.db");

const setupDatabase = async () => {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      DROP TABLE IF EXISTS book;
      CREATE TABLE book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `);

    const books = [
      ["The Great Gatsby", "F. Scott Fitzgerald", 350, 180],
      ["To Kill a Mockingbird", "Harper Lee", 450, 281],
      ["1984", "George Orwell", 299, 328],
      ["The Catcher in the Rye", "J.D. Salinger", 399, 214],
      ["Pride and Prejudice", "Jane Austen", 250, 279],
      ["The Hobbit", "J.R.R. Tolkien", 550, 310],
      ["Brave New World", "Aldous Huxley", 420, 268],
      ["The Alchemist", "Paulo Coelho", 320, 208],
      ["Crime and Punishment", "Fyodor Dostoevsky", 599, 430],
      ["The Lord of the Rings", "J.R.R. Tolkien", 899, 1178],
    ];

    const insertQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;

    for (const book of books) {
      await db.run(insertQuery, book);
    }

    console.log("Database initialized and seeded successfully.");
    await db.close();
  } catch (error) {
    console.error(`Database setup failed: ${error.message}`);
    process.exit(1);
  }
};

setupDatabase();
