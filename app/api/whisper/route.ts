import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert the File to a Buffer that OpenAI's API can accept
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Create a proper File object instead of a Blob
    const audioFileForOpenAI = new File(
      [audioBuffer], 
      audioFile.name || 'audio.webm', 
      { type: audioFile.type || 'audio/webm' }
    );

    // Call OpenAI's API to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForOpenAI,
      model: 'whisper-1',
    });

    // Return the transcription
    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
} 