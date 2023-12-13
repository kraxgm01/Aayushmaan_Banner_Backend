const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const port = 3000;

const username = "admin";
const password = "admin";

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

// Middleware for authentication
const authenticate = (req, res, next) => {
  if (
    !req.session.user ||
    req.session.user.username !== username ||
    req.session.user.password !== password
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

app.post("/admin/login", (req, res) => {
  if (req.body.username !== username || req.body.password !== password) {
    res.redirect("/admin/login");
    return;
  }
  req.session.user = {
    username: req.body.username,
    password: req.body.password,
  };
  res.redirect("/image/upload");
});

app.get("/image/upload", authenticate, (req, res) => {
  console.log("HAT BENCHO");
  res.render("upload_page");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
