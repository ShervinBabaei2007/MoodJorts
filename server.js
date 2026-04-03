let express = require("express");
const path = require("path");

const PORT = process.env.PORT || 8000;

let app = express();

// Serve all files from the current directory
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => console.log(`server listening on http://localhost:${PORT}`));
