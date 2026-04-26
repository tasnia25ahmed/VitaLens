import dotenv from 'dotenv';
dotenv.config();

export async function textToSpeech(text) {
  const VOICE_ID = 'wewocdDkjSLm9ZwjO7TD'; // Rachel
  const API_KEY = process.env.ELEVENLABS_API_KEY;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // Good balance of speed/quality
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs Error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert to Base64 to store in Snowflake easily
    return buffer.toString('base64');
  } catch (error) {
    console.error('TTS Failed:', error);
    return null;
  }
}