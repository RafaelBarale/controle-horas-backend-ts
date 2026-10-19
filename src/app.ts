import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import userRoutes from '@routes/userRoutes';
import { errorHandler } from '@middlewares/errorHandler';
import { authenticate } from '@middlewares/authenticate';
import authRoutes from '@routes/authRoutes';

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
// health check
app.get('/', (_req, res) => {
    res.status(200).json({
        message: 'OK'
    });
});
//Rotas de autenticação
app.use('/auth', authRoutes);

//Rotas de usuários
app.use('/users', authenticate, userRoutes);

// Middleware de Erro Global (Sempre deve ser o ltimo app.use)
app.use(errorHandler);

export default app;
