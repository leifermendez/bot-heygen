import 'dotenv/config'
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { type Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { join } from 'path'

const REPO_PATH = join(process.cwd(), 'data')

/**
 * Esto lee los archivos .txt y los divide los deja listo para cargar
 * @returns 
 */
export const loadDataFromPath = async () => {
    const loader = new DirectoryLoader(REPO_PATH, {
        ".txt": (path) => new TextLoader(path),
    });
    const docs = await loader.load();

    const javascriptSplitter = RecursiveCharacterTextSplitter.fromLanguage("js", {
        chunkSize: 2000,
        chunkOverlap: 200,
    });
    const texts = await javascriptSplitter.splitDocuments(docs);
    console.log("Loaded ", texts.length, " documents.");
    return docs
}

/**
 * Cargar documentos a supabase
 * @param texts 
 */
export const loadDataToSupabase = async (texts: Document[]) => {
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const client = createClient(url, privateKey);

    const vectorStore = await SupabaseVectorStore.fromDocuments(
        texts,
        new OpenAIEmbeddings(),
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        }
    );

    console.log(`Datos ingestados en supabase`)

    return vectorStore
}


(async () => {
    try {
        const docs = await loadDataFromPath()
        await loadDataToSupabase(docs)
    } catch (err) {
        console.log(`[ERROR]:`, err)
    }

})()