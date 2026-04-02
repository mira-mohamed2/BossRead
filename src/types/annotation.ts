import { AnnotationType } from './content';
import { ContentPosition } from './position';

export interface Annotation {
  id: string;
  contentId: string;
  type: AnnotationType;
  textSelection: string | null;
  note: string | null;
  color: string;
  positionData: ContentPosition;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  userId: string;
}

export interface ReadingProgress {
  id: string;
  contentId: string;
  positionData: ContentPosition;
  percentage: number;
  totalReadSeconds: number;
  lastReadAt: string;
  updatedAt: string;
  userId: string;
}
