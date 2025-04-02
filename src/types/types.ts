export interface GQLTask {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    user?: {
      id: string;
      name: string;
    } | null;
  }