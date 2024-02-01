import fs from 'fs';
import { join } from 'path';

const VOICE_ID = process.env.VOICE_ID ?? ""

/**
 * 
 * @param text 
 * @param name 
 * @param voiceId 
 * @returns 
 */
const textToVoice = async (text: string) => {
    const ELEVENLAB_ID = process.env.ELEVENLAB_ID ?? "";
    const URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

    const header = new Headers();
    header.append("accept", "audio/mpeg");
    header.append("xi-api-key", ELEVENLAB_ID);
    header.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "model_id": "eleven_multilingual_v2",
        "text": text,
        "voice_settings": {
            "similarity_boost": 0.3,
            "stability": 0.64,
            "style": 0.08,
            "use_speaker_boost": true
        }
    });

    const requestOptions = {
        method: "POST",
        headers: header,
        body: raw,
    };

    const response = await fetch(URL, requestOptions);

    console.log(response.status)


    const status = response.status === 200

    const buffer = await response.arrayBuffer();

    const pathFile = join(process.cwd(), 'tmp', `${Date.now()}-audio.mp3`);
    fs.writeFileSync(pathFile, Buffer.from(buffer));
    console.log("Archivo de audio guardado en:", pathFile);
    return {
        status,
        text,
        path: pathFile
    };
};

export { textToVoice }