import bcrypt from 'bcrypt';

export class PasswordService {
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
