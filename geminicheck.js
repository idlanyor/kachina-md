// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node
import './global.js'
import {
  GoogleGenAI,
} from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({
    apiKey: globalThis.apiKey.gemini,
  });
  const config = {
    thinkingConfig: {
      thinkingBudget: 0,
    },
  };
  const model = 'gemini-2.5-flash';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `hai`,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });
  let fileIndex = 0;
  for await (const chunk of response) {
    console.log(chunk.text);
  }
}

main();
