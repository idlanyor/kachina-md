# Plugin Manager - Kachina Bot

Plugin Manager web interface yang modern dengan Tailwind CSS v3 + Alpine.js.

## Features

- 🎨 **Modern UI** - Glassmorphism effects, smooth animations, gradient backgrounds
- ⚡ **Real-time Search** - Filter plugins by name, command, or category
- 🔄 **Live Updates** - Reactive UI with Alpine.js
- 📝 **Code Editor** - Edit plugin source code directly
- 🎯 **Status Management** - Enable/disable plugins dengan mudah
- 🗂️ **Category Filter** - Group plugins by category
- 📊 **Statistics** - Real-time plugin stats

## Tech Stack

- **Frontend**: Alpine.js v3 + Tailwind CSS v3
- **Backend**: Express.js
- **Icons**: Bootstrap Icons

## Menjalankan Plugin Manager

### Start Server

```bash
npm run plugin-manager
```

Server akan berjalan di `http://localhost:3000`

### Build CSS (Development)

Jika mengubah styling:

```bash
# Build sekali
npm run build:css

# Watch mode (auto-rebuild)
npm run watch:css
```

## API Endpoints

- `GET /api/plugins` - Get all plugins
- `GET /api/plugins/:filename` - Get specific plugin metadata
- `GET /api/plugins/:filename/content` - Get plugin source code
- `POST /api/plugins/:filename/toggle` - Toggle plugin enable/disable
- `PUT /api/plugins/:filename` - Update plugin content
- `DELETE /api/plugins/:filename` - Delete plugin

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari

## Troubleshooting

### Plugins tidak muncul (0 plugins)

1. **Clear browser cache**: Ctrl+Shift+R atau Cmd+Shift+R
2. **Check server**: Pastikan server berjalan di port 3000
3. **Check console**: Buka DevTools (F12) dan lihat error di Console
4. **Test API**: `curl http://localhost:3000/api/plugins`

### Styling tidak update

```bash
npm run build:css
```

Lalu refresh browser dengan hard reload (Ctrl+Shift+R)

### Modal tidak muncul

Pastikan Alpine.js loaded dengan benar. Check di DevTools Console apakah ada error.

## Development

### File Structure

```
public/
├── index.html       # Main HTML with Alpine.js
├── styles.css       # Tailwind input CSS
├── output.css       # Generated CSS (don't edit)
├── app.js           # Legacy JS (not used anymore)
└── README.md        # This file

services/
├── plugin-server.js # Express server
└── plugin-api.js    # API routes
```

### Custom Utilities (Tailwind)

- `.glass-effect` - Glassmorphism dengan blur(10px)
- `.glass-effect-strong` - Glassmorphism dengan blur(20px)
- `.gradient-primary` - Gradient indigo to purple
- `.gradient-text` - Gradient text dengan clip
- `.btn-ripple` - Button dengan ripple effect

### Custom Animations

- `animate-fade-in-up` - Fade in dari bawah
- `animate-shimmer` - Shimmer effect
- `animate-count-up` - Count up animation
- `animate-gradient-shift` - Gradient shift animation

## License

MIT
