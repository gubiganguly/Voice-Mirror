import { NextRequest, NextResponse } from 'next/server';
import { PRESET_VOICE_MODELS } from '@/contexts/VoiceSettingsContext';

export async function POST(request: NextRequest) {
  try {
    const { text, modelId } = await request.json();

    console.log('==== TTS API DEBUGGING ====');
    console.log('1. Received request with model ID:', modelId);
    
    if (!text) {
      console.error('Error: No text provided');
      return NextResponse.json(
        { error: 'Text is required' }, 
        { status: 400 }
      );
    }
    
    if (!modelId) {
      console.error('Error: No modelId provided');
      return NextResponse.json(
        { error: 'Model ID is required' }, 
        { status: 400 }
      );
    }

    console.log('2. Text to synthesize:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

    // Request TTS from Fish API
    const fishRequestBody = {
      text: text,
      reference_id: modelId,
      format: 'mp3',
      mp3_bitrate: 128
    };
    
    console.log('3. Fish API request payload:', JSON.stringify(fishRequestBody));
    
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fishRequestBody),
    });

    console.log('4. Fish API response status:', response.status);
    console.log('5. Fish API response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));
    
    if (!response.ok) {
      let errorMessage = 'Failed to generate speech';
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorMessage;
        console.error('6. Fish API error response (JSON):', JSON.stringify(errorJson));
      } catch (e) {
        const errorText = await response.text();
        console.error('6. Fish API error response (Text):', errorText);
      }
      
      return NextResponse.json(
        { error: errorMessage }, 
        { status: response.status }
      );
    }

    // Get audio data
    const audioArrayBuffer = await response.arrayBuffer();
    console.log('6. TTS audio received successfully');
    console.log('7. Audio data size:', audioArrayBuffer.byteLength, 'bytes');
    console.log('8. Content type from Fish API:', response.headers.get('content-type'));
    
    if (audioArrayBuffer.byteLength === 0) {
      console.error('ERROR: Received empty audio data from Fish API');
      return NextResponse.json(
        { error: 'Received empty audio data from TTS service' }, 
        { status: 500 }
      );
    }
    
    // Create a Buffer to check first few bytes for debugging
    const buffer = Buffer.from(audioArrayBuffer);
    console.log('9. First 20 bytes of audio data (hex):', buffer.slice(0, 20).toString('hex'));
    
    // Return the audio with explicit headers
    console.log('10. Sending audio response back to client');
    
    return new NextResponse(audioArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioArrayBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
        'Content-Disposition': 'inline; filename="tts-audio.mp3"',
        'X-Audio-Length': audioArrayBuffer.byteLength.toString()
      },
    });
    
  } catch (error) {
    console.error('CRITICAL ERROR in TTS API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 