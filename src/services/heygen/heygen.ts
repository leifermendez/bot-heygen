const HEYGEN_API = process.env.HEYGEN_API
/**
 * 
 * @param urlAudio 
 * @returns 
 */
export const videoGenerate = async (urlAudio: string): Promise<{ data: any, status: boolean }> => {
    const URL = "https://api.heygen.com/v2/video/generate";

    const requestBody = {
        video_inputs: [
            {
                character: {
                    type: "avatar",
                    avatar_id: "6ea5b6679d634bd9ae0794bcbdc5bf2e",
                    avatar_style: "normal",
                },
                // voice: {
                //     speed: 1.2,
                //     type: "text",
                //     input_text: `${text}`,
                //     voice_id: "0a18686b78284ae58fa5967a163757cf",
                // },
                "voice": {
                    "type": "audio",
                    "audio_url": urlAudio
                }
            },
        ],
        test: false,
        aspect_ratio: "9:16",
    };

    const requestOptions = {
        method: "POST",
        headers: {
            "X-Api-Key": HEYGEN_API,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    };

    const response = await fetch(URL, requestOptions);

    const data = await response.json()

    const status = response.status === 200

    return {
        status,
        data
    };
};

