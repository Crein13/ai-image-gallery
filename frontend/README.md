# 🎨 AI Image Gallery - Frontend

A modern React-based frontend for the AI Image Gallery application, built with Vite and styled with Tailwind CSS. This SPA provides an intuitive interface for uploading, viewing, and searching AI-analyzed images.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend server running on port 4000
- Supabase project configured

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

The development server runs on `http://localhost:5173` with hot module replacement.

## 🏗️ Frontend Architecture

### Project Structure

```
frontend/src/
├── components/              # Reusable UI components
│   ├── GalleryContainer.jsx # Main gallery layout wrapper
│   ├── ImageCard.jsx        # Individual image display card
│   ├── ImageGrid.jsx        # Responsive image grid layout
│   ├── ImageModal.jsx       # Full-size image viewer with metadata
│   ├── Navbar.jsx           # Navigation header with auth controls
│   ├── SearchBar.jsx        # Search input with color filter dropdown
│   ├── SearchResultsIndicator.jsx # Search status and results count
│   └── UploadZone.jsx       # Drag & drop image upload interface
├── contexts/                # React context providers
├── hooks/                   # Custom React hooks
├── pages/                   # Route-level page components
│   └── Gallery.jsx          # Main gallery page
├── services/                # API client functions
├── supabaseClient.js        # Supabase configuration
├── App.jsx                  # Root application component
├── main.jsx                 # Application entry point
├── App.css                  # Global styles
└── index.css                # Tailwind CSS imports
```

### Component Architecture

The frontend follows a component-based architecture with clear separation of concerns:

- **Pages**: Top-level route components that compose layouts
- **Components**: Reusable UI elements with single responsibilities
- **Hooks**: Custom logic for state management and side effects
- **Services**: API communication layer
- **Contexts**: Global state management

## 🎯 Core Features

### 1. Authentication Integration
- Supabase Auth integration with persistent sessions
- Automatic token management and refresh
- Protected route handling
- User profile display and logout

### 2. Image Upload & Management
- **Drag & Drop Interface**: Modern file upload with visual feedback
- **Multi-file Support**: Batch upload multiple images simultaneously
- **Progress Tracking**: Real-time upload progress indicators
- **Format Validation**: Client-side MIME type and size validation
- **Error Handling**: Graceful error states with retry options

### 3. Advanced Search & Filtering
- **Text Search**: Real-time search with 300ms debouncing
- **Color Filtering**: Visual color picker with 20+ dominant colors
- **Combined Filters**: Text + color search with AND logic
- **Search State Persistence**: Maintains search context during navigation
- **Results Indication**: Clear feedback on search results and counts

### 4. Gallery Experience
- **Responsive Grid**: CSS Grid layout that adapts to screen sizes
- **Lazy Loading**: Performance-optimized image loading
- **Modal Viewer**: Full-screen image viewing with metadata overlay
- **AI Metadata Display**: Shows tags, descriptions, and colors
- **Loading States**: Skeleton screens and progressive loading

### 5. User Experience Enhancements
- **Mobile Responsive**: Touch-friendly interface for all devices
- **Accessibility**: ARIA labels and keyboard navigation support
- **Visual Feedback**: Hover states, loading spinners, and transitions
- **Error Boundaries**: Graceful error handling with user-friendly messages

## 🛠️ Frontend Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^19.1.1 | UI library with hooks and modern patterns |
| **Vite** | ^7.1.7 | Fast build tool and development server |
| **Tailwind CSS** | ^4.1.16 | Utility-first CSS framework |
| **React Router** | ^7.9.5 | Client-side routing and navigation |
| **Axios** | ^1.13.1 | HTTP client for API communication |
| **Supabase JS** | ^2.78.0 | Authentication and database client |
| **ESLint** | ^9.36.0 | Code linting and quality enforcement |

## 🎨 UI/UX Implementation

### Design System
- **Color Palette**: Consistent color scheme with CSS custom properties
- **Typography**: Responsive font sizing with Tailwind's type scale
- **Spacing**: 8px grid system for consistent layouts
- **Components**: Reusable design tokens and component patterns

### Responsive Design
```css
/* Breakpoint Strategy */
sm:   640px+  /* Mobile landscape */
md:   768px+  /* Tablet */
lg:   1024px+ /* Desktop */
xl:   1280px+ /* Large desktop */
```

### Accessibility Features
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly content
- High contrast color ratios

## 🔧 Component APIs

### SearchBar Component
```jsx
<SearchBar
  searchQuery={string}           // Current search text
  selectedColor={string|null}    // Selected color filter
  onSearchChange={function}      // Search text change handler
  onColorChange={function}       // Color filter change handler
  availableColors={array}        // Array of color options
/>
```

### ImageCard Component
```jsx
<ImageCard
  image={object}                 // Image data object
  onImageClick={function}        // Click handler for modal view
  isLoading={boolean}            // Loading state display
/>
```

### UploadZone Component
```jsx
<UploadZone
  onFilesSelected={function}     // File selection handler
  isUploading={boolean}          // Upload state
  uploadProgress={number}        // Progress percentage (0-100)
/>
```

## 🌐 API Integration

### Service Layer
The frontend communicates with the backend through a clean service layer:

```javascript
// services/imageService.js
export const imageService = {
  uploadImages: (files) => POST /api/images/upload
  getImages: (params) => GET /api/images
  searchImages: (query, color) => GET /api/images/search
  getImage: (id) => GET /api/images/:id
}
```

### Error Handling
- Network error detection and retry logic
- User-friendly error messages
- Graceful degradation for offline scenarios
- Loading states for all async operations

### State Management
- React hooks for local component state
- Context API for global application state
- Optimistic updates for better UX
- Efficient re-rendering with proper dependencies

## 🎭 User Flows

### Upload Flow
1. User drags images to upload zone
2. Files validated (type, size, format)
3. Upload progress displayed with cancel option
4. Images appear in gallery with processing indicators
5. AI metadata populates asynchronously

### Search Flow
1. User types in search bar (debounced)
2. Results filter in real-time
3. Color filter can be applied additionally
4. Search state persists during navigation
5. Clear search resets to full gallery

### Gallery Flow
1. Images load progressively with thumbnails
2. Click opens modal with full-size image
3. Metadata displays (tags, description, colors)
4. Navigation between images in modal
5. Close returns to gallery with preserved state

## 🚀 Performance Optimizations

### Code Splitting
- Route-based lazy loading with React.lazy()
- Component-level code splitting for large features
- Dynamic imports for non-critical functionality

### Image Optimization
- Thumbnail-first loading strategy
- Lazy loading for off-screen images
- WebP format support with fallbacks
- Responsive image sizing

### Bundle Optimization
- Tree shaking for unused code elimination
- CSS purging in production builds
- Asset optimization through Vite
- Gzip compression for static assets

### Runtime Performance
- React.memo for expensive components
- useMemo and useCallback for optimization
- Debounced search to reduce API calls
- Efficient re-rendering strategies

## 🧪 Development Workflow

### Code Quality
```bash
# Linting with ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

### Environment Configuration
```bash
# Development
VITE_BACKEND_URL=http://localhost:4000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Production
VITE_BACKEND_URL=https://your-backend.railway.app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Build Process
```bash
# Development build
npm run dev

# Production build
npm run build

# Analyze bundle size
npm run build -- --analyze
```

## 🎯 Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features require modern browser APIs
- Graceful fallbacks for older browsers

## 🔧 Customization

### Theming
Tailwind CSS configuration allows easy customization:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        secondary: '#your-color'
      }
    }
  }
}
```

### Component Extension
Components are designed for easy extension and customization:

```jsx
// Custom ImageCard variant
<ImageCard
  className="custom-styling"
  variant="compact"
  showMetadata={false}
/>
```

## 🚀 Deployment

### Build Configuration
```bash
# Production build
npm run build

# Output directory: dist/
# Deploy dist/ folder to your hosting platform
```

### Recommended Platforms
- **Vercel**: Zero-config deployment with Git integration
- **Netlify**: JAMstack deployment with form handling
- **AWS S3 + CloudFront**: Enterprise-grade CDN deployment
- **GitHub Pages**: Free static hosting

### Environment Variables
Ensure all environment variables are properly configured:
- `VITE_BACKEND_URL`: Your backend API endpoint
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Production build tested locally
- [ ] Backend API endpoints accessible
- [ ] CORS configured for production domain
- [ ] Error tracking configured (Sentry, LogRocket)
- [ ] Analytics configured (Google Analytics, Plausible)

## 📚 Related Documentation

- **[Main README](../README.md)** - Full-stack project overview and setup
- **[Backend README](../backend/README.md)** - Backend API documentation
- **[Vite Configuration](./vite.config.js)** - Build tool configuration
- **[Tailwind Configuration](./tailwind.config.js)** - Styling framework setup
