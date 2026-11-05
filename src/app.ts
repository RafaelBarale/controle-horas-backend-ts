import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import userRoutes from '@routes/userRoutes';
import { errorHandler } from '@middlewares/errorHandler';
import { authenticate } from '@middlewares/authenticate';
import authRoutes from '@routes/authRoutes';
import clientRoutes from '@routes/clientRoutes';
import projectRoutes from '@routes/projectRoutes';
import timeEntryRoutes from "@routes/timeEntryRoutes";

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

// Rotas de autenticação
app.use('/auth', authRoutes);

// Rotas de usuários
app.use('/users', authenticate, userRoutes);

// Rotas de clientes
app.use('/clients', authenticate, clientRoutes);

// Rotas de projetos
app.use('/projects', authenticate, projectRoutes);

// Rotas de lancamento de tempo
app.use('/time', authenticate, timeEntryRoutes);

// Middleware de Erro Global (Sempre deve ser o ltimo app.use)
app.use(errorHandler);

export default app;
