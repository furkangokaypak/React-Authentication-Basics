// Import necessary modules
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import dotenv from "dotenv";
dotenv.config();

// Create the Express application
const app = express();
const port = 5000;
const saltRounds = 10;

// Middleware settings
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Establish the database connection
const db = await mysql.createConnection({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Home route
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Welcome, ${req.user.username}! You are authenticated.`);
  } else {
    res.send("You are not authenticated.");
  }
});

// Example API route
app.get("/api", (req, res) => {
  res.json({ users: ["userOne", "userTwo", "userThree"] });
});

// User registration route
app.post("/register", async (req, res) => {
  const { username, email, name, surname, password } = req.body;

  try {
    // Check if email and username are unique
    const [checkMail] = await db.execute("SELECT * FROM users WHERE email=?", [
      email,
    ]);
    const [checkUsername] = await db.execute(
      "SELECT * FROM users WHERE username=?",
      [username]
    );

    if (checkMail.length > 0) {
      return res
        .status(400)
        .json({ message: "Email already exists. Try logging in." });
    }

    if (checkUsername.length > 0) {
      return res
        .status(400)
        .json({ message: "Username already exists. Try logging in." });
    }

    // Hash the password and save the user to the database
    const hash = await bcrypt.hash(password, saltRounds);
    const query =
      "INSERT INTO users (username, email, name, surname, password) VALUES (?, ?, ?, ?, ?)";
    const values = [username, email, name, surname, hash];

    const [result] = await db.execute(query, values);
    console.log("User registered:", result);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// User login route
app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res
        .status(401)
        .json({ message: info.message || "Authentication failed" });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return res.status(500).json({ message: "Error logging in" });
      }
      return res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username, email: user.email },
      });
    });
  })(req, res, next);
});

// User logout route
app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error during logout", error: err.message });
    }
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error destroying session", error: err.message });
      }
      res.clearCookie("connect.sid", { path: "/" });
      res.status(200).json({ message: "Logout successful" });
    });
  });
});

// Configure the Passport strategy
passport.use(
  new Strategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async function verify(email, password, cb) {
      try {
        const [results] = await db.execute(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );
        if (results.length === 0) {
          return cb(null, false, { message: "Incorrect email or password." });
        }
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          return cb(null, user);
        } else {
          return cb(null, false, { message: "Incorrect email or password." });
        }
      } catch (error) {
        console.error("Error during password verification:", error);
        return cb(error);
      }
    }
  )
);

// Passport serialize and deserialize operations
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const [results] = await db.execute(
      "SELECT id, username, email FROM users WHERE id = ?",
      [id]
    );
    if (results.length > 0) {
      cb(null, results[0]);
    } else {
      cb(new Error("User not found"));
    }
  } catch (error) {
    console.error("Error during deserialization:", error);
    cb(error);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
