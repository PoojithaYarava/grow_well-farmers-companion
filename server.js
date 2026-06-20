const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const USERS_FILE = path.join(ROOT, "data", "users.json");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function ensureUsersFile() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function readUsers() {
  ensureUsersFile();
  const raw = fs.readFileSync(USERS_FILE, "utf8");
  const data = JSON.parse(raw || "{}");
  return Array.isArray(data.users) ? data.users : [];
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

function getSafePath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/") {
    pathname = "/home.html";
  }

  const normalized = path.normalize(path.join(ROOT, pathname));
  if (!normalized.startsWith(ROOT)) {
    return null;
  }

  return normalized;
}

function serveStatic(req, res) {
  const filePath = getSafePath(req.url);
  if (!filePath) {
    sendText(res, 400, "Bad request");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });
}

function findUser(username) {
  const users = readUsers();
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

async function handleLogin(req, res) {
  try {
    const { username, password } = await parseBody(req);

    if (!username || !password) {
      sendJson(res, 400, { message: "Username and password are required." });
      return;
    }

    let user = findUser(username);
    if (!user) {
      const users = readUsers();
      sendJson(
        res,
        401,
        users.length === 0
          ? { message: "No accounts exist yet. Create one with /api/register." }
          : { message: "Invalid username or password." }
      );
      return;
    }

    const valid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      sendJson(res, 401, { message: "Invalid username or password." });
      return;
    }

    sendJson(res, 200, {
      message: "Login successful.",
      user: {
        username: user.username,
        role: user.role || "user",
      },
    });
  } catch (error) {
    sendJson(res, 400, { message: error.message || "Could not process login." });
  }
}

async function handleRegister(req, res) {
  try {
    const { username, password } = await parseBody(req);

    if (!username || !password) {
      sendJson(res, 400, { message: "Username and password are required." });
      return;
    }

    const users = readUsers();
    const existing = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      sendJson(res, 409, { message: "That username already exists." });
      return;
    }

    const { salt, hash } = hashPassword(password);
    users.push({
      username,
      passwordSalt: salt,
      passwordHash: hash,
      role: "user",
    });
    writeUsers(users);

    sendJson(res, 201, {
      message: "Account created.",
      user: { username, role: "user" },
    });
  } catch (error) {
    sendJson(res, 400, { message: error.message || "Could not process registration." });
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/login" && req.method === "POST") {
    handleLogin(req, res);
    return;
  }

  if (req.url === "/api/register" && req.method === "POST") {
    handleRegister(req, res);
    return;
  }

  if (req.url === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { message: "Method not allowed." });
    return;
  }

  serveStatic(req, res);
});

ensureUsersFile();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GrowWell server running at http://0.0.0.0:${PORT}`);
});
