import { FIRESTORE_DB } from '../config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  doc, 
  getDoc, 
  where, 
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { Survey, SurveyFormData, surveyConverter } from './surveySchema';

// Collection reference
const surveysCollection = collection(FIRESTORE_DB, 'surveys').withConverter(surveyConverter);

/**
 * Add a new survey to Firestore
 */
export async function addSurvey(surveyData: SurveyFormData, recordingTimes: number[] = []): Promise<string> {
  try {
    const survey: Survey = {
      ...surveyData,
      createdAt: serverTimestamp() as Timestamp,
      recordingTimes: recordingTimes.slice(0, 5), // Ensure we only store up to 5 recording times
    };

    const docRef = await addDoc(surveysCollection, survey);
    return docRef.id;
  } catch (error) {
    console.error('Error adding survey:', error);
    throw new Error('Failed to submit survey');
  }
}

/**
 * Get all surveys, ordered by creation date
 */
export async function getSurveys(limitCount: number = 100): Promise<Survey[]> {
  try {
    const q = query(
      surveysCollection,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting surveys:', error);
    throw new Error('Failed to retrieve surveys');
  }
}

/**
 * Get survey by ID
 */
export async function getSurveyById(id: string): Promise<Survey | null> {
  try {
    const docRef = doc(FIRESTORE_DB, 'surveys', id).withConverter(surveyConverter);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting survey by ID:', error);
    throw new Error('Failed to retrieve survey');
  }
}

/**
 * Get average rating from all surveys
 */
export async function getAverageRating(): Promise<number> {
  try {
    const surveys = await getSurveys();
    
    if (surveys.length === 0) {
      return 0;
    }
    
    const sum = surveys.reduce((acc, survey) => acc + survey.rating, 0);
    return sum / surveys.length;
  } catch (error) {
    console.error('Error calculating average rating:', error);
    throw new Error('Failed to calculate average rating');
  }
}

/**
 * Get survey counts by rating
 */
export async function getSurveysByRating(): Promise<Record<number, number>> {
  try {
    const surveys = await getSurveys();
    const ratings: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    surveys.forEach(survey => {
      if (survey.rating >= 1 && survey.rating <= 5) {
        ratings[survey.rating]++;
      }
    });
    
    return ratings;
  } catch (error) {
    console.error('Error getting surveys by rating:', error);
    throw new Error('Failed to get surveys by rating');
  }
}

/**
 * Delete a survey by ID
 */
export async function deleteSurvey(id: string): Promise<void> {
  try {
    const docRef = doc(FIRESTORE_DB, 'surveys', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw new Error('Failed to delete survey');
  }
}
