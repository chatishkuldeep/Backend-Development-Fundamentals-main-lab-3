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
