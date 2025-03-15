import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('==== TRANSCRIPT PROCESSING DEBUGGING ====');
    const { text } = await request.json();
    
    if (!text) {
      console.error('Error: No text provided');
      return NextResponse.json(
        { error: 'Text is required' }, 
        { status: 400 }
      );
    }
    
    console.log('1. Original text length:', text.length);
    
    // Process transcript with GPT-4o
    console.log('2. Sending to GPT-4o for processing');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a transcript cleanup specialist. Your task is to polish transcripts for text-to-speech systems by:
          1. Removing filler words like "um", "uh", "like", "you know", etc.
          2. Eliminating stutters and word repetitions
          3. Fixing grammar issues while maintaining the original meaning
          4. Making sentences flow naturally
          5. Preserving the content and meaning of the original transcript
          
          Return ONLY the cleaned transcript without explanations or additional text.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent output
    });
    
    const processedText = completion.choices[0].message.content?.trim() || text;
    console.log('3. Processed text length:', processedText.length);
    
    // For debugging, show a brief before/after
    if (text.length > 50) {
      console.log('4. Original (first 50 chars):', text.substring(0, 50) + '...');
      console.log('5. Processed (first 50 chars):', processedText.substring(0, 50) + '...');
    } else {
      console.log('4. Original:', text);
      console.log('5. Processed:', processedText);
    }
    
    return NextResponse.json({ 
      processedText,
      originalLength: text.length,
      processedLength: processedText.length
    });
    
  } catch (error: any) {
    console.error('Error processing transcript:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process transcript' },
      { status: 500 }
    );
  }
} 