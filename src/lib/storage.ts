<<<<<<< HEAD

/**
 * @deprecated LocalForage is replaced by Firebase in current implementation.
 */
=======
import localforage from 'localforage';
import { Note } from '../types';

localforage.config({
  name: 'NexNote',
  storeName: 'notes'
});

export const getNotes = async (): Promise<Note[]> => {
  const notes = await localforage.getItem<Note[]>('notes');
  return notes || [];
};

export const saveNotes = async (notes: Note[]): Promise<void> => {
  await localforage.setItem('notes', notes);
};

>>>>>>> origin/main
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
