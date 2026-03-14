import { IImageRepository, UploadResult } from '../../domain/repositories/IImageRepository';
import { cloudinary } from '../services/cloudinary.service';

export class CloudinaryImageRepository implements IImageRepository {
  async upload(file: Buffer, folder: string, filename: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `turnos/${folder}`,
          public_id: filename,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id
            });
          } else {
            reject(new Error('Upload failed: no result returned'));
          }
        }
      );
      uploadStream.end(file);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
