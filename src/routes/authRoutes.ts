// import { Router, Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { validateBodyLogin } from '@middlewares/validateBodyLogin';
import { login, refresh } from '@controllers/AuthController';
import { validateBodyRefresh } from '@middlewares/validateBodyRefresh';

const authRoutes = Router();

//rota de login
authRoutes.post('/login', validateBodyLogin, login);

//rota de refresh token
authRoutes.post('/refresh', validateBodyRefresh, refresh);

export default authRoutes;
