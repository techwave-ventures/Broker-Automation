import { Router } from 'express';
import * as AuthController from '../controllers/authController.js';

export const authRouter = Router();

authRouter.get('/login', AuthController.login);
authRouter.get('/callback', AuthController.callback);
authRouter.get('/logout', AuthController.logout);
authRouter.get('/me', AuthController.me);
