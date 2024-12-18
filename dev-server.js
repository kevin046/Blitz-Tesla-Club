const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Development server running on http://localhost:${PORT}`);
}); 