const express = require("express");
const exphbs = require("express-handlebars");

const app = express();
const port = 3000;

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
