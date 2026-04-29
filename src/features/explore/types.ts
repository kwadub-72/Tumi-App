import { User } from '@/src/shared/models/types';

export interface SimilarUser extends User {
  similarityScore: number;
}

export interface PopularUser extends User {
  engagementScore: number;
  rank: number;
}
