<div align="center">
<h1>Kachina-MD</h1>
<h2 style="color:#1496DC">by Roy</h2>

![GitHub repo size](https://img.shields.io/github/repo-size/idlanyor/kachina-md)
![GitHub stars](https://img.shields.io/github/stars/idlanyor/kachina-md?style=social)
![GitHub license](https://img.shields.io/github/license/idlanyor/kachina-md)

![Kachina](kachina.jpg)

</div>


This is a project that demonstrates how to use plugin modular stucture to make a Bot Whatsapp using Baileys

## Requirements

In order to run this project, you will need to have [Bun](https://bun.sh) installed on your system. You can install it by running the following command in your terminal:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Installation

To install the required dependencies, run the following command in your terminal:

```bash
bun install
```

## Usage

To use this project, you will need to set up a Various API key. You can do this by renaming a file called `globalThis.example.js` to `globalThis.js` in the root directory of the project and adding the following code to it:

```javascript
// variabel dasar
globalThis.owner = "Roynaldi";
globalThis.botName = "Kanata Bot";
globalThis.ownerNumber = ""
globalThis.botNumber = ""
globalThis.sessionName = 'kanata-bot'

// fungsi dasar
globalThis.isOwner = (id) => {
    return id === globalThis.ownerNumber
}
globalThis.isBot = async (id) => {
    return id === botNumber
}

// variabel apikey
globalThis.apiKey = {
    gemini: '',
    gpt: '',
    mistral: '',
    removeBG: '',
    groq: '',
    pdf: {
        secret: '',
        public: ''
    }
}

// variabel paired apikey with baseurl
globalThis.apiHelper = {
    medanpedia: {
        apiId: '',
        apiKey: ''
    },
    lolhuman: {

        apikey: '',

        baseUrl: 'https://api.lolhuman.xyz/api/'

    },

    betabotz: {

        apikey: '',

        baseUrl: 'https://api.betabotz.eu.org/api/'

    },

    skizotech: {

        apikey: '',

        baseUrl: 'https://skizo.tech/api/'

    },
    nyxs: {
        apikey: '',
        baseUrl: 'https://api.nyxs.pw/api/'
    }

}

```

Replace all value wit your own.

After that, you can start the project by running the following command in your terminal:

```bash
bun .
```


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Contributors
- [Roynaldi](https://github.com/idlanyor)
- [Puan Mahalini](https://github.com/puanmahalini)
