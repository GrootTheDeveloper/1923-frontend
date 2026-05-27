const express = require("express");
const path = require("path");

const app = express();
// Azure assigns the port dynamically to process.env.PORT (usually 8080)
const port = process.env.PORT || 8080;

// Serve the static files built by Vite in the 'dist' folder
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback: any request that doesn't match a static file goes to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`React frontend server is running on port ${port}`);
});
