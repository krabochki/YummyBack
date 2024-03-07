const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, { cors: { origin: "*" }});
const users = require("./users.js");
const plans = require("./plans.js")
const groups = require("./groups.js")
const updates = require("./updates.js")
const categories = require("./categories.js")
const ingredients = require("./ingredients.js")
const sections = require("./sections.js")
const comments = require("./comments.js")
const reports = require("./reports.js")
const recipes = require("./recipes.js")
const match = require("./match.js")
const notifications = require("./notifications.js")
const api = require("./auth.js")
const connection = require("./db");

const corsOptions = {
  origin: true, 
  credentials: true, 
};

const PORT = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());
app.use("/users", users);
app.use("/comments", comments);
app.use("/reports", reports);
app.use("/match", match);
app.use("/updates", updates);
app.use("/ingredients", ingredients);
app.use("/categories", categories);
app.use("/notifications", notifications);
app.use("/sections", sections);
app.use("/groups", groups);
app.use("/recipes", recipes);
app.use("/api", api);
app.use("/plans", plans);

io.on("connection", (socket) => {
  console.log("user connected");
});

app.get("/", (req, res) => {
  res.send("Привет, мир!");
});

httpServer.listen(PORT, () => console.log(`Сервер работает на порту ${PORT}`));
