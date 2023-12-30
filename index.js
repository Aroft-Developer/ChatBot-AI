require('dotenv/config')
const { Client, IntentsBitField } = require('discord.js')
const { OpenAI } = require('openai')

const client = new Client({
    intents: [
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.Guilds
    ]

})

client.on('ready', async() => {
    console.log(`Logged in as ${client.user.tag} !`)
})

const openai = new OpenAI({
    apiKey: process.env.API_KEY,
})

client.on('messageCreate', async(message) => {

    if(message.author.bot) return
    if(message.content.startsWith('!')) return
    if(!process.env.CHANNEL.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping()
    }, 5000)

    let conversation = [];
    conversation.push({
        role: 'system',
        content: 'Chat GPT is a friendly chatbot.'
    })

    let prevMessages = await message.channel.messages.fetch({ limit: 10 })
    prevMessages.reverse()

    prevMessages.forEach((msg) => {
        if(msg.author.bot && msg.author.id !== client.user.id) return
        if(message.content.startsWith('!')) return

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')

        if(msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content
            })
            return
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content
        })

    })

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: conversation
    })

    clearInterval(sendTypingInterval)

    if(!response) {
        return message.reply("An unexpected error occurred !")
    }

    const responseMessages = response.choices[0].message.content
    const chunkSizeLimit = 2000

    for(let i = 0; i < responseMessages.length; i+= chunkSizeLimit) {
        const chunk = responseMessages.substring(i, i + chunkSizeLimit)

        await message.reply(chunk)
    }
    
})

client.login(process.env.TOKEN)