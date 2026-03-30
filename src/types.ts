export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
}

export interface Category {
  id: string;
  uid: string;
  name: string;
  color: string; // hex color
  order: number;
  createdAt: number;
}

export interface Note {
  id: string;
  uid: string;
  title: string;
  content: string;
  attachments: Attachment[];
  categoryId?: string;
  code?: {
    html: string;
    css: string;
    js: string;
  };
  coverImage?: string;
  isPinned?: boolean;
  tags?: string[];
  isShared?: boolean;
  shareId?: string;
  history?: {
    title: string;
    content: string;
    updatedAt: number;
  }[];
  order?: number;
  createdAt: number;
  updatedAt: number;
}
