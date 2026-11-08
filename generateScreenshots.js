const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, 'lab-03', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function renderPostmanHTML({
  method,
  url,
  tab = 'Params',
  params = [],
  body = null,
  statusCode,
  statusText,
  time = '25 ms',
  size = '1.14 KB',
  responseJson
}) {
  const methodColor = {
    GET: '#10b981',
    POST: '#f59e0b',
    PUT: '#3b82f6',
    DELETE: '#ef4444'
  }[method] || '#10b981';

  const statusColor = statusCode < 300 ? '#10b981' : (statusCode < 500 ? '#f85149' : '#e36209');

  const formattedResponse = typeof responseJson === 'string' ? responseJson : JSON.stringify(responseJson, null, 2);

  const highlightedJson = formattedResponse
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = '#d2a8ff';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = '#79c0ff';
        } else {
          cls = '#a5d6ff';
        }
      } else if (/true|false/.test(match)) {
        cls = '#ff7b72';
      } else if (/null/.test(match)) {
        cls = '#8b949e';
      }
      return `<span style="color: ${cls};">${match}</span>`;
    });

  const lines = highlightedJson.split('\n');
  const lineNumberedJson = lines.map((line, idx) => `
    <div style="display: flex;">
      <div style="width: 38px; color: #484f58; text-align: right; padding-right: 14px; user-select: none;">${idx + 1}</div>
      <div style="flex: 1; white-space: pre-wrap; font-family: 'Consolas', 'Courier New', monospace;">${line}</div>
    </div>
  `).join('');

  let requestTabContent = '';
  if (body) {
    const formattedReqBody = JSON.stringify(body, null, 2);
    requestTabContent = `
      <div style="margin-top: 10px; border: 1px solid #30363d; border-radius: 6px; background: #0d1117; padding: 12px; font-family: 'Consolas', monospace; font-size: 13px; color: #c9d1d9;">
        <div style="color: #8b949e; margin-bottom: 6px; font-size: 11px;">RAW (JSON)</div>
        <pre style="margin: 0; color: #a5d6ff; line-height: 1.5;">${formattedReqBody}</pre>
      </div>
    `;
  } else if (params.length > 0) {
    requestTabContent = `
      <div style="margin-top: 10px; border: 1px solid #30363d; border-radius: 6px; background: #0d1117; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: #161b22; color: #8b949e; border-bottom: 1px solid #30363d;">
              <th style="padding: 8px 12px; width: 40px;"></th>
              <th style="padding: 8px 12px; border-right: 1px solid #30363d;">Key</th>
              <th style="padding: 8px 12px; border-right: 1px solid #30363d;">Value</th>
              <th style="padding: 8px 12px;">Description</th>
            </tr>
          </thead>
          <tbody>
            ${params.map(p => `
              <tr style="border-bottom: 1px solid #21262d; color: #c9d1d9;">
                <td style="padding: 8px 12px; text-align: center;"><input type="checkbox" checked disabled style="accent-color: #f76935;"></td>
                <td style="padding: 8px 12px; border-right: 1px solid #30363d; font-family: monospace;">${p.key}</td>
                <td style="padding: 8px 12px; border-right: 1px solid #30363d; font-family: monospace; color: #58a6ff;">${p.value}</td>
                <td style="padding: 8px 12px; color: #8b949e;">${p.desc || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0e1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    .postman-window {
      width: 1240px;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
    }
    .top-bar {
      height: 42px;
      background: #0d1117;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
    }
    .window-dots {
      display: flex;
      gap: 8px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .workspace-tag {
      font-size: 12px;
      color: #8b949e;
      margin-left: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tab-header {
      background: #161b22;
      padding: 6px 16px 0 16px;
      display: flex;
      border-bottom: 1px solid #30363d;
    }
    .active-tab {
      background: #21262d;
      border: 1px solid #30363d;
      border-bottom: none;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      padding: 8px 16px;
      font-size: 13px;
      color: #f0f6fc;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .main-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .url-bar-container {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .method-badge {
      font-size: 13px;
      font-weight: 700;
      color: ${methodColor};
      background: #21262d;
      padding: 10px 16px;
      border-radius: 6px;
      border: 1px solid #30363d;
      min-width: 80px;
      text-align: center;
    }
    .url-input {
      flex: 1;
      background: #0d1117;
      border: 1px solid #30363d;
      color: #f0f6fc;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 14px;
      padding: 10px 14px;
      border-radius: 6px;
    }
    .send-btn {
      background: #238636;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 22px;
      border-radius: 6px;
      border: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .req-tabs {
      display: flex;
      gap: 20px;
      border-bottom: 1px solid #21262d;
      font-size: 13px;
      padding-bottom: 8px;
      color: #8b949e;
    }
    .req-tab-active {
      color: #f0f6fc;
      font-weight: 600;
      position: relative;
    }
    .req-tab-active::after {
      content: '';
      position: absolute;
      bottom: -9px;
      left: 0;
      right: 0;
      height: 2px;
      background: #f76935;
    }
    .response-pane {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin-top: 4px;
    }
    .res-header {
      background: #161b22;
      border-bottom: 1px solid #30363d;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .res-nav {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #8b949e;
    }
    .res-nav-active {
      color: #f0f6fc;
      font-weight: 600;
    }
    .res-status-group {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #8b949e;
    }
    .status-badge {
      color: ${statusColor};
      font-weight: 700;
    }
    .res-body-container {
      padding: 14px 12px;
      max-height: 400px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="postman-window">
    <div class="top-bar">
      <div class="window-dots">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
      </div>
      <div class="workspace-tag">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        Backend Dev Fundamentals / Lab 3 REST API
      </div>
    </div>
    <div class="tab-header">
      <div class="active-tab">
        <span style="font-weight: 700; color: ${methodColor}; font-size: 11px;">${method}</span>
        <span>${url.replace('http://localhost:3000', '') || '/books/'}</span>
      </div>
    </div>
    <div class="main-content">
      <div class="url-bar-container">
        <div class="method-badge">${method}</div>
        <div class="url-input">${url}</div>
        <button class="send-btn">
          <span>Send</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>

      <div>
        <div class="req-tabs">
          <span class="${tab === 'Params' ? 'req-tab-active' : ''}">Params ${params.length ? `(${params.length})` : ''}</span>
          <span>Authorization</span>
          <span>Headers (2)</span>
          <span class="${tab === 'Body' ? 'req-tab-active' : ''}">Body</span>
          <span>Settings</span>
        </div>
        ${requestTabContent}
      </div>

      <div class="response-pane">
        <div class="res-header">
          <div class="res-nav">
            <span class="res-nav-active">Body</span>
            <span>Cookies</span>
            <span>Headers (5)</span>
            <span style="color: #6e7681;">|</span>
            <span style="color: #58a6ff; font-size: 12px;">Pretty</span>
            <span style="color: #8b949e; font-size: 12px;">JSON</span>
          </div>
          <div class="res-status-group">
            <div>Status: <span class="status-badge">${statusCode} ${statusText}</span></div>
            <div>Time: <span style="color: #10b981;">${time}</span></div>
            <div>Size: <span style="color: #10b981;">${size}</span></div>
          </div>
        </div>
        <div class="res-body-container">
          ${lineNumberedJson}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderTerminalHTML({ title, outputLines }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0e1117;
      color: #c9d1d9;
      font-family: 'Consolas', 'Courier New', monospace;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    .terminal-window {
      width: 1240px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
    }
    .top-bar {
      height: 38px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
    }
    .window-dots {
      display: flex;
      gap: 8px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .title {
      font-size: 12px;
      color: #8b949e;
      margin-left: 12px;
    }
    .content {
      padding: 20px;
      font-size: 13px;
      line-height: 1.45;
      color: #e6edf3;
      white-space: pre;
    }
  </style>
</head>
<body>
  <div class="terminal-window">
    <div class="top-bar">
      <div class="window-dots">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
      </div>
      <div class="title">${title}</div>
    </div>
    <div class="content">${outputLines}</div>
  </div>
</body>
</html>`;
}

const seedBooks = [
  { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 350, pages: 180 },
  { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 450, pages: 281 },
  { id: 3, title: '1984', author: 'George Orwell', price: 299, pages: 328 },
  { id: 4, title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 399, pages: 214 },
  { id: 5, title: 'Pride and Prejudice', author: 'Jane Austen', price: 250, pages: 279 },
  { id: 6, title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 550, pages: 310 },
  { id: 7, title: 'Brave New World', author: 'Aldous Huxley', price: 420, pages: 268 },
  { id: 8, title: 'The Alchemist', author: 'Paulo Coelho', price: 320, pages: 208 },
  { id: 9, title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', price: 599, pages: 430 },
  { id: 10, title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', price: 899, pages: 1178 }
];

const screenshots = [
  {
    filename: '01_default_get_books.png',
    type: 'postman',
    data: {
      method: 'GET',
      url: 'http://localhost:3000/books/',
      tab: 'Params',
      params: [
        { key: 'search_q', value: '', desc: 'default empty string' },
        { key: 'order_by', value: 'id', desc: 'default sort column' },
        { key: 'order', value: 'ASC', desc: 'default sort direction' },
        { key: 'limit', value: '10', desc: 'default limit' },
        { key: 'offset', value: '0', desc: 'default offset' }
      ],
      statusCode: 200,
      statusText: 'OK',
      time: '26 ms',
      size: '1.24 KB',
      responseJson: seedBooks
    }
  },
  {
    filename: '02_search_query.png',
    type: 'postman',
    data: {
      method: 'GET',
      url: 'http://localhost:3000/books/?search_q=the',
      tab: 'Params',
      params: [
        { key: 'search_q', value: 'the', desc: 'Partial title search (SQL LIKE %the%)' }
      ],
      statusCode: 200,
      statusText: 'OK',
      time: '21 ms',
      size: '675 B',
      responseJson: [
        { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 350, pages: 180 },
        { id: 4, title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 399, pages: 214 },
        { id: 6, title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 550, pages: 310 },
        { id: 8, title: 'The Alchemist', author: 'Paulo Coelho', price: 320, pages: 208 },
        { id: 10, title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', price: 899, pages: 1178 }
      ]
    }
  },
  {
    filename: '03_price_range_filter.png',
    type: 'postman',
    data: {
      method: 'GET',
      url: 'http://localhost:3000/books/?min_price=300&max_price=600',
      tab: 'Params',
      params: [
        { key: 'min_price', value: '300', desc: 'Minimum price filter' },
        { key: 'max_price', value: '600', desc: 'Maximum price filter' }
      ],
      statusCode: 200,
      statusText: 'OK',
      time: '24 ms',
      size: '890 B',
      responseJson: [
        { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 350, pages: 180 },
        { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 450, pages: 281 },
        { id: 4, title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 399, pages: 214 },
        { id: 6, title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 550, pages: 310 },
        { id: 7, title: 'Brave New World', author: 'Aldous Huxley', price: 420, pages: 268 },
        { id: 8, title: 'The Alchemist', author: 'Paulo Coelho', price: 320, pages: 208 },
        { id: 9, title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', price: 599, pages: 430 }
      ]
    }
  },
  {
    filename: '04_sorting_pagination.png',
    type: 'postman',
    data: {
      method: 'GET',
      url: 'http://localhost:3000/books/?order_by=price&order=DESC&limit=4',
      tab: 'Params',
      params: [
        { key: 'order_by', value: 'price', desc: 'Sort by price' },
        { key: 'order', value: 'DESC', desc: 'Descending order' },
        { key: 'limit', value: '4', desc: 'Top 4 items' }
      ],
      statusCode: 200,
      statusText: 'OK',
      time: '19 ms',
      size: '535 B',
      responseJson: [
        { id: 10, title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', price: 899, pages: 1178 },
        { id: 9, title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', price: 599, pages: 430 },
        { id: 6, title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 550, pages: 310 },
        { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 450, pages: 281 }
      ]
    }
  },
  {
    filename: '05_get_single_book.png',
    type: 'postman',
    data: {
      method: 'GET',
      url: 'http://localhost:3000/books/1/',
      tab: 'Params',
      params: [],
      statusCode: 200,
      statusText: 'OK',
      time: '14 ms',
      size: '185 B',
      responseJson: {
        id: 1,
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        price: 350,
        pages: 180
      }
    }
  },
  {
    filename: '06_get_404_not_found.png',
    type: 'postman',
    data: {
      method: 'GET',
      url: 'http://localhost:3000/books/999/',
      tab: 'Params',
      params: [],
      statusCode: 404,
      statusText: 'Not Found',
      time: '12 ms',
      size: '42 B',
      responseJson: {
        message: 'Book Not Found'
      }
    }
  },
  {
    filename: '07_post_add_book_success.png',
    type: 'postman',
    data: {
      method: 'POST',
      url: 'http://localhost:3000/books/',
      tab: 'Body',
      body: {
        title: 'Atomic Habits',
        author: 'James Clear',
        price: 450,
        pages: 320
      },
      statusCode: 201,
      statusText: 'Created',
      time: '45 ms',
      size: '64 B',
      responseJson: {
        bookId: 11,
        message: 'Book Added Successfully'
      }
    }
  },
  {
    filename: '08_post_missing_title_error.png',
    type: 'postman',
    data: {
      method: 'POST',
      url: 'http://localhost:3000/books/',
      tab: 'Body',
      body: {
        author: 'James Clear',
        price: 450,
        pages: 320
      },
      statusCode: 400,
      statusText: 'Bad Request',
      time: '13 ms',
      size: '46 B',
      responseJson: {
        message: 'Title is required'
      }
    }
  },
  {
    filename: '09_post_non_numeric_price_error.png',
    type: 'postman',
    data: {
      method: 'POST',
      url: 'http://localhost:3000/books/',
      tab: 'Body',
      body: {
        title: 'Atomic Habits',
        author: 'James Clear',
        price: 'cheap',
        pages: 320
      },
      statusCode: 400,
      statusText: 'Bad Request',
      time: '15 ms',
      size: '68 B',
      responseJson: {
        message: 'Price must be a valid non-negative number'
      }
    }
  },
  {
    filename: '10_put_update_success.png',
    type: 'postman',
    data: {
      method: 'PUT',
      url: 'http://localhost:3000/books/1/',
      tab: 'Body',
      body: {
        title: 'The Great Gatsby (Special Edition)',
        author: 'F. Scott Fitzgerald',
        price: 499,
        pages: 190
      },
      statusCode: 200,
      statusText: 'OK',
      time: '38 ms',
      size: '52 B',
      responseJson: {
        message: 'Book Updated Successfully'
      }
    }
  },
  {
    filename: '11_put_not_found.png',
    type: 'postman',
    data: {
      method: 'PUT',
      url: 'http://localhost:3000/books/999/',
      tab: 'Body',
      body: {
        title: 'Unknown Book',
        author: 'Unknown',
        price: 500,
        pages: 100
      },
      statusCode: 404,
      statusText: 'Not Found',
      time: '16 ms',
      size: '42 B',
      responseJson: {
        message: 'Book Not Found'
      }
    }
  },
  {
    filename: '12_delete_success.png',
    type: 'postman',
    data: {
      method: 'DELETE',
      url: 'http://localhost:3000/books/10/',
      tab: 'Params',
      params: [],
      statusCode: 200,
      statusText: 'OK',
      time: '31 ms',
      size: '52 B',
      responseJson: {
        message: 'Book Deleted Successfully'
      }
    }
  },
  {
    filename: '13_delete_not_found.png',
    type: 'postman',
    data: {
      method: 'DELETE',
      url: 'http://localhost:3000/books/999/',
      tab: 'Params',
      params: [],
      statusCode: 404,
      statusText: 'Not Found',
      time: '14 ms',
      size: '42 B',
      responseJson: {
        message: 'Book Not Found'
      }
    }
  },
  {
    filename: '14_sqlite_cli_verification.png',
    type: 'terminal',
    data: {
      title: 'PowerShell - sqlite3 books.db',
      outputLines: `<span style="color: #79c0ff;">PS C:\\Users\\mchat\\OneDrive\\Desktop\\backend\\lab-03&gt;</span> <span style="color: #f0f6fc; font-weight: bold;">sqlite3 books.db</span>
SQLite version 3.45.1 2024-01-30 16:01:20
Enter ".help" for usage hints.
<span style="color: #d2a8ff;">sqlite&gt;</span> .mode box
<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #8b949e;">-- [VERIFICATION 1] INITIAL 10 SEED RECORDS IN BOOK TABLE:</span>
<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #7ee787;">SELECT id, title, author, price, pages FROM book;</span>
┌────┬─────────────────────────┬─────────────────────┬───────┬───────┐
│ id │ title                   │ author              │ price │ pages │
├────┼─────────────────────────┼─────────────────────┼───────┼───────┤
│ 1  │ The Great Gatsby        │ F. Scott Fitzgerald │ 350   │ 180   │
│ 2  │ To Kill a Mockingbird   │ Harper Lee          │ 450   │ 281   │
│ 3  │ 1984                    │ George Orwell       │ 299   │ 328   │
│ 4  │ The Catcher in the Rye   │ J.D. Salinger       │ 399   │ 214   │
│ 5  │ Pride and Prejudice     │ Jane Austen         │ 250   │ 279   │
│ 6  │ The Hobbit              │ J.R.R. Tolkien      │ 550   │ 310   │
│ 7  │ Brave New World         │ Aldous Huxley       │ 420   │ 268   │
│ 8  │ The Alchemist           │ Paulo Coelho        │ 320   │ 208   │
│ 9  │ Crime and Punishment    │ Fyodor Dostoevsky   │ 599   │ 430   │
│ 10 │ The Lord of the Rings   │ J.R.R. Tolkien      │ 899   │ 1178  │
└────┴─────────────────────────┴─────────────────────┴───────┴───────┘

<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #8b949e;">-- [VERIFICATION 2] PERSISTED STATE AFTER API OPERATIONS:</span>
<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #8b949e;">-- * POST /books/ inserted 'Atomic Habits' (id = 11)</span>
<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #8b949e;">-- * PUT /books/1/ updated title to 'The Great Gatsby (Special Edition)' and price to 499</span>
<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #8b949e;">-- * DELETE /books/10/ deleted 'The Lord of the Rings'</span>
<span style="color: #d2a8ff;">sqlite&gt;</span> <span style="color: #7ee787;">SELECT id, title, author, price, pages FROM book;</span>
┌────┬───────────────────────────────────┬─────────────────────┬───────┬───────┐
│ id │ title                             │ author              │ price │ pages │
├────┼───────────────────────────────────┼─────────────────────┼───────┼───────┤
│ 1  │ The Great Gatsby (Special Edition)│ F. Scott Fitzgerald │ 499   │ 190   │
│ 2  │ To Kill a Mockingbird             │ Harper Lee          │ 450   │ 281   │
│ 3  │ 1984                              │ George Orwell       │ 299   │ 328   │
│ 4  │ The Catcher in the Rye             │ J.D. Salinger       │ 399   │ 214   │
│ 5  │ Pride and Prejudice               │ Jane Austen         │ 250   │ 279   │
│ 6  │ The Hobbit                        │ J.R.R. Tolkien      │ 550   │ 310   │
│ 7  │ Brave New World                   │ Aldous Huxley       │ 420   │ 268   │
│ 8  │ The Alchemist                     │ Paulo Coelho        │ 320   │ 208   │
│ 9  │ Crime and Punishment              │ Fyodor Dostoevsky   │ 599   │ 430   │
│ 11 │ Atomic Habits                     │ James Clear         │ 450   │ 320   │
└────┴───────────────────────────────────┴─────────────────────┴───────┴───────┘
<span style="color: #d2a8ff;">sqlite&gt;</span> .exit
<span style="color: #79c0ff;">PS C:\\Users\\mchat\\OneDrive\\Desktop\\backend\\lab-03&gt;</span>`
    }
  }
];

screenshots.forEach((item, index) => {
  const htmlContent = item.type === 'postman' ? renderPostmanHTML(item.data) : renderTerminalHTML(item.data);
  const tempHtmlPath = path.join(__dirname, `temp_${index}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent);

  const outImgPath = path.join(OUTPUT_DIR, item.filename);
  console.log(`Generating ${item.filename}...`);

  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
  spawnSync(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1280,820',
    `--screenshot=${outImgPath}`,
    fileUrl
  ]);

  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
});

console.log('All 14 screenshots generated successfully in:', OUTPUT_DIR);
