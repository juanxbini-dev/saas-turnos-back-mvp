import { Request, Response } from 'express';
import { GetProfesionalesPublicUseCase } from '../../../application/use-cases/public/GetProfesionalesPublicUseCase';
import { PostgresUsuarioRepository } from '../../../infrastructure/repositories/PostgresUsuarioRepository';
import { pool } from '../../../infrastructure/database/postgres.connection';

export class ProfesionalPublicController {
  private getProfesionalesPublicUseCase: GetProfesionalesPublicUseCase;

  constructor() {
    const usuarioRepository = new PostgresUsuarioRepository();
    this.getProfesionalesPublicUseCase = new GetProfesionalesPublicUseCase(usuarioRepository);
  }

  getServicios = async (req: Request, res: Response) => {
    try {
      const { profesionalId } = req.params;
      console.log('🔍 Servicios Controller - profesionalId recibido:', profesionalId);

      if (!profesionalId) {
        console.log('❌ Servicios Controller - profesionalId es undefined/null');
        return res.status(400).json({
          success: false,
          message: 'ID de profesional es requerido'
        });
      }

      console.log('✅ Servicios Controller - Buscando servicios para profesional:', profesionalId);
      
      // Consultar servicios del profesional desde usuario_servicios
      const query = `
        SELECT 
          s.id,
          s.nombre,
          s.descripcion,
          COALESCE(us.precio_personalizado, s.precio_base) as precio,
          COALESCE(us.duracion_personalizada, s.duracion) as duracion_minutos
        FROM usuario_servicios us
        JOIN servicios s ON us.servicio_id = s.id
        WHERE us.usuario_id = $1 
        AND us.habilitado = true
        AND s.activo = true
        ORDER BY s.nombre
      `;
      
      const result = await pool.query(query, [profesionalId]);
      console.log('🔍 Servicios Controller - Servicios encontrados:', result.rows.length);
      
      const servicios = result.rows.map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        precio: parseFloat(row.precio),
        duracion_minutos: parseInt(row.duracion_minutos)
      }));

      res.status(200).json({
        success: true,
        data: servicios
      });
    } catch (error: any) {
      console.error('Error al obtener servicios públicos:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
      return;
    }
  };

  getProfesionales = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params; // Cambiado de empresaId a slug
      console.log('🔍 Profesionales Controller - slug recibido:', slug);

      if (!slug) {
        console.log('❌ Profesionales Controller - slug es undefined/null');
        return res.status(400).json({
          success: false,
          message: 'ID de empresa es requerido'
        });
      }

      console.log('✅ Profesionales Controller - Buscando profesionales para empresa:', slug);
      const profesionales = await this.getProfesionalesPublicUseCase.execute({ 
        empresaId: slug as string // El use case espera empresaId
      });

      res.status(200).json({
        success: true,
        data: profesionales
      });
    } catch (error: any) {
      console.error('Error al obtener profesionales públicos:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
      return;
    }
  };
}
