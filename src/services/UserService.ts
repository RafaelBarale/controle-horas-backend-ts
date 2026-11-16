import { UserRepository } from '@repositories/UserRepository';
import type { UserSummary } from '@repositories/UserRepository';
import type { Prisma } from '@database/prisma';
import bcrypt from "bcryptjs";
import { AppError } from '@utils/AppError';
import type { UpdateUserBody } from '@schemas/user.schema';

export class UserService {
  private userRepository = new UserRepository();

  async registerUser(data: Prisma.UserCreateInput): Promise<UserSummary> {
    const userExists = await this.userRepository.findByEmail(data.email);

    if (userExists) {
      throw new AppError('Este e-mail ja esta em uso.', 400); // 400 Bad Request
    }

    // Criptografia de senha
    data.password = await bcrypt.hash(data.password, 10);

    return this.userRepository.create(data);
  }

  async getAllUsers(): Promise<UserSummary[]> {
    return this.userRepository.findAll();
  }

  async updateUser(userId: number, data: UpdateUserBody): Promise<UserSummary> {

    const userExists = await this.userRepository.findById(userId);

    if (!userExists) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    // Verifica se o email foi alterado e se o novo email ja existe
    if (data.email && String(data.email) !== userExists.email) {
      const emailExists = await this.userRepository.findByEmail(data.email);

      if (emailExists) {
        throw new AppError('Este e-mail ja esta em uso.', 400); // 400 Bad Request
      }
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this.userRepository.update(userId, data);
  }

  async getByID(userId: number): Promise<UserSummary> {
    const user = await this.userRepository.findById(userId);
    
    if (!user || user.status !== 'ATIVO') {
      throw new AppError('Invalid or user inactive', 401);
    }

    return user;
  }

  async delete(userId: number): Promise<UserSummary> {
    const userExists = await this.userRepository.findById(userId);

    if (!userExists) {
      throw new AppError('Usuário não encontrado.', 404);
    }
    return this.userRepository.delete(userId);
  }
}
