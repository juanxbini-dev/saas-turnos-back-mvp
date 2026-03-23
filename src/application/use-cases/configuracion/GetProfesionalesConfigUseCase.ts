import { ILandingProfesionalRepository } from '../../../domain/repositories/ILandingConfigRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { LandingProfesional } from '../../../domain/entities/LandingConfig';

export interface ProfesionalConfigItem extends LandingProfesional {
  enLanding: boolean;
}

export class GetProfesionalesConfigUseCase {
  constructor(
    private landingProfesionalRepository: ILandingProfesionalRepository,
    private usuarioRepository: IUsuarioRepository
  ) {}

  async execute(empresaId: string): Promise<ProfesionalConfigItem[]> {
    const [todosUsuarios, enLanding] = await Promise.all([
      this.usuarioRepository.findByEmpresa(empresaId),
      this.landingProfesionalRepository.findAllByEmpresa(empresaId)
    ]);

    const enLandingMap = new Map(enLanding.map(lp => [lp.usuario_id, lp]));

    // Combinar: todos los usuarios activos con su config de landing si existe
    return todosUsuarios
      .filter(u => u.activo)
      .map(u => {
        const landingData = enLandingMap.get(u.id);
        const item: ProfesionalConfigItem = {
          id: landingData?.id || '',
          empresa_id: empresaId,
          usuario_id: u.id,
          nombre: u.nombre,
          username: u.username,
          avatar_url: u.avatar_url ?? null,
          subtitulo: landingData?.subtitulo ?? null,
          descripcion: landingData?.descripcion ?? null,
          orden: landingData?.orden ?? 0,
          visible: landingData?.visible ?? false,
          enLanding: !!landingData,
          created_at: landingData?.created_at || '',
          updated_at: landingData?.updated_at || ''
        };
        return item;
      })
      .sort((a, b) => {
        // Visibles primero ordenados por orden, luego el resto por nombre
        if (a.visible && !b.visible) return -1;
        if (!a.visible && b.visible) return 1;
        if (a.visible && b.visible) return a.orden - b.orden;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
  }
}
