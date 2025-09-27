export const handler = {
    command: ['get'],
    category:'tools',
    help: 'Mengambil data dari URL',
    exec: async ({ sock, m, args }) => {
      try {
        if (!args) {
          await m.reply('❌ Masukkan URL yang valid\n*Contoh:* !get https://api.example.com/data');
          return;
        }
  
        const url = args;
  
        await sock.sendMessage(m.chat, {
          react: { text: '⏳', key: m.key }
        });
  
        const response = await fetch(url);
        const contentType = response.headers.get('content-type') || '';
        const contentDisposition = response.headers.get('content-disposition');
        
        let fileName = 'file';
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
  
        if (contentType.includes('application/json')) {
          const jsonData = await response.json();
          await m.reply({
            text: `🛜 *GET Request*\n\n📃 *Response JSON:*\n${JSON.stringify(jsonData, null, 2)}`,
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
            caption: '☑️ Response 200 OK ☑️',
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
            caption: '☑️ Response 200 OK ☑️',
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
            caption: `🛜 *GET Request - Document*\n📃 *Type:* ${mimetype}\n📁 *File:* ${fileName}`,
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
          const data = await response.text();
          await m.reply({
            text: `🛜 *GET Request*\n\n📃 *Response:*\n${data}`,
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
  
        await sock.sendMessage(m.chat, {
          react: { text: '✅', key: m.key }
        });
      } catch (error) {
        console.error('Error in get:', error);
        await m.reply('❌ Gagal melakukan request GET');
        await sock.sendMessage(m.chat, {
          react: { text: '❌', key: m.key }
        });
      }
    }
  };
  