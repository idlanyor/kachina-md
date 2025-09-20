import axios from 'axios'

const getPpUrl = async (sock, id) => {
    const ppUrl = `${globalThis.ppUrl}`
    try {
        return await sock.profilePictureUrl(id, "image")
    } catch {
        return ppUrl
    }
}

export async function Welcome(sock, sender, namaGrup, pushName) {
    try {
        const avatar = await getPpUrl(sock, sender)
        const encodedAvatar = encodeURIComponent(avatar)
        const encodedGroup = encodeURIComponent(namaGrup)
        const encodedUsername = encodeURIComponent(pushName)
        const encodedBg = encodeURIComponent('https://telegra.ph/file/cad7038fe82e47f79c609.jpg')
        
        const apiUrl = `https://api.ryzumi.vip/api/image/welcome?username=${encodedUsername}&group=${encodedGroup}&avatar=${encodedAvatar}&bg=${encodedBg}&member=1`
        
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'image/gif',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            responseType: 'arraybuffer'
        })
        
        return Buffer.from(response.data)
    } catch (error) {
        console.error('Error generating welcome image:', error)
        throw error
    }
}

export async function Leave(sock, sender, namaGrup, pushName) {
    try {
        const avatar = await getPpUrl(sock, sender)
        const encodedAvatar = encodeURIComponent(avatar)
        const encodedGroup = encodeURIComponent(namaGrup)
        const encodedUsername = encodeURIComponent(pushName)
        const encodedBg = encodeURIComponent('https://telegra.ph/file/0db212539fe8a014017e3.jpg')
        
        // Now using the dedicated leave endpoint
        const apiUrl = `https://api.ryzumi.vip/api/image/leave?username=${encodedUsername}&group=${encodedGroup}&avatar=${encodedAvatar}&bg=${encodedBg}&member=1`
        
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'image/gif',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            responseType: 'arraybuffer'
        })
        
        return Buffer.from(response.data)
    } catch (error) {
        console.error('Error generating leave image:', error)
        throw error
    }
}