
const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const PORT = 3000;

const MONGODB_URL ="mongodb+srv://Students:Students123@cluster0.txikkir.mongodb.net/";


const SESSION_SECRET ="Ayesha@123";
 

const client = new MongoClient(MONGODB_URL);
let users;

// Middleware must appear BEFORE the routes.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60
    }
  })
);

// Image upload: JPG, PNG, or WebP; maximum 2 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Only JPG, PNG, or WebP images are allowed."));
    }
  }
});

// LOGIN PAGE
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login", { error: "" });
});

// SIGNUP PAGE
app.get("/signup", (req, res) => {
  res.render("signup", { error: "" });
});

// REGISTER URL: use the same signup page.
app.get("/register", (req, res) => {
  res.render("register", { error: "" });
});

// CREATE ACCOUNT
app.post("/signup", (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (error) {
      const message =
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
          ? "Image size must be 2 MB or less."
          : error.message;

      return res.status(400).render("signup", {
        error: message
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const fullname = (req.body?.fullname || "").trim();
    const email = (req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";
    const confirmPassword = req.body?.confirmPassword || "";

    if (!fullname || !email || !password || !confirmPassword) {
      return res.status(400).render("signup", {
        error: "Please fill in all required fields."
      });
    }

    if (password.length < 8) {
      return res.status(400).render("signup", {
        error: "Password must contain at least 8 characters."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("signup", {
        error: "Passwords do not match."
      });
    }

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).render("signup", {
        error: "This email is already registered. Please log in."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      fullname,
      email,
      password: hashedPassword,
      profileImage: null,
      createdAt: new Date()
    };

    if (req.file) {
      newUser.profileImage = {
        data: req.file.buffer.toString("base64"),
        contentType: req.file.mimetype
      };
    }

    const result = await users.insertOne(newUser);

    // Log the new user in after successful signup.
    req.session.userId = result.insertedId.toString();
    req.session.fullname = fullname;

    req.session.save((error) => {
      if (error) {
        console.error("Session save error:", error);
        return res.status(500).render("signup", {
          error: "Account created, but login failed. Please log in."
        });
      }

      res.redirect("/home");
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === 11000) {
      return res.status(409).render("signup", {
        error: "This email is already registered."
      });
    }

    res.status(500).render("signup", {
      error: "Could not create your account. Please try again."
    });
  }
});

// LOGIN
app.post("/login", async (req, res, next) => {
  try {
    // These values will no longer crash if req.body is missing.
    const email = (req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";

    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Please enter your email and password."
      });
    }

    const user = await users.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", {
        error: "Invalid email or password."
      });
    }

    req.session.userId = user._id.toString();
    req.session.fullname = user.fullname;

    req.session.save((error) => {
      if (error) return next(error);
      res.redirect("/home");
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).render("login", {
      error: "Login failed. Please try again."
    });
  }
});

// PROTECTED HOME PAGE
app.get("/home", async (req, res) => {
  try {
    if (!req.session.userId || !ObjectId.isValid(req.session.userId)) {
      return res.redirect("/login");
    }

    const user = await users.findOne({
      _id: new ObjectId(req.session.userId)
    });

    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    res.render("home", { user });
  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).send("Could not load the home page.");
  }
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).send("Could not log out.");
    }

    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

// HANDLE UNKNOWN ROUTES
app.use((req, res) => {
  res.status(404).send('Page not found. <a href="/login">Login</a>');
});

// START SERVER AFTER MONGODB CONNECTS
async function startServer() {
  try {
    await client.connect();

    const db = client.db("auth-demo");
    users = db.collection("users");

    await users.createIndex({ email: 1 }, { unique: true });

    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
}

startServer();
