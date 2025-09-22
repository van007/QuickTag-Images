<div align="center">

<img src="assets/logo.jpeg" alt="QuickTag-Images Logo" width="180">

### AI-Powered Image Labeling & Organization

Transform your image collections with intelligent naming and metadata using local AI

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
![Local LLM](https://img.shields.io/badge/Local_LLM-🤖-lightgreen?style=for-the-badge)

![Version](https://img.shields.io/badge/Version-0.1.0-lightblue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web-orange?style=for-the-badge)

</div>

---

## ✨ Features

### 🎯 **Smart Image Processing**
- 📁 **Multi-Folder Selection** - Process images from multiple folders simultaneously
- 🤖 **AI-Powered Labeling** - Automatic image analysis and description generation
- 📝 **Intelligent Renaming** - Transform `IMG_2024.jpg` → `sunset_beach_golden_hour.jpg`
- 🏷️ **Metadata Embedding** - Add searchable captions and keywords to image files
- 🔍 **Smart Keyword Extraction** - Automatically extract relevant tags from descriptions

### 🎨 **Beautiful User Interface**
- 💫 **Real-time Processing Display** - Watch as your images are analyzed
- 📊 **Animated Timeline** - Visual history of all processed images
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile
- 🎭 **Modern Design** - Clean interface with JetBrains Mono typography
- ✨ **Smooth Animations** - Delightful interactions and transitions

### 🌍 **Multi-Language Support**
- 🗣️ **5 Languages** - English, French, German, Spanish, and Hindi
- 🔤 **Language Selector** - Easy-to-use dropdown in preview controls
- 🇮🇳 **Hindi Script Support** - Full Devanagari script in filenames and metadata
- 🎯 **Smart Translation** - AI generates names and descriptions in selected language
- 🔒 **No Language Mixing** - Ensures consistency in single language output

### 📱 **Progressive Web App (PWA)**
- 📲 **Install to Device** - Add to home screen/desktop like native app
- 🔧 **Works Offline** - Service worker caches core functionality
- ⚡ **Faster Loading** - Resources cached for instant access
- 🎨 **Custom Install UI** - Beautiful popup and header button
- 🔄 **Auto Updates** - Service worker manages app updates

### 🚀 **Performance Mode**
- ⚡ **Handles 10,000+ Images** - Optimized for massive image collections
- 🔄 **Virtual Scrolling** - Only renders visible images for 100+ batches
- 📊 **Progressive Loading** - Smooth batch rendering for 50-99 images
- 💾 **Smart Caching** - Persistent thumbnail storage with IndexedDB
- 📈 **Memory Management** - Real-time usage indicator with automatic cleanup

### 🎨 **Enhanced User Interface**
- 🖼️ **Optimized Layout** - Side-by-side view for image preview and timeline, maximizing screen real estate
- 📐 **Compact Header Design** - Streamlined header with integrated folder selection for more content visibility
- 🎯 **Smart Scrolling** - Individual scroll areas for image grid and timeline with custom-styled scrollbars
- 📁 **Horizontal Folder Display** - Space-efficient grid layout for selected folders (2-4 per row)
- 🔒 **No Page Scrolling** - Entire interface fits within viewport, eliminating app-container scrollbar
- 🏷️ **Descriptive Mode Toggle** - Switch between standard and keyword-rich filenames for better searchability

### ⚙️ **Powerful Controls**
- ⚙️ **LLM Settings** - Configure server URL and select AI model
- ⏹️ **Stop Processing** - Cancel batch processing at any time
- 🔒 **Safe Operation** - Confirmation dialogs prevent accidental data loss
- 💾 **Batch Download** - Export all processed images as ZIP
- 📋 **Export Logs** - Keep records of all changes made
- 🔄 **New Batch** - Start fresh with clear confirmation

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local LLM server running on port 1234 (LM Studio, Ollama, etc.)
- **⚠️ Important: Vision model is essential** - The LLM must have vision/image analysis capability. Text-only models will not work.

### Installation

#### Option 1: Direct Browser (Easiest)
Simply open `index.html` directly in your browser - no server needed!

#### Option 2: Clone Repository
```bash
git clone https://github.com/yourusername/QuickTag-Images.git
cd QuickTag-Images
# Open index.html in your browser
```

#### Option 3: Deploy Online
- **GitHub Pages**: Enable in repository settings
- **Netlify**: Drop folder on netlify.com
- **Vercel**: Deploy with one click
- **Any Static Host**: Upload the files


### 🔧 LLM Configuration

Click the LLM status indicator in the header to configure your server URL and select model. Default configuration:

```javascript
const LLM_CONFIG = {
  baseUrl: "http://127.0.0.1:1234",  // Configurable via Settings
  endpoints: {
    models: "/v1/models",
    chat: "/v1/chat/completions",
    embeddings: "/v1/embeddings"
  },
  streaming: true
}
```

#### Supported LLM Servers
- [LM Studio](https://lmstudio.ai/)
- [Ollama](https://ollama.ai/)
- Any OpenAI-compatible API

#### Tested Vision Models
The following models have been tested and confirmed to work:
- **Gemma 3 27B** - Best quality results
- **Gemma 3 12B** - Good balance of speed and quality  
- **Gemma 3 4B** - Fastest processing

## 📖 Usage

### Basic Workflow

1. **Select Folders** 📁
   - Click "Add Folder" to select image directories
   - Add multiple folders for batch processing
   - View total image count across all folders

2. **Preview Images** 👁️
   - See thumbnails of all selected images
   - Select/deselect specific images
   - Images grouped by source folder

3. **Process Images** 🤖
   - Click "Process Images" to start AI analysis
   - Watch real-time progress with thumbnail preview
   - See generated names and descriptions live

4. **Review Results** ✅
   - Beautiful timeline shows all processed images
   - Each image displays new name and description
   - Processing time tracked automatically

5. **Download Results** 💾
   - Download ZIP with renamed images
   - Metadata embedded in files
   - Export processing log for records

## 🛠️ Technical Details

### Architecture
- **100% Client-Side** - No backend server required
- **Serverless** - Runs entirely in your browser
- **Static Files** - Just HTML, CSS, and JavaScript
- **Local Processing** - All image processing happens on your device
- **Privacy-First** - Images never leave your computer

### Supported Image Formats
- **Raster**: PNG, JPG, JPEG, WEBP, GIF, BMP
- **Vector**: SVG
- **Metadata**: EXIF (JPEG), tEXt chunks (PNG)

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Dependencies (CDN)
- **[JSZip](https://stuk.github.io/jszip/)** - Creating ZIP archives
- **[Piexifjs](https://github.com/hMatoba/piexifjs)** - JPEG EXIF manipulation
- **[JetBrains Mono](https://www.jetbrains.com/lp/mono/)** - Typography

## 📊 Metadata Standards

### Cross-Platform Compatibility

The app embeds metadata using multiple standards for maximum compatibility:

| Platform | Fields Used | Visibility |
|----------|------------|-----------|
| **Windows** | XPComment, XPKeywords | File Properties, Photos App |
| **macOS** | ImageDescription, Keywords | Finder, Photos, Preview |
| **Linux** | Standard EXIF/tEXt | GIMP, gThumb, etc. |
| **Google Photos** | All standard fields | Web & Mobile |
| **Adobe Products** | EXIF, IPTC, XMP | Lightroom, Photoshop |

## 🎯 Use Cases

- 📸 **Photographers** - Organize photo shoots with descriptive names
- 🎨 **Designers** - Catalog design assets with searchable metadata
- 📚 **Archivists** - Document historical images with detailed descriptions
- 🏢 **Businesses** - Manage product photography with consistent naming
- 👨‍👩‍👧‍👦 **Personal** - Organize family photos with meaningful names


## 🎨 PWA Customization

### Adjust Install Popup Timing
The PWA install popup appears 3 seconds after page load by default. To customize:

1. Open `js/pwa-installer.js`
2. Find `PWA_CONFIG.INSTALL_POPUP_DELAY` (line 8)
3. Change the value (in milliseconds):
   - `0` = Immediate display
   - `3000` = 3 seconds (default)
   - `10000` = 10 seconds
   - `30000` = 30 seconds

## 🙏 Acknowledgments

- **Zero Setup** - No installation, no server, just open and use
- **Pure Client-Side** - Built with vanilla JavaScript, runs entirely in browser
- **Privacy by Design** - All processing happens locally on your device
- **No Dependencies** - No npm install, no build process, no configuration
- **Offline Capable** - Works without internet (except CDN libraries)
- **Your Data Stays Yours** - Images never leave your computer

---

<div align="center">

### Made with ❤️ for better image organization

**Copyright © 2025 Varun Nidhi**

Licensed under the [Mozilla Public License 2.0](LICENSE)

</div>