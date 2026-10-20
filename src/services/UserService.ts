import { UserRepository } from '@repositories/UserRepository';
import type { Prisma, User } from '@prisma/client';
import bcrypt from "bcryptjs";
import { AppError } from '@utils/AppError';

export class UserService {
  private userRepository = new UserRepository();

  async registerUser(data: Prisma.UserCreateInput): Promise<User> {
    const userExists = await this.userRepository.findByEmail(data.email);
    
    if (userExists) {
      throw new AppError('Este e-mail ja esta em uso.', 400); // 400 Bad Request
    }

    // Criptografia de senha
    data.password = await bcrypt.hash(data.password, 10);
    
    return this.userRepository.create(data);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }
}
