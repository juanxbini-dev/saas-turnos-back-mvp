import { User } from '../entities/User';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsernameAndDomain(username: string, domain: string): Promise<User | null>;
  findByUsernameOrEmail(identifier: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
}
