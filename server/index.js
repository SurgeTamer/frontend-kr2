const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3004;

const ACCESS_SECRET = "perfume_access_secret";
const REFRESH_SECRET = "perfume_refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const ROLES = {
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
};

const users = [];
const products = [];
const refreshTokens = new Set();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API магазина парфюмерии",
      version: "1.0.0",
      description: "КР2: аутентификация, JWT, refresh, RBAC, каталог парфюмерии",
    },
    servers: [{ url: `http://localhost:${port}`, description: "Локальный сервер" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "abc12345" },
            email: { type: "string", example: "ivan@perfume.shop" },
            first_name: { type: "string", example: "Иван" },
            last_name: { type: "string", example: "Иванов" },
            role: { type: "string", example: "user", enum: ["user", "seller", "admin"] },
            blocked: { type: "boolean", example: false },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", example: "xyz98765" },
            title: { type: "string", example: "Chanel No.5" },
            category: { type: "string", example: "женские" },
            description: { type: "string", example: "Классический цветочный аромат" },
            volume: { type: "string", example: "50 мл" },
            price: { type: "number", example: 8900 },
            image: { type: "string", example: "/images/chanel-no5.jpg" },
          },
        },
        Tokens: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Описание ошибки" },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "index.js")],
};

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function findUserByEmail(email) {
  return users.find((u) => u.email === email);
}

function findUserById(id) {
  return users.find((u) => u.id === id);
}

function findProductById(id) {
  return products.find((p) => p.id === id);
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    blocked: user.blocked,
  };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = findUserById(payload.sub);
    if (!user || user.blocked) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = payload;
    req.userRecord = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Демо-данные для проверки
(async () => {
  const adminEmail = "admin@perfume.shop";
  let admin = findUserByEmail(adminEmail);
  if (!admin) {
    admin = {
      id: nanoid(8),
      email: adminEmail,
      first_name: "Василий",
      last_name: "Иванович",
      hashedPassword: await hashPassword("admin123"),
      role: ROLES.ADMIN,
      blocked: false,
    };
    users.push(admin);
  } else {
    admin.first_name = "Василий";
    admin.last_name = "Иванович";
    admin.role = ROLES.ADMIN;
  }

  const buyerEmail = "ivan@perfume.shop";
  let buyer = findUserByEmail(buyerEmail);
  if (!buyer) {
    buyer = {
      id: nanoid(8),
      email: buyerEmail,
      first_name: "Иван",
      last_name: "Иванов",
      hashedPassword: await hashPassword("buyer123"),
      role: ROLES.USER,
      blocked: false,
    };
    users.push(buyer);
  } else {
    buyer.first_name = "Иван";
    buyer.last_name = "Иванов";
    buyer.role = ROLES.USER;
  }

  users.forEach((u) => {
    if (u.role === "покупатель") u.role = ROLES.USER;
    if (u.role === "продавец") u.role = ROLES.SELLER;
    if (u.role === "админ") u.role = ROLES.ADMIN;
  });
  if (products.length === 0) {
    products.push(
      {
        id: nanoid(8),
        title: "Chanel No.5",
        category: "женские",
        description: "Классический цветочный аромат",
        volume: "50 мл",
        price: 8900,
        image: "/images/chanel-no5.jpg",
      },
      {
        id: nanoid(8),
        title: "Dior Sauvage",
        category: "мужские",
        description: "Свежий древесный аромат",
        volume: "100 мл",
        price: 7500,
        image: "/images/dior-sauvage.jpg",
      },
      {
        id: nanoid(8),
        title: "Tom Ford Black Orchid",
        category: "унисекс",
        description: "Восточный шипровый парфюм",
        volume: "50 мл",
        price: 11200,
        image: "/images/black-orchid.jpg",
      }
    );
  }
})();

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      console.log("Body:", req.body);
    }
  });
  next();
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     description: Создаёт пользователя с хешированным паролем (email — логин)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name, password]
 *             properties:
 *               email: { type: string, example: ivan@perfume.shop }
 *               first_name: { type: string, example: Иван }
 *               last_name: { type: string, example: Иванов }
 *               password: { type: string, example: qwerty123 }
 *               role: { type: string, example: user, enum: [user, seller] }
 *     responses:
 *       201:
 *         description: Пользователь создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Некорректные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email уже занят
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password, role } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: "email, password, first_name and last_name are required" });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "email already exists" });
  }
  const allowedRoles = [ROLES.USER, ROLES.SELLER];
  const userRole = allowedRoles.includes(role) ? role : ROLES.USER;
  const newUser = {
    id: nanoid(8),
    email,
    first_name,
    last_name,
    hashedPassword: await hashPassword(password),
    role: userRole,
    blocked: false,
  };
  users.push(newUser);
  res.status(201).json(publicUser(newUser));
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Возвращает пару access- и refresh-токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@perfume.shop }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       401:
 *         description: Неверные учётные данные
 *       403:
 *         description: Пользователь заблокирован
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.blocked) {
    return res.status(403).json({ error: "User is blocked" });
  }
  const isValid = await verifyPassword(password, user.hashedPassword);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     description: Refresh-токен передаётся в заголовке Authorization Bearer
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       400:
 *         description: Токен не передан
 *       401:
 *         description: Невалидный refresh-токен
 */
app.post("/api/auth/refresh", (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  const refreshToken = scheme === "Bearer" && token ? token : req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required in Authorization header" });
  }
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub);
    if (!user || user.blocked) {
      return res.status(401).json({ error: "User not found" });
    }
    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Текущий пользователь
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные авторизованного пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Нет или невалидный access-токен
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json(publicUser(req.userRecord));
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Список пользователей
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Массив пользователей (только админ)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         description: Недостаточно прав
 */
app.get("/api/users", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  res.json(users.map(publicUser));
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Пользователь по id
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Не найден
 */
app.get("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(publicUser(user));
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               role: { type: string, enum: [user, seller, admin] }
 *               blocked: { type: boolean }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
app.put("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  const { first_name, last_name, role, blocked } = req.body;
  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (role !== undefined && [ROLES.USER, ROLES.SELLER, ROLES.ADMIN].includes(role)) user.role = role;
  if (blocked !== undefined) user.blocked = Boolean(blocked);
  res.json(publicUser(user));
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь заблокирован
 */
app.delete("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  user.blocked = true;
  res.json({ message: "User blocked", user: publicUser(user) });
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар (аромат)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, description, volume, price]
 *             properties:
 *               title: { type: string, example: Chanel No.5 }
 *               category: { type: string, example: женские }
 *               description: { type: string, example: Цветочный аромат }
 *               volume: { type: string, example: 50 мл }
 *               price: { type: number, example: 8900 }
 *               image: { type: string, example: /images/chanel-no5.jpg }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       403:
 *         description: Только продавец или админ
 */
app.post("/api/products", authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const { title, category, description, volume, price, image } = req.body;
  if (!title || !category || description === undefined || volume === undefined || price === undefined) {
    return res.status(400).json({ error: "title, category, description, volume and price are required" });
  }
  const product = {
    id: nanoid(8),
    title,
    category,
    description,
    volume,
    price: Number(price),
    image: image || "",
  };
  products.push(product);
  res.status(201).json(product);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Список товаров
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", authMiddleware, roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Товар по id
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Не найден
 */
app.get("/api/products/:id", authMiddleware, roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const product = findProductById(req.params.id);
  if (!product) return res.status(404).json({ error: "product not found" });
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               volume: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
app.put("/api/products/:id", authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const product = findProductById(req.params.id);
  if (!product) return res.status(404).json({ error: "product not found" });
  const { title, category, description, volume, price, image } = req.body;
  if (title !== undefined) product.title = title;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (volume !== undefined) product.volume = volume;
  if (price !== undefined) product.price = Number(price);
  if (image !== undefined) product.image = image;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     description: Только администратор
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
app.delete("/api/products/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "product not found" });
  const removed = products.splice(index, 1)[0];
  res.json(removed);
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
  console.log("Демо-админ: admin@perfume.shop / admin123 (Василий Иванович)");
  console.log("Демо-покупатель: ivan@perfume.shop / buyer123 (Иван Иванов)");
});
