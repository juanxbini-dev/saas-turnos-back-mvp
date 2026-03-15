import { ILandingConfigRepository } from '../../../domain/repositories/ILandingConfigRepository';
import { IImageRepository } from '../../../domain/repositories/IImageRepository';
import { LandingConfig } from '../../../domain/entities/LandingConfig';

type ImagenTipo = 'logo' | 'fondo';

export class UploadImagenConfigUseCase {
  constructor(
    private landingConfigRepository: ILandingConfigRepository,
    private imageRepository: IImageRepository
  ) {}

  async execute(empresaId: string, tipo: ImagenTipo, file: Buffer): Promise<LandingConfig> {
    await this.landingConfigRepository.upsert(empresaId);

    // Obtener config actual para borrar imagen anterior si existe
    const config = await this.landingConfigRepository.findByEmpresa(empresaId);
    const publicIdActual = tipo === 'logo' ? config?.logo_public_id : config?.fondo_public_id;

    if (publicIdActual) {
      await this.imageRepository.delete(publicIdActual);
    }

    const result = await this.imageRepository.upload(
      file,
      `landing/${empresaId}`,
      `${tipo}-${empresaId}`
    );

    if (tipo === 'logo') {
      return await this.landingConfigRepository.updateLogo(empresaId, result.url, result.publicId);
    } else {
      return await this.landingConfigRepository.updateFondo(empresaId, result.url, result.publicId);
    }
  }
}
