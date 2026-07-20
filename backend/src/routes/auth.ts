import { Router } from 'express';
import * as AuthController from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post('/signup', AuthController.signup);
authRouter.post('/login', AuthController.login);
authRouter.get('/login', AuthController.login);
authRouter.all('/logout', AuthController.logout);
authRouter.get('/me', AuthController.me);
