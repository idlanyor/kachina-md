import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const handler = {
    command: ['speedtest', 'speed'],
    help: 'Test kecepatan internet server',
    category: 'tools',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m }) => {
        try {
            await m.reply('*Sedang mengukur kecepatan internet...*\n\nMohon tunggu sebentar, proses ini membutuhkan waktu sekitar 30-60 detik.')

            const { stdout } = await execAsync('curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 - --simple')

            const lines = stdout.trim().split('\n')
            if (lines.length >= 3) {
                const ping = lines[0].replace('Ping: ', '').replace(' ms', '')
                const download = lines[1].replace('Download: ', '').replace(' Mbit/s', '')
                const upload = lines[2].replace('Upload: ', '').replace(' Mbit/s', '')

                const resultMsg = `*Hasil Speedtest*\n\n` +
                    `*Download:* ${download} Mbps\n` +
                    `*Upload:* ${upload} Mbps\n` +
                    `*Ping:* ${ping} ms\n\n`

                await m.reply(resultMsg)
            } else {
                throw new Error('Invalid speedtest output')
            }

        } catch (error) {
            console.error('Speedtest error:', error)

            try {
                await m.reply('*Mencoba metode alternatif...*')

                const response = await fetch('https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm&urlCount=1')
                const data = await response.json()

                if (data && data[0] && data[0].url) {
                    const testUrl = data[0].url
                    const startTime = Date.now()

                    const testResponse = await fetch(testUrl)
                    const buffer = await testResponse.arrayBuffer()
                    const endTime = Date.now()

                    const duration = (endTime - startTime) / 1000 // seconds
                    const bytes = buffer.byteLength
                    const mbps = ((bytes * 8) / (duration * 1000000)).toFixed(2)

                    const resultMsg = `*Hasil Speedtest (Alternatif)*\n\n` +
                        `*Download:* ${mbps} Mbps\n` +
                        `*Waktu Test:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                        `*Catatan:* Test menggunakan Fast.com API`;
                    await m.reply(resultMsg)
                } else {
                    throw new Error('Fast.com API failed')
                }

            } catch (fallbackError) {
                console.error('Fallback speedtest error:', fallbackError)
            }
        }
    }
}

export default handler