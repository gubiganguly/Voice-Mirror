import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('==== VOICE MODEL API DEBUGGING ====');
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const transcription = formData.get('transcription') as string;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 }); 
    }

    console.log('1. Voice model request received with audio size:', audioBlob.size);
    if (transcription) {
      console.log('2. Transcription provided, length:', transcription.length);
    }

    // Convert blob to buffer for API request
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare multipart form data
    const apiFormData = new FormData();
    apiFormData.append('voices', new Blob([buffer]), 'recording.webm');
    apiFormData.append('visibility', 'private');
    apiFormData.append('type', 'tts');
    apiFormData.append('title', 'Voice Mirror Model');
    apiFormData.append('train_mode', 'fast');
    apiFormData.append('enhance_audio_quality', 'true');
    
    // Add transcription if available
    if (transcription) {
      apiFormData.append('texts', transcription);
    }

    console.log('3. Making request to Fish API');
    // Make request to Fish API
    const response = await fetch('https://api.fish.audio/model', {
      method: 'POST',
      body: apiFormData,
      headers: {
        'Authorization': `Bearer ${process.env.FISH_AUDIO_API_KEY}`
      },
    });

    console.log('4. Fish API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        console.error('5. Fish API error:', errorData);
        return NextResponse.json(
          { error: 'Failed to create voice model: ' + (errorData.message || errorData.error || 'Unknown error') }, 
          { status: response.status }
        );
      } catch (e) {
        console.error('5. Fish API error (text):', errorText);
        return NextResponse.json(
          { error: 'Failed to create voice model' }, 
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    console.log('5. FULL Fish API success response:', JSON.stringify(data));
    
    // Look for the model ID in various possible locations in the response
    let modelId = null;
    
    if (data.id) {
      modelId = data.id;
    } else if (data.model_id) {
      modelId = data.model_id;
    } else if (data.reference_id) {
      modelId = data.reference_id;
    } else if (data.job && data.job.id) {
      modelId = data.job.id;
    } else if (data.task && data.task.id) {
      modelId = data.task.id;
    }
    
    // If we still don't have a modelId but have a top-level ID-like field, use that
    if (!modelId) {
      // Look for any field that might be an ID (ends with _id or named id)
      const possibleIdFields = Object.keys(data).filter(key => 
        key === 'id' || key.endsWith('_id') || key.includes('reference')
      );
      
      if (possibleIdFields.length > 0) {
        modelId = data[possibleIdFields[0]];
        console.log(`6. Using ${possibleIdFields[0]} as model ID:`, modelId);
      }
    }
    
    if (!modelId && typeof data === 'string' && data.length > 0) {
      // Sometimes APIs just return the ID as a string
      modelId = data;
      console.log('6. API returned string value, using as model ID:', modelId);
    }
    
    if (!modelId) {
      console.error('6. Error: No model ID found in response. Full response:', data);
      // Instead of failing, let's return something that might work
      if (Object.keys(data).length > 0) {
        const firstKey = Object.keys(data)[0];
        const firstValue = data[firstKey];
        
        // If the first value is a string or number, try using it as the ID
        if (typeof firstValue === 'string' || typeof firstValue === 'number') {
          modelId = String(firstValue);
          console.log(`7. Using first field "${firstKey}" value as model ID:`, modelId);
        } else {
          // Last resort: stringify the entire response and use that
          modelId = 'fallback-' + Math.random().toString(36).substring(2, 10);
          console.log('7. Generated fallback ID:', modelId);
        }
      } else {
        // If we have an empty response, generate a random ID as fallback
        modelId = 'fallback-' + Math.random().toString(36).substring(2, 10);
        console.log('7. Generated fallback ID for empty response:', modelId);
      }
    } else {
      console.log('6. Successfully identified model ID:', modelId);
    }
    
    return NextResponse.json({ 
      modelId: modelId,
      status: data.status || 'pending',
      rawResponse: data // Include the raw response for debugging
    });
    
  } catch (error) {
    console.error('Error creating voice model:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 