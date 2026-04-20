import { pool } from '../database/postgres.connection';
import { IClienteRepository, CreateClienteData, UpdateClienteData, ClientesPaginados } from '../../domain/repositories/IClienteRepository';
import { Cliente, TurnoResumen, ProductoComprado } from '../../domain/entities/Cliente';

export class PostgresClienteRepository implements IClienteRepository {
  async findByEmpresa(empresaId: string): Promise<Cliente[]> {
    const query = `
      SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY nombre ASC
    `;
    
    const result = await pool.query(query, [empresaId]);
    return result.rows;
  }

  async findByEmpresaPaginado(empresaId: string, pagina: number, porPagina: number, busqueda?: string): Promise<ClientesPaginados> {
    const offset = (pagina - 1) * porPagina;
    const params: any[] = [empresaId];
    let whereExtra = '';

    if (busqueda) {
      params.push(`%${busqueda}%`);
      whereExtra = ` AND (nombre ILIKE $${params.length} OR email ILIKE $${params.length} OR telefono ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM clientes WHERE empresa_id = $1${whereExtra}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(porPagina, offset);
    const dataResult = await pool.query(
      `SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
       FROM clientes
       WHERE empresa_id = $1${whereExtra}
       ORDER BY nombre ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { items: dataResult.rows, total };
  }

  async findByProfesional(profesionalId: string, empresaId: string): Promise<Cliente[]> {
    const query = `
      SELECT DISTINCT c.id, c.nombre, c.email, c.telefono, c.empresa_id, c.activo, c.created_at, c.updated_at
      FROM clientes c
      INNER JOIN turnos t ON c.id = t.cliente_id
      WHERE t.usuario_id = $1 AND c.empresa_id = $2
      ORDER BY c.nombre ASC
    `;
    
    const result = await pool.query(query, [profesionalId, empresaId]);
    return result.rows;
  }

  async findById(id: string): Promise<Cliente | null> {
    const query = `
      SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
      FROM clientes
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: CreateClienteData): Promise<Cliente> {
    const query = `
      INSERT INTO clientes (id, nombre, email, telefono, empresa_id, activo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.nombre,
      data.email,
      data.telefono || null,
      data.empresa_id
    ]);
    
    return result.rows[0];
  }

  async update(id: string, data: UpdateClienteData): Promise<Cliente> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.telefono !== undefined) {
      fields.push(`telefono = $${paramIndex++}`);
      values.push(data.telefono);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE clientes
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
  }

  async existeEmail(email: string, empresaId: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM clientes
      WHERE email = $1 AND empresa_id = $2
    `;
    
    const params: any[] = [email, empresaId];
    
    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  async existeTelefono(telefono: string, empresaId: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM clientes
      WHERE telefono = $1 AND empresa_id = $2
    `;
    
    const params: any[] = [telefono, empresaId];
    
    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  async findByEmailOrTelefono(email: string | undefined, empresaId: string, telefono?: string, nombre?: string): Promise<Cliente | null> {
    const conditions: string[] = [];
    const params: any[] = [empresaId];

    if (email) {
      params.push(email);
      conditions.push(`email = $${params.length}`);
    }

    if (telefono) {
      params.push(telefono);
      conditions.push(`telefono = $${params.length}`);
    }

    if (nombre) {
      params.push(nombre.trim());
      conditions.push(`LOWER(nombre) = LOWER($${params.length})`);
    }

    if (conditions.length === 0) {
      return null;
    }

    const query = `
      SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
      FROM clientes
      WHERE empresa_id = $1 AND (${conditions.join(' OR ')})
      LIMIT 1
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCliente(result.rows[0]);
  }

  async findByTelefono(telefono: string, empresaId: string): Promise<Cliente | null> {
    const result = await pool.query(
      `SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
       FROM clientes WHERE empresa_id = $1 AND telefono = $2 LIMIT 1`,
      [empresaId, telefono]
    );
    return result.rows[0] ? this.mapRowToCliente(result.rows[0]) : null;
  }

  async findByEmail(email: string, empresaId: string): Promise<Cliente | null> {
    const result = await pool.query(
      `SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
       FROM clientes WHERE empresa_id = $1 AND email = $2 LIMIT 1`,
      [empresaId, email]
    );
    return result.rows[0] ? this.mapRowToCliente(result.rows[0]) : null;
  }

  async getClienteTurnos(clienteId: string, empresaId: string): Promise<TurnoResumen[]> {
    const query = `
      SELECT
        t.id,
        t.fecha::text,
        t.hora::text,
        t.servicio,
        t.estado,
        t.total_final,
        t.metodo_pago,
        t.notas,
        u.nombre AS profesional_nombre
      FROM turnos t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.cliente_id = $1 AND t.empresa_id = $2
      ORDER BY t.fecha DESC, t.hora DESC
    `;
    const result = await pool.query(query, [clienteId, empresaId]);
    return result.rows;
  }

  async getClienteProductos(clienteId: string, empresaId: string): Promise<ProductoComprado[]> {
    const query = `
      SELECT
        vp.id,
        vp.nombre_producto,
        vp.cantidad,
        vp.precio_unitario,
        vp.precio_total,
        vp.metodo_pago,
        vp.created_at::date::text AS fecha,
        u.nombre AS vendedor_nombre
      FROM venta_productos vp
      LEFT JOIN usuarios u ON vp.vendedor_id = u.id
      WHERE vp.cliente_id = $1 AND vp.empresa_id = $2
      ORDER BY vp.created_at DESC
    `;
    const result = await pool.query(query, [clienteId, empresaId]);
    return result.rows;
  }

  async getTurnosCount(clienteId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM turnos
      WHERE cliente_id = $1
    `;
    
    const result = await pool.query(query, [clienteId]);
    return parseInt(result.rows[0].count);
  }

  private mapRowToCliente(row: any): Cliente {
    return {
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      empresa_id: row.empresa_id,
      activo: row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
