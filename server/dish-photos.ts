// Example photos for suggested dishes: freely licensed Wikimedia Commons
// photos downloaded once by scripts/fetch-dish-photos.ts into assets/dishes
// and served by this server under /assets. Their licenses (CC BY / BY-SA)
// require the author, license and source, which the app shows wherever one
// of these photos appears.

import photos from "./dish-photos.json";

export interface DishPhoto {
  file: string;
  author: string;
  license: string;
  licenseUrl?: string;
  // The file's page on Wikimedia Commons.
  pageUrl: string;
}

const PHOTOS: Record<string, DishPhoto> = photos;

export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function examplePhotoFor(dishName: string): DishPhoto | undefined {
  return PHOTOS[slugify(dishName)];
}
