export interface UploadResult {
  url: string;
  publicId: string;
}

export interface IImageRepository {
  upload(file: Buffer, folder: string, filename: string): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
}
