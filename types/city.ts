export interface City {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Locality {
  id: string;
  name: string;
  slug: string;
  cityId: string;
}
