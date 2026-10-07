import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
app.use('/users', userRoutes);

// Middleware de Erro Global (Sempre deve ser o �ltimo app.use)
app.use(errorHandler);

export default app;
