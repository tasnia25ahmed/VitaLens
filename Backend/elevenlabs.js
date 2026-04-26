import { ElevenLabsClient } from "elevenlabs";
import dotenv from 'dotenv';

dotenv.config();

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function textToSpeech(text) {
  try {
    const audioStream = await elevenlabs.textToSpeech.convert(
      'wewocdDkjSLm9ZwjO7TD', // Rachel voice
      {
        text: text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
      }
    );

    // Convert stream to buffer, then base64 for frontend playback
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    return buffer.toString('base64');
  } catch (error) {
    console.error('TTS Failed:', error);
    return null;
  }
}
