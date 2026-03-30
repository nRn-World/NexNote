export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
<<<<<<< HEAD
  data: string; // Firebase Storage URL or Base64 encoded file data
=======
  data: string; // Base64 encoded file data
>>>>>>> origin/main
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
<<<<<<< HEAD
  isPinned?: boolean;
  tags?: string[];
  history?: {
    title: string;
    content: string;
    updatedAt: number;
  }[];
=======
>>>>>>> origin/main
  createdAt: number;
  updatedAt: number;
}
