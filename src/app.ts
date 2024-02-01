import 'dotenv/config'
import { addKeyword, createBot, createFlow, createProvider, EVENTS, MemoryDB, utils } from '@bot-whatsapp/bot'
import { BaileysProvider, handleCtx } from '@bot-whatsapp/provider-baileys'
import { toAsk, toAskGenerateVideo } from './services/ai/ai'
import { generateTimer } from './utils/timer'
import { CallbackFunction } from '@bot-whatsapp/bot/dist/types'
import { videoGenerate } from './services/heygen/heygen'
import { getClientSupabase, getFullUrl, saveToMedia } from './services/supabase/supabase'
import { textToVoice } from './services/elevenlabs/elevenlabs'

export type History = { role: 'user' | 'assistant', content: string }

const supabase = getClientSupabase()

const layerHistory: CallbackFunction<any, any> = async ({ body }, { state }) => {
    const history = (state.get('history') ?? []) as History[]
    history.push({
        role: 'user',
        content: body
    })
    await state.update({ history })
}


const flowWelcome = addKeyword<BaileysProvider, MemoryDB>(EVENTS.WELCOME)
    .addAction(layerHistory)
    .addAction(async (ctx, { flowDynamic, state }) => {
        const history = (state.get('history') ?? []) as History[]

        const parse = history.map((h) => `${h.role === 'assistant' ? 'Nutricionista' : 'Paciente'}: "${h.content}"`)
        const textLarge = await toAsk(ctx.body, ctx.name, parse)
        const chunks = textLarge.split(/(?<!\d)\.\s+/g);
        for (const chunk of chunks) {
            await flowDynamic([{ body: chunk.trim(), delay: generateTimer(500, 850) }]);
        }

        history.push({
            role: 'assistant',
            content: textLarge
        })

        await state.update({ history })
    })


const flowDietaDemo = addKeyword<BaileysProvider, MemoryDB>('dietademo', { sensitive: true })
    .addAnswer(`¿Cual es tu nombre?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body.trim() })
    })
    .addAnswer(`Perfecto! en unos minutos estare de vuelta ... ⏲️ vo ya grabar algo para ti, vuelvo en unos minutos 🫡`)
    .addAction(async (ctx, { state }) => {
        const singleName = state.get('name').split(' ').shift()
        const history = (state.get('history') ?? []) as History[]

        const parse = history.map((h) => `${h.role === 'assistant' ? 'Nutricionista' : 'Paciente'}: "${h.content}"`)

        //** step 1 (generar el guion que voy a llevar a audio) */

        const scriptToVoice = await toAskGenerateVideo('me puedes generar una dieta basada en la conversacion', singleName, parse)

        //** step2  text to audio */
        const audio = await textToVoice(scriptToVoice)

        //** step 3 guardar audio mp3 local enviarlo a supabase enviar a la nube porque necesito una url*/
        const saveAudio = await saveToMedia(audio.path)
        const urlAudio = getFullUrl(saveAudio.path)

        //** step 4 agarrar el audio que esta en supabase y se lo envio a heygen para generar un video con ese guion */
        const videoGenarated = await videoGenerate(urlAudio)
        const saveRecord = await supabase.from('queue').insert({ phone: ctx.from, payload: videoGenarated.data.data.video_id }).select()
        console.log(`🟠🟠🟠 `, saveRecord)
    })


const main = async () => {
    const provider = createProvider(BaileysProvider)
    provider.initHttpServer(3002)

    provider.http.server.post('/webhook', handleCtx(async (bot, req, res) => {
        const body = req.body
        if (body?.event_type === 'avatar_video.success') {
            const url = body?.event_data?.url
            const { data } = await supabase.from('queue').select('*').eq('payload', body?.event_data?.video_id).order('created_at', { ascending: false }).maybeSingle()
            console.log(`Enviando video a usuario....`)
            await bot.sendMessage(data.phone, 'perfecto enviando...se esta cargando.', { media: null, buttons: [] })
            await bot.sendMessage(data.phone, 'aqui tienes', { media: url, buttons: [] })
            console.log(`Mensaje enviado`)
        }
        return res.end(`Enviado`)
    }))

    provider.http.server.post('/demo', handleCtx(async (bot, req, res) => {
        const body = req.body
        const { data, error } = await supabase.from('queue').select('*').eq('payload', body.payload).eq('phone', body.phone).order('created_at', { ascending: false }).maybeSingle()
        await bot.sendMessage(body.phone, 'aqui tienes', { media: data.url, buttons: [] })
        console.log({ data, error })
        return res.end(JSON.stringify(data))
    }))


    await createBot({
        database: new MemoryDB(),
        provider,
        flow: createFlow([flowWelcome, flowDietaDemo])
    })
}

main()