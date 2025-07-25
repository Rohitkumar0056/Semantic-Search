import express from 'express';
import dotenv from 'dotenv';
import searchRoutes from './routes/search';
dotenv.config();

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use('/', searchRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
