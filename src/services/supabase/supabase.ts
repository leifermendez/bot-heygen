import { promises } from 'fs'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'

/**
 * 
 * @returns 
 */
export const getClientSupabase = (): SupabaseClient => {
    const url = process.env.SUPABASE_URL;
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    return createClient(url, privateKey)
}

/**
 * 
 * @param audioFile 
 * @returns 
 */
export const saveToMedia = async (audioPath: string) => {
    const audioFile = await promises.readFile(audioPath)
    const fileName = `${Date.now()}.mp3`
    const supabase = getClientSupabase()
    const { data, error } = await supabase
        .storage
        .from('media')
        .upload(`${fileName}`, audioFile, {
            cacheControl: '3600',
            upsert: false
        })

    console.log(`[ERROR]:`, error)
    return data
}

/**
 * 
 * @param path 
 * @returns 
 */
export const getFullUrl = (path: string) => {
    const url = process.env.SUPABASE_URL;
    return `${url}/storage/v1/object/public/media/${path}`
}