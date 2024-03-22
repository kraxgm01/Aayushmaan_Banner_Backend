const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

const saltrounds = 10;
const app = express();
const port = 3000;

const username = "admin";
const passwordHash = "$2b$10$I8szwFSMDn4kiGT0Hzyfueg1MkbioTQGsLh/.ytPmm6yqoP77M7US"; // Example hash

const LINKS_FILE_PATH = 'links.txt';
let fileCount = 0;
let fileUrls = [];
const domain =
  process.env.NODE_ENV === "dev"
    ? "http://localhost:3000"
    : "http://ec2-13-201-81-22.ap-south-1.compute.amazonaws.com:3000";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('GLUEY')); // Secret for signed cookies

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: null,
    layoutsDir: __dirname + "/views",
}));
app.set("view engine", ".hbs");

// Serve static files
app.use("/banners", express.static(path.join(__dirname, "uploads")));

// Set storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        fileCount++;
        cb(null, "banner_" + fileCount + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Function to remove existing files in the 'uploads' directory
const clearUploadsFolder = (req, res, next) => {
    const directory = "uploads";
    fileCount = 0;
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
    } else {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            fs.unlinkSync(path.join(directory, file));
        }
    }
    next();
};


// Middleware for authentication
const authenticate = (req, res, next) => {
    const userCookie = req.signedCookies.user;
    if (!userCookie || userCookie.username !== username) {
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
    const isMatched = await bcrypt.compare(req.body.password, passwordHash);
    if (req.body.username === username && isMatched) {
        res.cookie('user', { username: req.body.username }, { signed: true, httpOnly: true });
        res.redirect("/image/upload");
    } else {
        res.redirect("/admin/login");
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/admin/login');
});

app.get("/image/upload", authenticate, (req, res) => {
    res.render("upload_page");
});



app.post("/image/upload", authenticate, clearUploadsFolder, upload.any("images", 5), (req, res) => {
    const files = req.files;
    // res.render("upload_page", {
    //     files: files,
    // });
    if (!files || files.length === 0) {
      res.status(400).send("No files were uploaded.");
    } else {
      res.redirect("/add-links");
    }
});

app.get("/add-links", authenticate, (req, res) => {
    const numberOfFields = Array(fileCount).fill().map((_, index) => index);
    res.render("add_links_page", { numberOfFields });
});

app.post("/add-links", authenticate, (req, res) => {
    const linkCount = fileCount;
    const writeStream = fs.createWriteStream(LINKS_FILE_PATH, { flags: 'w' });

    for (let i = 0; i < linkCount; i++) {
        const link = req.body[`link${i}`];
        if (link) {
            writeStream.write(`${link}\n`);
        }
    }

    writeStream.end();

    writeStream.on('finish', () => {
        res.status(200).send("Successfully added Images and Links"); // Redirect or show a success message.
    });

    writeStream.on('error', (err) => {
        res.status(500).send("Error writing to file");
    });
});

app.get("/banners", (req, res) => {
    const directory = "uploads";
    const LINKS_FILE_PATH = 'links.txt';
    
    // Reading the directory for image files
    fs.readdir(directory, (dirErr, files) => {
        if (dirErr) {
            res.status(500).send("Error reading directory");
            return;
        }

        // Reading the text file for URLs
        fs.readFile(LINKS_FILE_PATH, 'utf8', (fileErr, data) => {
            if (fileErr) {
                res.status(500).send("Error reading links file");
                return;
            }

            // Splitting text file content into an array of URLs
            const urls = data.trim().split('\n');

            // Associating each image with its corresponding URL
            // Ensuring that the number of URLs and images matches is crucial
            const banners = files.map((file, index) => {
                return {
                    imageUrl: `${domain}/banners/${file}`,
                    link: urls.length > index ? urls[index] : null
                };
            });

            res.status(200).json({ banners });
        });
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
