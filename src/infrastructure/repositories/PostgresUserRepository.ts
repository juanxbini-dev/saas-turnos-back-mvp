import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { pool } from '../database/postgres.connection';

export class PostgresUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT u.*, e.dominio, e.activo as empresa_activa
      FROM usuarios u
      JOIN empresas e ON u.empresa_id = e.id
      WHERE u.email = $1
      LIMIT 1;
    `;
    
    try {
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        empresa_id: row.empresa_id,
        roles: row.roles || [],
        activo: row.activo,
        tenant: row.dominio,
        empresa_activa: row.empresa_activa
      };
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findByUsernameAndDomain(username: string, domain: string): Promise<User | null> {
    const query = `
      SELECT u.*, e.dominio, e.activo as empresa_activa
      FROM usuarios u
      JOIN empresas e ON u.empresa_id = e.id
      WHERE u.username = $1 AND e.dominio = $2
      LIMIT 1;
    `;
    
    try {
      const result = await pool.query(query, [username, domain]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        empresa_id: row.empresa_id,
        roles: row.roles || [],
        activo: row.activo,
        tenant: row.dominio,
        empresa_activa: row.empresa_activa
      };
    } catch (error) {
      console.error('Error finding user by username and domain:', error);
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = 'UPDATE usuarios SET last_login = NOW() WHERE id = $1';
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }
}
