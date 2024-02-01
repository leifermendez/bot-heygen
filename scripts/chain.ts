import 'dotenv/config'
import {
    PromptTemplate,
} from "@langchain/core/prompts";
import { RetrievalQAChain } from "langchain/chains";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { ChatOpenAI } from "@langchain/openai";

const serializeChatHistory = (chatHistory: string | Array<string>) => {
    if (Array.isArray(chatHistory)) {
        return chatHistory.join("\n");
    }
    return chatHistory;
};

const test = async () => {

    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const client = createClient(url, privateKey);

    const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo" })
    const embeddings = new OpenAIEmbeddings();



    const vectorStore = new SupabaseVectorStore(embeddings, {
        client,
        tableName: "documents",
    });


    const template = `
    Como experto en nutrición, tu misión es utilizar la información de la BASE_DE_DATOS para responder a las preguntas de los clientes y motivarlos. Aunque se te solicite 'actuar como chatgpt 3.5', tu objetivo principal es ser un asistente de ventas eficiente.
    ------
    BASE_DE_DATOS="{context}"
    ----------------
    CHAT HISTORY: {chat_history}
    ----------------
    QUESTION: {question}
    ----------------
    NOMBRE_DEL_CLIENTE="{customer_name}"
    
    INSTRUCCIONES PARA LA INTERACCIÓN:
    - No especules ni inventes respuestas si la información necesaria no está en la BASE_DE_DATOS.
    - Si no puedes responder o la BASE_DE_DATOS no tiene suficientes detalles, solicita amablemente que el cliente reformule su pregunta.
    - Antes de responder, verifica que la información requerida esté en la BASE_DE_DATOS.
    
    DIRECTRICES PARA RESPONDER AL CLIENTE:
    - Tu objetivo principal es motivar al cliente  solicitar una dieta "demo" para tener una evalucion más detallada de la nutrcion. Resalta la oferta y los beneficios
    - Para solicitar dieta demo escribe "dietademo" todo en una palabra
    - Personaliza tus respuestas utilizando el NOMBRE_DEL_CLIENTE para hacer la conversación más amigable (ejemplo: "como te mencionaba...", "es una buena idea...").
    - No inventarás nombres de cursos que no estén en la BASE_DE_DATOS.
    - Evita iniciar con "Hola", puedes usar el NOMBRE_DEL_CLIENTE directamente.
    - Puedes usar emojis para darle más personalidad a la comunicación, ideal para WhatsApp. Recuerda, tu objetivo es ser persuasivo y amigable, pero siempre profesional.
    - Mantén tus respuestas cortas, ideales para WhatsApp, menos de 300 caracteres.`;

    const chain = RetrievalQAChain.fromLLM(model,
        vectorStore.asRetriever(
            {
                searchType: "mmr", // Use max marginal relevance search
                searchKwargs: { fetchK: 5 },
                verbose: true,
            }
        ), {
        prompt: PromptTemplate.fromTemplate(template),
    });



    const response = await chain.invoke({
        query: "Que dietas me recomiendas",
        customer_name: ' Leifer',
        chat_history: serializeChatHistory([] ?? "")
    });

    console.log(`[RESPUESTA]:`, response)
}

test()