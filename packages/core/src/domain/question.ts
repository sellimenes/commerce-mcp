export type QuestionStatus = 'WAITING_FOR_ANSWER' | 'ANSWERED' | 'REJECTED';

export interface CustomerQuestion {
  id: number;
  productMainId: string;
  productName?: string;
  customerName: string;
  text: string;
  answer?: string;
  status: QuestionStatus;
  createdAt: Date;
  answeredAt?: Date;
}

export interface QuestionsFilter {
  status?: QuestionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  size?: number;
}

export interface QuestionReplyInput {
  questionId: number;
  text: string;
}
