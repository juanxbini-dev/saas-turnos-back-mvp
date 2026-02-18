import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { JwtService } from '../../infrastructure/security/jwt.service';

const router = Router();

// Dependencies
const userRepository = new PostgresUserRepository();
const passwordService = new PasswordService();
const jwtService = new JwtService();
const loginUseCase = new LoginUseCase(userRepository, passwordService, jwtService);

// Controller
const authController = new AuthController(loginUseCase);

// Routes
router.post('/login', (req, res) => authController.login(req, res));

export default router;
