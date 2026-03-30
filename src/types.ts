export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Firebase Storage URL or Base64 encoded file data
}

export interface Note {
  id: string;
  uid: string;
  title: string;
  content: string;
  attachments: Attachment[];
  code?: {
    html: string;
    css: string;
    js: string;
  };
  coverImage?: string;
  isPinned?: boolean;
  tags?: string[];
  history?: {
    title: string;
    content: string;
    updatedAt: number;
  }[];
  createdAt: number;
  updatedAt: number;
}
