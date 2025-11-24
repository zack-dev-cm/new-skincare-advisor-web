# Dermaself Frontend - Next.js Skin Analysis App

A modern, responsive Next.js application for AI-powered skin analysis that can be embedded in Shopify storefronts.

## 🚀 Features

- **AI Skin Analysis**: Upload photos or use camera for instant skin analysis
- **Shopify Integration**: Designed to be embedded in Shopify storefronts
- **Ultra-Fast Embed**: 0.3-0.8s load time with background loading (80-90% faster)
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Modern UI**: Beautiful animations and user experience
- **Real-time Processing**: Live camera capture and instant analysis
- **Product Recommendations**: Personalized skincare product suggestions

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **File Upload**: React Dropzone
- **HTTP Client**: Axios
- **State Management**: React Hooks

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── embed/             # Shopify embed page
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── SkinAnalysis.tsx   # Main analysis component
│   ├── ImageUpload.tsx    # File upload component
│   ├── CameraCapture.tsx  # Camera capture component
│   ├── AnalysisResults.tsx # Results display
│   ├── ShopifyEmbed.tsx   # Shopify integration
│   ├── Header.tsx         # Navigation header
│   └── Footer.tsx         # Footer component
└── lib/                   # Utilities and API
    └── api.ts            # API client and functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Azure Functions backend running

### Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:7071/api
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Azure Functions API URL | `http://localhost:7071/api` |
| `SHOPIFY_DOMAIN` | Your Shopify store domain | - |
| `SHOPIFY_ACCESS_TOKEN` | Shopify API access token | - |

### Shopify Integration

The app includes TWO embed modes:

#### 🐢 Standard Embed (`/embed`)
- Full feature set with animations
- Load time: 3-5 seconds
- Use when: Performance is not critical

#### ⚡ Fast Embed (`/embed-fast`) - **RECOMMENDED**
- **80-90% faster** (0.3-0.8s load time)
- Background loading of heavy dependencies
- Progressive image loading
- Use when: Speed is critical (most cases)

```html
<!-- Fast Embed (RECOMMENDED) -->
<iframe 
  src="https://your-domain.com/embed-fast" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="camera"
  loading="eager"
  fetchpriority="high"
></iframe>
```

📖 **See [FAST_EMBED_GUIDE.md](./FAST_EMBED_GUIDE.md) for complete integration guide**

## 📱 Usage

### Standalone Mode

1. Visit the main page
2. Upload a photo or use camera
3. Get instant skin analysis
4. View personalized recommendations

### Embedded Mode (Shopify)

1. Embed the app in your Shopify store
2. Customers can analyze their skin
3. Get product recommendations
4. Seamless integration with your store

## 🎨 Customization

### Styling

The app uses Tailwind CSS with custom design tokens:

```css
/* Custom colors in tailwind.config.ts */
primary: {
  50: '#f0f9ff',
  // ... more shades
},
skin: {
  50: '#fef7f0',
  // ... more shades
}
```

### Components

All components are modular and can be easily customized:

```tsx
// Customize the main analysis component
<SkinAnalysis 
  onAnalysisComplete={(result) => {
    // Handle results
  }}
/>
```

## 🔌 API Integration

The app communicates with Azure Functions backend:

```typescript
import { analyzeSkin, getUploadUrl } from '@/lib/api';

// Analyze skin image
const result = await analyzeSkin(imageDataUrl);

// Get upload URL
const { uploadUrl, inferenceId } = await getUploadUrl();
```

## 📊 Performance

- **Lazy Loading**: Components load on demand
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Caching**: Built-in caching strategies

## 🔒 Security

- **CORS**: Configurable cross-origin policies
- **Input Validation**: Client-side validation
- **Secure Uploads**: Signed URLs for file uploads
- **XSS Protection**: Built-in React protection

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect repository to Vercel**
2. **Set environment variables**
3. **Deploy automatically**

### Other Platforms

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## 📈 Analytics

The app includes built-in analytics tracking:

- Page views
- Analysis completions
- Error tracking
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Contact the development team

## 🔄 Updates

Stay updated with the latest features and improvements by:

- Following the repository
- Checking the changelog
- Reading the release notes
