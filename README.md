# Lab 3: REST API, query parameters, validation, debugging

| Information | Details |
| :--- | :--- |
| Student Name | [ENTER YOUR FULL NAME HERE] |
| Student Registration Number | [ENTER YOUR REGISTRATION NUMBER HERE] |
| Class & Section | 313 AI DE 2B |
| Study Level | UG |
| Year & Term | 2 & 2 |
| Subject Name | Backend Development Fundamentals |
| Teacher / Faculty Name | Mr Yugandhar Gurjalwar |
| Name of the Assessment | LAB REPORT - 3 |
| Date of Submission | 6/11/2026 |

---

## Objective

The objective of Lab 3 is to transform the foundational routes from Lab 2 into a production-grade, RESTful API adhering to architectural best practices:
- Name endpoints with resource nouns (`/books/`) and utilize standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`) to denote operations.
- Implement comprehensive query parameter handling in `GET /books/` for searching (`search_q` with SQL `LIKE`), sorting (`order_by`, `order`), pagination (`limit`, `offset`), and numeric range filtering (`min_price`, `max_price` with `BETWEEN ? AND ?`).
- Apply strict input validation on mutations (`POST`, `PUT`), rejecting missing fields (title, author) or invalid/non-numeric prices with `400 Bad Request`.
- Enforce strict HTTP status code conventions: `200 OK` for reads/updates/deletions, `201 Created` for creations, `400 Bad Request` for validation errors, and `404 Not Found` for non-existent records.
- Protect the database from SQL Injection by employing parameterized queries (`?` placeholders) across all user inputs.
- Document and troubleshoot four foundational backend bugs: port conflicts (`EADDRINUSE`), broken module imports, table-name typos, and missing `await` statements.

---

## How to Run

### 1. Prerequisites
- Node.js (version 18.x, 20.x, or 22.x recommended)
- npm (Node Package Manager)

### 2. Installation
Navigate into the `lab-03` directory and install the necessary dependencies:
```bash
cd lab-03
npm install
```

### 3. Initialize and Seed Database
Run the database setup script to create `books.db` and seed it with 10 sample book records:
```bash
npm run setup-db
```
*(Alternatively: `node setupDb.js`)*

### 4. Start the Application Server
Launch the Express application server on port 3000:
```bash
npm start
```
*(Alternatively: `node app.js`)*

The server will display:
```
Server Running at http://localhost:3000/
```

### 5. Environment Variables
No external `.env` file is required for local execution. Standard production environment configurations can optionally override the port:
```env
PORT=3000
```

---

## API Endpoints Reference

| HTTP Method | Endpoint Path | Query / Body Parameters | Success Status | Error Status | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/books/` | `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price` | `200 OK` | `500 Internal Server Error` | Retrieves book list with optional filtering, partial title search, sorting, and pagination. |
| **GET** | `/books/:bookId/` | Path param: `bookId` | `200 OK` | `404 Not Found` | Retrieves details of a single book by its primary key ID. |
| **POST** | `/books/` | JSON Body: `{ "title", "author", "price", "pages" }` | `201 Created` | `400 Bad Request` | Validates input and adds a new book record. |
| **PUT** | `/books/:bookId/` | Path param: `bookId`<br>JSON Body: `{ "title", "author", "price", "pages" }` | `200 OK` | `400 Bad Request`<br>`404 Not Found` | Validates body, checks existence, and updates book details. |
| **DELETE** | `/books/:bookId/` | Path param: `bookId` | `200 OK` | `404 Not Found` | Checks existence and deletes the specified book record. |

---

## Complete Clean Source Code

### `package.json`
```json
{
  "name": "lab-03",
  "version": "1.0.0",
  "description": "Lab 3: REST API, query parameters, validation, debugging",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "setup-db": "node setupDb.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "sqlite": "^5.1.1",
    "sqlite3": "^5.1.7"
  }
}
```

### `setupDb.js`
```javascript
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
```

### `app.js`
```javascript
const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "books.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/books/", async (request, response) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = request.query;

    const validColumns = ["id", "title", "author", "price", "pages"];
    const sortColumn = validColumns.includes(order_by) ? order_by : "id";
    const sortDirection = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    let query = "";
    let params = [];

    if (min_price !== undefined && max_price !== undefined) {
      query = `
        SELECT * FROM book
        WHERE title LIKE ? AND price BETWEEN ? AND ?
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?;
      `;
      params = [
        `%${search_q}%`,
        Number(min_price),
        Number(max_price),
        parsedLimit,
        parsedOffset,
      ];
    } else {
      query = `
        SELECT * FROM book
        WHERE title LIKE ?
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?;
      `;
      params = [`%${search_q}%`, parsedLimit, parsedOffset];
    }

    const books = await db.all(query, params);
    response.status(200).json(books);
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const getBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    response.status(200).json(book);
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/books/", async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return response.status(400).json({ message: "Title is required" });
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
      return response.status(400).json({ message: "Author is required" });
    }

    if (
      price === undefined ||
      price === null ||
      typeof price !== "number" ||
      isNaN(price) ||
      price < 0
    ) {
      return response
        .status(400)
        .json({ message: "Price must be a valid non-negative number" });
    }

    const bookPages =
      typeof pages === "number" && pages >= 0 ? pages : 0;

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const result = await db.run(addBookQuery, [
      title.trim(),
      author.trim(),
      price,
      bookPages,
    ]);

    response.status(201).json({
      bookId: result.lastID,
      message: "Book Added Successfully",
    });
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const checkBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(checkBookQuery, [bookId]);

    if (!book) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    const { title, author, price, pages } = request.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return response.status(400).json({ message: "Title is required" });
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
      return response.status(400).json({ message: "Author is required" });
    }

    if (
      price === undefined ||
      price === null ||
      typeof price !== "number" ||
      isNaN(price) ||
      price < 0
    ) {
      return response
        .status(400)
        .json({ message: "Price must be a valid non-negative number" });
    }

    const bookPages =
      typeof pages === "number" && pages >= 0 ? pages : book.pages;

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateBookQuery, [
      title.trim(),
      author.trim(),
      price,
      bookPages,
      bookId,
    ]);

    response.status(200).json({ message: "Book Updated Successfully" });
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const checkBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(checkBookQuery, [bookId]);

    if (!book) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteBookQuery, [bookId]);

    response.status(200).json({ message: "Book Deleted Successfully" });
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = app;
```

---

## Output & Verification Screenshots

### 1. Default GET Books (`GET /books/`)
Retrieves the initial collection of 10 seeded books with default pagination (`limit=10, offset=0`) and ordering (`order_by=id, order=ASC`).
![Default GET books](screenshots/01_default_get_books.png)

### 2. Search Query (`GET /books/?search_q=the`)
Case-insensitive partial title matching using SQL `LIKE %the%`, returning 5 matching books.
![Search query](screenshots/02_search_query.png)

### 3. Price Range Filter (`GET /books/?min_price=300&max_price=600`)
Filters books whose price falls within the inclusive range using SQL `price BETWEEN ? AND ?`.
![Price range filter](screenshots/03_price_range_filter.png)

### 4. Sorting & Pagination (`GET /books/?order_by=price&order=DESC&limit=4`)
Sorts books by price in descending order and limits the result set to the top 4 most expensive books.
![Sorting & pagination](screenshots/04_sorting_pagination.png)

### 5. GET Single Book (`GET /books/1/`)
Returns a single book object by its ID with `200 OK`.
![GET single book](screenshots/05_get_single_book.png)

### 6. GET Single Book - 404 Error (`GET /books/999/`)
Handles non-existent resource requests by returning `404 Not Found` with `{ "message": "Book Not Found" }`.
![404 error case](screenshots/06_get_404_not_found.png)

### 7. POST Add Book - Success (`POST /books/`)
Successfully validates body parameters, inserts record into database, and returns `201 Created` with generated `bookId`.
![POST add book success](screenshots/07_post_add_book_success.png)

### 8. POST Add Book - Missing Title Error (`POST /books/`)
Rejects payload missing mandatory `title` attribute with `400 Bad Request` and descriptive error message.
![POST missing title error](screenshots/08_post_missing_title_error.png)

### 9. POST Add Book - Non-numeric Price Error (`POST /books/`)
Validates data types and rejects non-numeric or negative price values with `400 Bad Request`.
![POST non-numeric price error](screenshots/09_post_non_numeric_price_error.png)

### 10. PUT Update Book - Success (`PUT /books/1/`)
Verifies book existence, validates body parameters, updates database record, and returns `200 OK`.
![PUT update success](screenshots/10_put_update_success.png)

### 11. PUT Update Book - Not Found (`PUT /books/999/`)
Rejects update on non-existent book ID with `404 Not Found`.
![PUT not found](screenshots/11_put_not_found.png)

### 12. DELETE Book - Success (`DELETE /books/10/`)
Verifies record existence, deletes record from database, and returns `200 OK`.
![DELETE success](screenshots/12_delete_success.png)

### 13. DELETE Book - Not Found (`DELETE /books/999/`)
Rejects deletion on non-existent book ID with `404 Not Found`.
![DELETE not found](screenshots/13_delete_not_found.png)

### 14. SQLite CLI Table Verification (`sqlite3 books.db`)
Direct terminal inspection before and after API operations verifying database persistence and schema integrity.
![SQLite CLI table view](screenshots/14_sqlite_cli_verification.png)

---

## Viva Questions & Answers

### Q1: What is the difference between a Query Parameter and a Path Parameter?
- **Path Parameters** are part of the URL path itself (e.g., `/books/:bookId`). They are mandatory components of the URI hierarchy used to identify a specific, unique resource.
- **Query Parameters** appear after a `?` delimiter in the URL (e.g., `/books/?search_q=the&limit=5`), formatted as key-value pairs separated by `&`. They are optional modifiers used to filter, sort, search, or paginate resources without altering the fundamental resource identifier.

### Q2: What does "Stateless" mean in RESTful API Architecture?
In REST, statelessness is an architectural constraint stipulating that each client request to the server must contain all the information necessary for the server to understand and process the request. The server retains no client session context between requests. Every request is completely self-contained. Benefits include:
- **Scalability**: Any server instance can process any request without synchronizing session storage.
- **Reliability**: Server restarts or failures do not destroy active client sessions.
- **Cacheability**: Responses can be safely cached by intermediate proxies and clients.

### Q3: Which HTTP status code should be used for bad input vs. a missing record?
- **HTTP 400 Bad Request**: Returned when client input is syntactically invalid or fails business validation rules (e.g., missing mandatory fields like `title`, non-numeric or negative `price`, malformed JSON payload).
- **HTTP 404 Not Found**: Returned when the request is syntactically valid and well-formed, but the requested URI resource identifier does not exist in the database (e.g., querying or modifying `/books/999/`).

---

## Debugging Notes

During development and lab debugging exercises, the following four common issues were identified, analyzed, and resolved:

### 1. Port Conflict (`Error: listen EADDRINUSE: address already in use :::3000`)
- **Root Cause**: A previous Node.js server process was still running in the background and holding open the socket on TCP port 3000.
- **Diagnostic Command**:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000
  ```
- **Resolution**: Terminated the lingering background process holding port 3000:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  ```
  In application design, supporting dynamic port assignment via `process.env.PORT || 3000` prevents hardcoded collisions in multi-user or containerized environments.

### 2. Wrong Import Path (`Error: Cannot find module ...`)
- **Root Cause**: Attempting to require SQLite using relative local paths or incorrect module destructuring (such as `const sqlite = require("./sqlite")` instead of referencing installed npm packages).
- **Resolution**: Standardized module imports to use third-party package names installed in `node_modules` with correct object destructuring:
  ```javascript
  const { open } = require("sqlite");
  const sqlite3 = require("sqlite3");
  ```

### 3. Table-Name Typo (`SQLITE_ERROR: no such table: books`)
- **Root Cause**: The database schema in `setupDb.js` defined the singular table name `book` (`CREATE TABLE book (...)`), but SQL queries in the route handlers referenced the plural noun `books` (`SELECT * FROM books`).
- **Resolution**: Standardized all SQL statements across `setupDb.js` and `app.js` to strictly reference the exact table name: `book`.

### 4. Missing `await` Keyword (`Promise { <pending> }` / Unsent Data)
- **Root Cause**: Omitting the `await` keyword before asynchronous SQLite driver calls (`db.all()`, `db.get()`, `db.run()`, or `open()`). Since these methods return JavaScript Promises, failing to await their resolution caused Express to send response data prematurely or output `[object Promise]`.
- **Resolution**: Ensured all asynchronous SQLite operations are awaited within `async` route handlers:
  ```javascript
  const books = await db.all(query, params);
  response.status(200).json(books);
  ```
