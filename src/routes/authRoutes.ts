// import { Router, Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { validateLogin } from '@middlewares/validateLogin';
import { login, refresh, logout } from '@controllers/AuthController';
import { validateRefresh } from '@middlewares/validateRefresh';
import { validateLogout } from '@middlewares/validateLogout';

const authRoutes = Router();

//rota de login
authRoutes.post('/login', validateLogin, login);

//rota de logout
authRoutes.post('/logout', validateLogout, logout);

//rota de refresh token
authRoutes.post('/refresh', validateRefresh, refresh);

export default authRoutes;
