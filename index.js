const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const saltrounds = 10;

const app = express();
const port = 3000;

const username = "admin";
const passwordHash =
  "$2b$10$I8szwFSMDn4kiGT0Hzyfueg1MkbioTQGsLh/.ytPmm6yqoP77M7US";
let fileCount = 0;
const domain =
  process.env.NODE_ENV === "dev"
    ? "http://localhost:3000"
    : "https://aayushmaanbanners.onrender.com";

app.use(bodyParser.urlencoded({ extended: false }));

// Setup sessions
app.use(
  session({
    secret: "GLUEY", // Change this to a more secure secret for production
    resave: false,
    saveUninitialized: true,
  })
);

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    defaultLayout: null,
    layoutsDir: __dirname + "/views",
  })
);
app.set("view engine", ".hbs");

// Serve static files
app.use("/banners", express.static(path.join(__dirname, "uploads")));

// Set storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save uploaded files to the 'uploads' directory
  },
  filename: function (req, file, cb) {
    fileCount++;
    cb(null, "banner_" + fileCount + path.extname(file.originalname)); // Set unique file names
  },
});

// Initialize multer with the storage configuration for multiple files
const upload = multer({ storage: storage });

// Function to remove existing files in the 'uploads' directory
const clearUploadsFolder = (req, res, next) => {
  const directory = "uploads";
  fileCount = 0;
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }

  const files = fs.readdirSync(directory);

  for (const file of files) {
    fs.unlinkSync(path.join(directory, file));
  }

  next();
};

// Middleware for authentication
const authenticate = (req, res, next) => {
  if (
    !req.session.user ||
    req.session.user.username !== username ||
    req.session.user.password !== passwordHash
  ) {
    res.redirect("/admin/login");
    return;
  }

  next();
};

app.get("/", (req, res) => {
  res.redirect("/admin/login");
});

app.get("/admin/login", (req, res) => {
  res.render("login_page");
});

app.post("/admin/login", async (req, res) => {
  // const hashedPass = await bcrypt.hash(req.body.password, saltrounds);
  const isMatched = await bcrypt.compare(req.body.password, passwordHash);
  console.log("PASS HASH: ", isMatched);

  if (req.body.username !== username || isMatched === false) {
    res.redirect("/admin/login");
    return;
  }
  req.session.user = {
    username: req.body.username,
    password: passwordHash,
  };
  res.redirect("/image/upload");
});

app.get("/image/upload", authenticate, (req, res) => {
  res.render("upload_page");
});

app.post(
  "/image/upload",
  authenticate,
  clearUploadsFolder,
  upload.any("images", 5),
  (req, res) => {
    console.log("Upload ho chuka hai");
    const files = req.files;
    console.log(files.length);
    if (!files || files.length === 0) {
      res.status(400).send("No files were uploaded.");
    } else {
      res.status(201).send("Files uploaded successfully.");
    }
  }
);

app.get("/banners", (req, res) => {
  const directory = "uploads";
  fs.readdir(directory, (err, files) => {
    if (err) return;

    const fileUrls = [];
    for (const file of files) {
      fileUrls.push(domain + "/banners/" + file);
    }
    res.status(200).json({
      banners: fileUrls,
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
