import { UserRepository } from '@repositories/UserRepository';
import type { UserSummary } from '@repositories/UserRepository';
import type { Prisma } from '@database/prisma';
import bcrypt from "bcryptjs";
import { AppError } from '@utils/AppError';

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

  async updateUser(userId: number, data: Prisma.UserUpdateInput): Promise<UserSummary> {

    const userExists = await this.userRepository.findById(userId);

    if(!userExists) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    return this.userRepository.update(userId, data);
  }

  async getByID(userId: number): Promise<UserSummary> {
    const user = await this.userRepository.findById(userId);

    if(!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    return user;
  }

  async delete(userId: number): Promise<UserSummary> {
    return this.userRepository.delete(userId);
  }
}
