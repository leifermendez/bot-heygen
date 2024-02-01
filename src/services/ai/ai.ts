import {
    ChatPromptTemplate,
    PromptTemplate,
} from "@langchain/core/prompts";
import { RetrievalQAChain, APIChain } from "langchain/chains";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const serializeChatHistory = (chatHistory: string | Array<string>) => {
    if (Array.isArray(chatHistory)) {
        return chatHistory.join("\n");
    }
    return chatHistory;
};


/**
 * 
 * @param history 
 * @returns 
 */
export const toDetermineGoal = async (history: string[]): Promise<any> => {
    const outputParser = new StringOutputParser();
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 })

    const template = `
Historial de Conversación: --------------------------------
{history}
Tu tarea es determinar en el historial de conversacion cual es el objetivo del paciente:
    `;


    const prompt = ChatPromptTemplate.fromMessages([
        ["system", template],
    ]);

    const chain = prompt.pipe(model).pipe(outputParser);

    const response = await chain.invoke({
        history: history.map((i) => i).join('\n')
    });

    console.log(template)

    return response
}

/**
 * 
 * @param inputQuestion 
 * @param customerName 
 * @returns 
 */
export const toAsk = async (inputQuestion: string, customerName: string, history: string[]): Promise<string> => {

    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const client = createClient(url, privateKey);

    const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 })
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
    - Tu objetivo principal es persuadir al cliente a solicitar una dieta personalizada escribiendo "dietademo". Resalta la oferta y los beneficios
    - Para solicitar dieta demo escribe "dietademo" todo en una palabra
    - Personaliza tus respuestas utilizando el NOMBRE_DEL_CLIENTE para hacer la conversación más amigable (ejemplo: "como te mencionaba...", "es una buena idea...").
    - No inventarás nombres de cursos que no estén en la BASE_DE_DATOS.
    - Puedes usar emojis para darle más personalidad a la comunicación, ideal para WhatsApp. Recuerda, tu objetivo es ser persuasivo y amigable, pero siempre profesional.
    - Mantén tus respuestas cortas, ideales para WhatsApp, menos de 300 caracteres.`;

    const chain = RetrievalQAChain.fromLLM(model,
        vectorStore.asRetriever(
            {
                searchType: "mmr", // Use max marginal relevance search
                searchKwargs: { fetchK: 8 },
                verbose: true,
            }
        ), {
        prompt: PromptTemplate.fromTemplate(template),
    });



    const response = await chain.invoke({
        query: inputQuestion,
        customer_name: customerName,
        chat_history: serializeChatHistory(history ?? "")
    });

    return response.text
}

/**
 * the goal is generate script to ai (heygen)
 * @param inputQuestion 
 * @param customerName 
 * @returns 
 */
export const toAskGenerateVideo = async (inputQuestion: string, customerName: string, history: string[]): Promise<any> => {
    const outputParser = new StringOutputParser();
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 })

    const template = `

    Historial de Conversación: --------------------------------
    {history}
    
    Ejemplo (1) de script de narracion que debes utilizar:
    ------------------------
    Claro, {customerName}, en cuanto a tu dieta, nos centraremos en optimizar tu "[NECESIDAD_O_OBJETIVO_DEL_PACIENTE]". Para ello, vamos a enfocarnos en una dieta que se adapte a tus necesidades específicas.
    Comenzaremos incorporando alimentos ricos en nutrientes y bajos en calorías para ayudarte a perder peso de manera saludable. Una opción que podemos considerar es incluir una variedad de vegetales de hojas verdes, como espinacas, kale y lechuga, que son excelentes fuentes de vitaminas y minerales, así como fibra dietética, que te ayudará a sentirte lleno por más tiempo y a mantener niveles estables de azúcar en la sangre.
    Recuerda que esta es solo una guía inicial, si te unes a nuestro reto de 21 días obtendras recomendaciones personalizadas.   
    
    ------------------------
    Ejemplo (2) de script de narracion que debes utilizar:
    Porsupuesto {customerName}, entiendo que tu objetivo es, nos centraremos en alcanzar tu "[NECESIDAD_O_OBJETIVO_DEL_PACIENTE]". Por eso, nos centraremos en un regimen de ejercicio y dieta que se adapte a tus necesidades específicas.
    Recuerda que esta es solo una guía inicial, si te unes a nuestro reto de 21 días obtendras recomendaciones personalizadas.   

    ---------------------------------
    DIRECTRICES PARA RESPONDER:
    - nombre_paciente=Leifer
    - NECESIDAD_O_OBJETIVO_DEL_PACIENTE={goal}
    - debes mencionar algunas palabras tecnicas como: macronutriente, fibras, hidratos, numero de calorias, proteinas, minerales, ganancia muscular, magra
    - El nuevo guion no debe tener mas de 2 parrafos, ideal para enviar en una nota de voz de 1 minuto maximo
    - Siempre finalizar con un call to action ¿Estas listo para unirte al reto de los 21 días?
    - Nuevo script de narración debe iniciar así
    
    Claro, Leifer, en cuanto a tu dieta, nos centraremos en optimizar tu nutrición para alcanzar tus objetivos de salud. Para ello
    `;


    const prompt = ChatPromptTemplate.fromMessages([
        ["system", template],
        ["user", "{input}"],
    ]);

    const chain = prompt.pipe(model).pipe(outputParser);

    const response = await chain.invoke({
        input: inputQuestion,
        goal: await toDetermineGoal(history),
        customerName: customerName,
        history: history.map((i) => i).join('\n')
    });

    console.log(template)

    return response
}
