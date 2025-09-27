export const handler = {
    command: ['post'],
    category:'tools',
    help: 'Melakukan POST request ke URL',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args[0] || !args[1]) {
                await m.reply('❌ Format salah\n*Contoh:* !post https://api.example.com/data {"key":"value"}');
                return;
            }

            const url = args[0];
            const data = args.slice(1).join(' ');
            
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch {
                await m.reply('❌ Data harus dalam format JSON yang valid');
                return;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonData)
            });

            // Check response status
            if (!response.ok) {
                await m.reply(`❌ Request gagal dengan status ${response.status}: ${response.statusText}`);
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                });
                return;
            }

            const contentType = response.headers.get('content-type') || '';
            const contentDisposition = response.headers.get('content-disposition');
            
            // Extract filename from content-disposition header or URL
            let fileName = 'response_file';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch) {
                    fileName = filenameMatch[1].replace(/['"]/g, '');
                }
            } else {
                const urlFileName = url.split('/').pop();
                if (urlFileName && urlFileName.includes('.')) {
                    fileName = urlFileName;
                }
            }

            // Handle different response types
            if (contentType.includes('application/json')) {
                const responseData = await response.json();
                await m.reply({
                    text: `🌐 *POST Request*\n\n📤 *Data:*\n${JSON.stringify(jsonData, null, 2)}\n\n📥 *Response JSON:*\n${JSON.stringify(responseData, null, 2)}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 API Request 乂',
                            body: url,
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });
            } else if (contentType.includes('image')) {
                const buffer = await response.arrayBuffer();
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(buffer),
                    caption: `🌐 *POST Request - Image Response*\n\n📤 *Data:*\n${JSON.stringify(jsonData, null, 2)}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 API Request 乂',
                            body: url,
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });
            } else if (contentType.includes('video')) {
                const buffer = await response.arrayBuffer();
                await sock.sendMessage(m.chat, {
                    video: Buffer.from(buffer),
                    caption: `🌐 *POST Request - Video Response*\n\n📤 *Data:*\n${JSON.stringify(jsonData, null, 2)}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 API Request 乂',
                            body: url,
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });
            } else if (contentType.includes('audio')) {
                const buffer = await response.arrayBuffer();
                await sock.sendMessage(m.chat, {
                    audio: Buffer.from(buffer),
                    mimetype: 'audio/mp4',
                    fileName: `${fileName}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 API Request 乂',
                            body: url,
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });
            } else if (contentType.includes('application') || contentType.includes('text/csv') || contentType.includes('octet-stream')) {
                const buffer = await response.arrayBuffer();
                
                // Determine appropriate mimetype for octet-stream based on file extension
                let mimetype = contentType;
                if (contentType.includes('octet-stream')) {
                    const ext = fileName.split('.').pop()?.toLowerCase();
                    switch (ext) {
                        case 'pdf':
                            mimetype = 'application/pdf';
                            break;
                        case 'zip':
                            mimetype = 'application/zip';
                            break;
                        case 'rar':
                            mimetype = 'application/x-rar-compressed';
                            break;
                        case 'exe':
                            mimetype = 'application/x-msdownload';
                            break;
                        case 'apk':
                            mimetype = 'application/vnd.android.package-archive';
                            break;
                        default:
                            mimetype = 'application/octet-stream';
                    }
                }
                
                await sock.sendMessage(m.chat, {
                    document: Buffer.from(buffer),
                    mimetype: mimetype,
                    fileName: fileName,
                    caption: `🌐 *POST Request - Document Response*\n📃 *Type:* ${mimetype}\n📁 *File:* ${fileName}\n\n📤 *Data:*\n${JSON.stringify(jsonData, null, 2)}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 API Request 乂',
                            body: url,
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });
            } else {
                // Handle text responses (fallback)
                const responseData = await response.text();
                
                try {
                    // Try to parse as JSON first
                    const jsonResponse = JSON.parse(responseData);
                    await m.reply({
                        text: `🌐 *POST Request*\n\n📤 *Data:*\n${JSON.stringify(jsonData, null, 2)}\n\n📥 *Response JSON:*\n${JSON.stringify(jsonResponse, null, 2)}`,
                        contextInfo: {
                            externalAdReply: {
                                title: '乂 API Request 乂',
                                body: url,
                                thumbnailUrl: `${globalThis.ppUrl}`,
                                sourceUrl: url,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    });
                } catch {
                    // If not JSON, send as text
                    await m.reply({
                        text: `🌐 *POST Request*\n\n📤 *Data:*\n${JSON.stringify(jsonData, null, 2)}\n\n📥 *Response:*\n${responseData}`,
                        contextInfo: {
                            externalAdReply: {
                                title: '乂 API Request 乂',
                                body: url,
                                thumbnailUrl: `${globalThis.ppUrl}`,
                                sourceUrl: url,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    });
                }
            }

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in post:', error);
            await m.reply('❌ Gagal melakukan request POST');
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
}