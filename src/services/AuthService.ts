// services/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '@repositories/UserRepository';
import { authEnv } from '@schemas/auth.schema';
import { AppError } from '@utils/AppError';
import { prisma } from '@database/prisma';

export class AuthService {
  constructor(private userRepo = new UserRepository()) { }
  async login(email: string, password: string) {
    //valida se o usuario exite e a senha confere
    const user = await this.userRepo.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid credentials', 401);
    }

    //Valida o status do usuario
    if (user.status !== 'ATIVO') {
      throw new AppError('Inactive user', 401);
    }

    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role
    };

    //Gera o token de acesso
    const accessToken = jwt.sign(payload, authEnv.JWT_SECRET, { expiresIn: authEnv.JWT_EXPIRES_IN });
    //Gera o token de refresh
    const refreshToken = jwt.sign(payload, authEnv.JWT_REFRESH_SECRET, { expiresIn: authEnv.JWT_REFRESH_EXPIRES_IN });

    await prisma.user.update({
        where: { userId: user.userId },
        data: { refreshToken: refreshToken }
      });

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  async refreshToken(refreshToken: string){
    try{
      //1 verifica seo token usando o segredo de refresh
      const payload = jwt.verify(refreshToken, authEnv.JWT_REFRESH_SECRET) as jwt.JwtPayload;

      //checa se o usuario ainda existe e está ativo no banco
      const user = await this.userRepo.findByEmail(payload.email);
      if(!user || user.status !== 'ATIVO'){
        throw new AppError('User not found or inactive', 401)
      }

      //Gera um novo accessToken
      const newPayload = {
        userId: user.userId,
        email: user.email,
        role: user.role
      };
      const newAccessToken = jwt.sign(newPayload, authEnv.JWT_SECRET, { expiresIn: authEnv.JWT_EXPIRES_IN });

      //Gera um novo token de refresh
      const newRefreshToken = jwt.sign(newPayload, authEnv.JWT_REFRESH_SECRET, { expiresIn: authEnv.JWT_REFRESH_EXPIRES_IN });

      await prisma.user.update({
        where: { userId: user.userId },
        data: { refreshToken: newRefreshToken }
      });
      
      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
      
    }catch(err){
      if(err instanceof AppError) throw err;
      
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }
}