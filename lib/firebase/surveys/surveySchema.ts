import { Timestamp } from 'firebase/firestore';

export interface Survey {
  id?: string;
  createdAt: Date | number | Timestamp;
  rating: number;  // 1-5 star rating
  positiveFeedback: string; // What they like most
  improvementFeedback: string; // How we can improve
  recordingTimes: number[]; // List of recording durations in seconds (will store up to 5 entries)
}

export interface SurveyFormData {
  rating: number;
  positiveFeedback: string;
  improvementFeedback: string;
}

// Firestore data converter to maintain proper types
export const surveyConverter = {
  toFirestore: (survey: Survey) => {
    return {
      createdAt: survey.createdAt,
      rating: survey.rating,
      positiveFeedback: survey.positiveFeedback,
      improvementFeedback: survey.improvementFeedback,
      recordingTimes: survey.recordingTimes,
    };
  },
  fromFirestore: (snapshot: any, options: any): Survey => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      createdAt: data.createdAt?.toDate() || data.createdAt,
      rating: data.rating,
      positiveFeedback: data.positiveFeedback,
      improvementFeedback: data.improvementFeedback,
      recordingTimes: data.recordingTimes || [],
    };
  }
};
