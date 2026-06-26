import * as bannerRepo from '../repositories/bannerRepository';
import { IBanner } from '../types';

/**
 * Retrieves all banners for a specific restaurant tenant.
 */
export async function getBanners(restaurantId: string): Promise<IBanner[]> {
  return bannerRepo.findAll(restaurantId);
}

/**
 * Retrieves active banners for a specific restaurant tenant.
 */
export async function getActiveBanners(restaurantId: string): Promise<IBanner[]> {
  return bannerRepo.findActive(restaurantId);
}

/**
 * Saves or updates a banner.
 */
export async function saveBanner(
  restaurantId: string,
  data: {
    _id?: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    image?: string;
    active?: boolean;
  }
): Promise<IBanner> {
  if (data._id) {
    const updated = await bannerRepo.update(data._id, restaurantId, data);
    if (!updated) {
      throw new Error('Banner not found or unauthorized');
    }
    return updated;
  }
  return bannerRepo.create({
    restaurantId,
    title: data.title,
    subtitle: data.subtitle,
    buttonText: data.buttonText,
    buttonLink: data.buttonLink,
    image: data.image,
    active: data.active,
  });
}

/**
 * Deletes a banner.
 */
export async function deleteBanner(id: string, restaurantId: string): Promise<boolean> {
  return bannerRepo.deleteBanner(id, restaurantId);
}
