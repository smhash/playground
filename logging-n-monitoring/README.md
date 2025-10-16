# 🛍️ E-Commerce Shoe Store

A modern, responsive e-commerce application built with Next.js 15, featuring a complete shopping experience with advanced observability and monitoring.

## 🎯 Features

### **🛒 Shopping Experience**
- **Product Catalog**: Browse Brooks running shoes with detailed product information
- **Search & Filtering**: Filter by brand, size, and width
- **Product Details**: Comprehensive product pages with images, ratings, and specifications
- **Shopping Cart**: Add items, manage quantities, and proceed to checkout
- **Checkout Process**: Streamlined checkout with order confirmation

### **📱 User Interface**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Material-UI Components**: Modern, accessible UI components
- **Product Images**: High-quality product photography
- **Rating System**: Customer reviews and ratings display
- **Real-time Updates**: Dynamic cart updates and inventory management

### **🔍 Product Information**
- **Detailed Specifications**: Size charts, materials, and features
- **Customer Reviews**: Authentic customer feedback and ratings
- **Product Badges**: "Amazon's Choice" and "Overall Pick" indicators
- **Delivery Information**: Shipping estimates and Prime benefits
- **Return Policy**: Clear return and exchange information

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm or yarn

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd logging-n-monitoring

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### **Environment Variables**
```bash
# Sentry Configuration (for error tracking)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Optional: Alerting Configuration
SLACK_WEBHOOK_URL=your_slack_webhook_url
TEAMS_WEBHOOK_URL=your_teams_webhook_url
ALERT_EMAIL_RECIPIENTS=admin@example.com
```

## 🛍️ Application Structure

### **Pages**
- **Home** (`/`): Landing page with featured products
- **Search** (`/search`): Product catalog with filtering
- **Product Detail** (`/detail/[id]`): Individual product pages
- **Shopping Cart** (`/my_cart`): Cart management
- **Checkout** (`/checkout`): Order completion
- **Order Confirmation** (`/order-confirmation`): Success page
- **Monitoring** (`/monitoring`): System health dashboard

### **API Endpoints**
- `GET /api/products` - Product catalog
- `GET /api/health` - System health check
- `GET /api/metrics` - Application metrics

## 🎨 User Experience

### **Product Discovery**
- Browse by category and brand
- Filter by size, width, and price
- Sort by popularity, rating, or price
- View detailed product specifications

### **Shopping Cart**
- Add multiple items with different sizes
- Update quantities in real-time
- Remove items with one click
- Save items for later

### **Checkout Process**
- Secure payment processing
- Address and delivery options
- Order summary and confirmation
- Email notifications

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15** - React framework with App Router
- **Material-UI** - Component library
- **TypeScript** - Type safety
- **React Hooks** - State management

### **Backend**
- **Next.js API Routes** - Server-side API endpoints
- **Node.js** - Runtime environment
- **TypeScript** - Type safety

### **Observability** (See [OBSERVABILITY.md](./OBSERVABILITY.md))
- **Sentry** - Error tracking and performance monitoring
- **Prometheus** - Metrics collection
- **Winston** - Structured logging
- **Custom Alerting** - Multi-channel notifications

## 📱 Screenshots

### **Product Catalog**
Browse and filter Brooks running shoes with detailed product information.

### **Shopping Cart**
Manage your cart with real-time updates and quantity controls.

### **Checkout Process**
Streamlined checkout with secure payment processing.

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
# Deploy to Vercel
npm run build
vercel --prod
```

### **Other Platforms**
- **Netlify**: Compatible with static export
- **AWS Amplify**: Full-stack deployment
- **Docker**: Containerized deployment

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open pull request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- **[OBSERVABILITY.md](./OBSERVABILITY.md)** - Comprehensive observability and monitoring guide (includes correlation ID setup)

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation files
- Review the observability setup guide

## 🧑‍💻 User Session Management

- **Kinde Abstraction**: All user/session logic is behind a KindeService interface, easily swappable for real or mock implementations.
- **Automatic Session Refresh**: Sessions are automatically refreshed in the background and before expiry.
- **401 Handling**: API calls that receive a 401 will attempt a silent session refresh and retry automatically.
- **React Context**: User/session state is provided via a React context and hooks (`useUser`, `useUserInfo`, etc), never leaking into business logic.
- **No Business Logic Leaks**: All session management is contained in the auth layer, not in business or UI code.
- **Ready for Real Kinde**: Just implement the real KindeService methods for production.

See `USER_SESSION.md` for deep details.

---

**Built with ❤️ using Next.js and modern web technologies**
