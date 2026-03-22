import { Router, Request, Response } from 'express';
import { pool } from '../../infrastructure/database/postgres.connection';
import { PasswordService } from '../../infrastructure/security/password.service';
import { CryptoService } from '../../infrastructure/security/crypto.service';

const router = Router();
const passwordService = new PasswordService();
const cryptoService = new CryptoService();

// POST /register — ruta temporal para crear empresa + primer usuario admin
// ELIMINAR una vez creada la empresa real
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { empresa_nombre, empresa_dominio, empresa_plan, usuario_nombre, usuario_email, usuario_password, usuario_username } = req.body;

  if (!empresa_nombre || !empresa_dominio || !usuario_nombre || !usuario_email || !usuario_password) {
    res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el dominio no exista
    const dominioExiste = await client.query('SELECT id FROM empresas WHERE dominio = $1', [empresa_dominio]);
    if (dominioExiste.rows.length > 0) {
      res.status(409).json({ success: false, message: 'El dominio ya está en uso' });
      return;
    }

    // Crear empresa
    const empresaId = `emp_${Date.now()}_${cryptoService.generateUUID().slice(0, 8)}`;
    await client.query(
      `INSERT INTO empresas (id, nombre, dominio, plan, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [empresaId, empresa_nombre, empresa_dominio, empresa_plan || 'basico']
    );

    // Crear usuario admin
    const usuarioId = `usr_${Date.now()}_${cryptoService.generateUUID().slice(0, 8)}`;
    const hashedPassword = await passwordService.hash(usuario_password);
    const username = usuario_username || empresa_dominio;

    await client.query(
      `INSERT INTO usuarios (id, email, password, nombre, empresa_id, roles, username, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())`,
      [usuarioId, usuario_email, hashedPassword, usuario_nombre, empresaId, ['admin', 'profesional'], username]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        empresa: { id: empresaId, nombre: empresa_nombre, dominio: empresa_dominio },
        usuario: { id: usuarioId, email: usuario_email, nombre: usuario_nombre, roles: ['admin', 'profesional'] }
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

export default router;
