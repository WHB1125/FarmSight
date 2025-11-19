# Agricultural Product Price Prediction Platform

A comprehensive web application for monitoring, analyzing, and predicting agricultural product prices across Jiangsu Province, China. This platform serves farmers, retailers, and market managers with real-time market data, AI-powered price predictions, and regional market insights.

## Features

### 1. **Real-time Price Monitoring**
- Live tracking of agricultural product prices across multiple cities in Jiangsu Province
- Historical price trends and charts
- Price comparison across different regions
- Support for various products: pork, beef, chicken, eggs, cabbage, rice, and more

### 2. **AI-Powered Price Prediction**
- Machine learning model using ONNX Runtime for accurate price forecasting
- Multi-day price predictions (1-7 days ahead)
- Feature engineering based on historical patterns, trends, and seasonal factors
- Real-time prediction updates

### 3. **Regional Market Distribution**
- Interactive map visualization of Jiangsu Province
- Real-time seller information across 13 cities:
  - Nanjing (南京)
  - Suzhou (苏州)
  - Wuxi (无锡)
  - Changzhou (常州)
  - Xuzhou (徐州)
  - Nantong (南通)
  - Yangzhou (扬州)
  - Taizhou (泰州)
  - Zhenjiang (镇江)
  - Yancheng (盐城)
  - Huai'an (淮安)
  - Lianyungang (连云港)
  - Suqian (宿迁)
- Price comparison across regions with color-coded indicators
- Detailed seller information including contact details and addresses

### 4. **Role-Based Dashboards**

#### Farmer Dashboard
- Monitor your product prices
- View market trends
- Get price predictions for optimal selling times
- Access regional market information

#### Retailer Dashboard
- Track purchase opportunities
- Compare prices across suppliers
- View regional market distribution
- AI-powered buying recommendations

#### Manager Dashboard
- Comprehensive market analytics
- System-wide price monitoring
- Regional market insights
- Data management tools

### 5. **User Management**
- Secure authentication system using Supabase Auth
- Role-based access control (Farmer, Retailer, Manager)
- User profile management
- City-based customization
- Favorite products tracking
- Search history

### 6. **AI Chatbot Assistant**
- Natural language interface for market inquiries
- Product price queries
- Market trend explanations
- Prediction insights

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Router** for navigation
- **ONNX Runtime Web** for client-side ML inference

### Backend
- **Supabase** for:
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Edge Functions

### Machine Learning
- **ONNX** model for price prediction
- **Python** scripts for model training and conversion
- Feature engineering with temporal patterns

### Edge Functions
1. **fetch-market-prices**: Fetches real-time market prices
2. **fetch-huinong-sellers**: Retrieves seller information from agricultural markets
3. **predict-onnx**: AI-powered price prediction using ONNX model
4. **predict-features**: Feature extraction for ML models
5. **simple-predict**: Simple prediction endpoint

## Database Schema

### Tables

#### `users`
- User authentication and profile information
- Role assignment (farmer, retailer, manager)
- City preference
- Created/updated timestamps

#### `products`
- Agricultural product catalog
- Product names, units, categories
- Image URLs

#### `market_prices`
- Historical price data
- Product ID, city, date, price
- Source tracking

#### `price_predictions`
- AI-generated price predictions
- Multiple days ahead predictions
- Confidence scores
- Model version tracking

#### `sellers`
- Regional seller information
- Contact details and addresses
- Seller types (wholesale_market, dealer, distributor, cooperative)
- Price listings

#### `user_favorites`
- User's favorite products
- Quick access to frequently monitored items

#### `user_search_history`
- Search query tracking
- User behavior analytics

## Security

### Row Level Security (RLS)
All database tables are protected with RLS policies:

- **Users**: Can only access their own profile data
- **Products**: Public read access, restricted write access
- **Market Prices**: Public read for transparency
- **Predictions**: Public read access
- **Sellers**: Public read for market transparency
- **Favorites**: Users can only manage their own favorites
- **Search History**: Users can only view their own history

### Authentication
- Email/password authentication via Supabase
- Secure session management
- Password reset functionality
- Protected routes based on user roles

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Python 3.8+ (for model training)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

### Database Setup

The database is managed through Supabase migrations located in `supabase/migrations/`. Key migrations include:

- User roles and authentication setup
- Products and prices tables
- Price predictions table
- Sellers and markets table
- User favorites and search history
- RLS policies for all tables

### Model Training and Deployment

1. Export data from database:
```bash
node export_script.mjs
```

2. Train the model (Python):
```bash
python predict_prices.py
```

3. Convert to ONNX format:
```bash
python convert_to_onnx.py
```

4. Deploy the prediction edge function:
```bash
# Automatically deployed via Supabase
```

## Application Structure

```
project/
├── src/
│   ├── components/         # React components
│   │   ├── AIChatbot.tsx
│   │   ├── PriceAnalytics.tsx
│   │   ├── PriceMonitor.tsx
│   │   ├── PriceTrendChart.tsx
│   │   ├── RealtimePrediction.tsx
│   │   ├── RegionalMarketMap.tsx
│   │   └── UserCenter.tsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/               # Utility libraries
│   │   └── supabase.ts
│   ├── pages/             # Page components
│   │   ├── FarmerDashboard.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── PricePredict.tsx
│   │   ├── RetailerDashboard.tsx
│   │   └── SignupPage.tsx
│   ├── services/          # API services
│   │   ├── onnxPredictionApi.ts
│   │   └── predictionApi.ts
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── api/                   # Python API (optional)
└── dist/                  # Production build
```

## Key Components

### RegionalMarketMap
Interactive map component showing seller distribution across Jiangsu Province with:
- Real-time price indicators (color-coded)
- Seller details on hover/click
- City-level filtering
- Price comparison visualization

### RealtimePrediction
AI-powered prediction interface with:
- Multi-day forecasts
- Confidence intervals
- Historical comparison
- Visual trend charts

### PriceMonitor
Real-time price tracking with:
- Live price updates
- Historical data charts
- City-based filtering
- Product comparison

### AIChatbot
Conversational interface for:
- Natural language queries
- Market insights
- Price explanations
- Prediction analysis

## API Endpoints

### Edge Functions

#### POST `/functions/v1/fetch-market-prices`
Fetches current market prices for a specific product.

**Request:**
```json
{
  "product_name": "Pork",
  "city": "Nanjing"
}
```

#### POST `/functions/v1/fetch-huinong-sellers`
Retrieves seller information from agricultural markets.

**Request:**
```json
{
  "product_name": "Pork"
}
```

#### POST `/functions/v1/predict-onnx`
Generates price predictions using ONNX model.

**Request:**
```json
{
  "product_id": "uuid",
  "city": "Nanjing",
  "days_ahead": 7
}
```

## Data Flow

1. **Price Collection**: Edge functions fetch real-time prices from market sources
2. **Data Storage**: Prices stored in PostgreSQL with timestamps
3. **Feature Engineering**: Historical data processed for ML features
4. **Model Prediction**: ONNX model generates forecasts
5. **Visualization**: React components display data with charts and maps
6. **User Interaction**: Role-based dashboards provide relevant insights

## Performance Considerations

- **ONNX Runtime**: Client-side inference for fast predictions
- **Database Indexing**: Optimized queries for large datasets
- **Edge Functions**: Serverless architecture for scalability
- **RLS**: Database-level security without performance overhead
- **Caching**: Strategic caching for frequently accessed data

## Future Enhancements

- [ ] Mobile application (React Native)
- [ ] Weather data integration
- [ ] Supply chain tracking
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Export reports (PDF/Excel)
- [ ] SMS/Email notifications
- [ ] API for third-party integration
- [ ] Blockchain for price transparency

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support or questions:
- Open an issue on GitHub
- Contact the development team
- Check documentation in `/docs`

## Acknowledgments

- Supabase for backend infrastructure
- ONNX Runtime for ML inference
- Huinong Network for market data reference
- React and Vite communities

---

**Version**: 1.0.0
**Last Updated**: November 2025
**Status**: Production Ready
