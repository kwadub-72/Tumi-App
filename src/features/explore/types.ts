import { User, TribeType, TribePrivacy } from '@/src/shared/models/types';

export interface SimilarUser extends User {
  similarityScore: number;
}

export interface PopularUser extends User {
  engagementScore: number;
  rank: number;
}

/** Tribe data returned by the search_tribes RPC */
export interface DiscoveryTribe {
  id: string;
  name: string;
  avatarUrl?: string;
  themeColor: string;
  tribeType: TribeType;
  privacy: TribePrivacy;
  description: string;
  tags: string[];
  memberCount: number;
  /** null = not specified (omit icon), true = natural, false = enhanced */
  naturalStatus: boolean | null;
  activityType?: string;
  activityIcon?: string;
  focusType: TribeType;
  joinStatus: 'none' | 'member' | 'pending';
}

