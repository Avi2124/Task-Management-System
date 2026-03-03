import app from "./app.js";
import connectDB from "./config/db.js";
import 'dotenv/config';


const PORT = process.env.PORT || 1312;

connectDB();
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});