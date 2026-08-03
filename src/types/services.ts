export interface TService {
  title: string;
  description: string;
  price?: string;
  images?: string[];
  features?: string[];
  order: number;
  published: boolean;
}
