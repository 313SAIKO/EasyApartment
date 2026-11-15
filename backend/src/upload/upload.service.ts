import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';

@Injectable()
export class UploadService {
  async uploadImage(file: Express.Multer.File, folder: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw new ServiceUnavailableException(
        'Image uploads are not configured; contact the administrator',
      );
    }
    const uniqueFileName = randomUUID();
    return new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `EasyApartment/${folder}`,
            public_id: uniqueFileName,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) return reject(error);
            if (!result)
              return reject(new Error('Cloudinary returned no upload result'));
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  async deleteImage(publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    return cloudinary.uploader.destroy(publicId);
  }
}
