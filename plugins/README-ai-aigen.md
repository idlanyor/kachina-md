# AI Chat Gemini Flash Plugin (.aigen)

## Deskripsi
Plugin ini memungkinkan pengguna untuk berbicara dengan AI menggunakan Gemini Flash API dengan kemampuan grounding untuk memberikan informasi yang akurat dan terkini.

## Cara Penggunaan
1. Kirim pesan/pertanyaan dengan caption `.aigen <pesan>`
2. Reply pesan dengan `.aigen`

## Contoh Penggunaan
- `.aigen berita hangat hari ini`
- `.aigen ceritakan tentang sejarah Indonesia`
- `.aigen buatkan puisi tentang alam`
- `.aigen jelaskan tentang teknologi AI`
- `.aigen cuaca hari ini`

## Fitur
- Chat dengan AI menggunakan Gemini Flash
- Akses informasi terkini (real-time)
- Grounding dengan sumber terpercaya
- Jawaban dalam bahasa Indonesia
- Support untuk berbagai topik
- Menampilkan sumber dan pencarian terkait
- Error handling yang komprehensif
- Progress indicator dengan reaksi emoji

## Dependencies
- axios (untuk HTTP request)

## API Endpoint
- URL: https://aduhai.kanata.web.id/api/ai/gemini-flash
- Method: GET
- Parameters:
  - prompt: Pesan atau pertanyaan (URL encoded)

## Response Format
```json
{
  "text": "Jawaban dari AI",
  "groundingMetadata": {
    "searchEntryPoint": {
      "renderedContent": "HTML content untuk search entry point"
    },
    "groundingChunks": [
      {
        "web": {
          "uri": "URL sumber",
          "title": "Judul sumber"
        }
      }
    ],
    "groundingSupports": [
      {
        "segment": {
          "startIndex": 0,
          "endIndex": 100,
          "text": "Teks yang di-grounding"
        },
        "groundingChunkIndices": [0]
      }
    ],
    "webSearchQueries": [
      "query 1",
      "query 2",
      "query 3"
    ]
  }
}
```

## Error Handling
Plugin ini memiliki error handling untuk:
- Prompt tidak ditemukan
- Timeout saat proses AI
- Error dari API
- Koneksi gagal
- Response tidak valid

## Keunggulan
- **Real-time Information**: Dapat mengakses informasi terkini melalui web search
- **Grounding**: Jawaban didukung oleh sumber terpercaya
- **Transparency**: Menampilkan sumber dan pencarian terkait
- **Bahasa Indonesia**: Dioptimalkan untuk percakapan dalam bahasa Indonesia
- **Various Topics**: Support untuk berbagai macam topik pertanyaan

## Perbedaan dengan Plugin Lain
- `.ai` menggunakan Gemini API langsung dengan API key lokal
- `.gemini` menggunakan helper function dengan context plugin
- `.aigen` menggunakan Gemini Flash API dengan grounding capabilities
- `.aigen` dapat mengakses informasi real-time dari internet

## Tips Penggunaan
- Berikan pertanyaan yang jelas dan spesifik
- Untuk berita terkini, gunakan kata kunci "hari ini" atau "terbaru"
- Plugin akan otomatis menampilkan sumber jika informasi berasal dari web
- Untuk pertanyaan kompleks, AI akan melakukan pencarian web untuk jawaban yang akurat