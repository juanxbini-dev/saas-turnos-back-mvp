import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';

// "Eliminar" un usuario = deshabilitarlo (soft-delete). No se borra la fila:
// sus turnos/ventas históricos referencian al usuario por FK. Deshabilitado
// no puede iniciar sesión ni renovar tokens, y desaparece de la landing y de
// los selectores internos (que ya filtran por activo = true). Reversible
// desde la lista de deshabilitados.
export class DeleteUsuarioUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(id: string, adminId: string, empresaId: string): Promise<void> {
    if (id === adminId) {
      const error: any = new Error('No podés deshabilitar tu propia cuenta');
      error.statusCode = 403;
      throw error;
    }

    const usuario = await this.usuarioRepository.findById(id);

    if (!usuario) {
      const error: any = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (usuario.empresa_id !== empresaId) {
      const error: any = new Error('No tenés permisos para deshabilitar este usuario');
      error.statusCode = 403;
      throw error;
    }

    await this.usuarioRepository.setActivo(id, false);
  }
}
