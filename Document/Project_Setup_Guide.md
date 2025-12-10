# TripLink - Project Setup Guide
## Step-by-Step Development Environment Setup

---

## Prerequisites

Before starting the TripLink project, ensure you have the following installed:

### Required Software
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **PostgreSQL** (v14 or higher)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **VS Code** (recommended IDE)

### Optional Software
- **Docker** (for containerized development)
- **Redis** (for caching)
- **MongoDB** (alternative database)

---

## Step 1: Project Repository Setup

### 1.1 Create Project Directory
```bash
# Navigate to your workspace
cd /media/necromancer/B6F8CF63F8CF208B/Iman/Programming/Machine\ Learning/TripLink

# Create project structure
mkdir -p TripLink/{mobile-app,web-app,backend,shared,docs,scripts,tests}
cd TripLink
```

### 1.2 Initialize Git Repository
```bash
# Initialize git repository
git init

# Create .gitignore file
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
build/
dist/
.next/
out/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# React Native
.expo/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/

# Metro
.metro-health-check*

# Flipper
ios/Pods/

# Temporary files created by Metro to check the health of the file watcher
.metro-health-check*

# Testing
/coverage

# Production
/build

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

# Initial commit
git add .
git commit -m "Initial project setup"
```

---

## Step 2: Backend Setup

### 2.1 Initialize Backend Project
```bash
cd backend

# Initialize npm project
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv bcryptjs jsonwebtoken prisma @prisma/client
npm install -D typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken nodemon ts-node

# Create TypeScript configuration
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create package.json scripts
npm pkg set scripts.dev="nodemon src/index.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
```

### 2.2 Set up Prisma Database
```bash
# Install Prisma CLI
npm install -D prisma

# Initialize Prisma
npx prisma init

# Create database schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  avatarUrl     String?
  preferences   Json     @default("{}")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  isVerified    Boolean  @default(false)
  isActive      Boolean  @default(true)

  trips         Trip[]
  priceAlerts   PriceAlert[]
  shoppingItems ShoppingItem[]
  connections   UserConnection[] @relation("UserConnections")
  connectedTo   UserConnection[] @relation("ConnectedToUser")
  notifications Notification[]

  @@map("users")
}

model Trip {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  budget      Decimal?
  startDate   DateTime?
  endDate     DateTime?
  status      String   @default("planning")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  destinations Destination[]
  priceAlerts PriceAlert[]

  @@map("trips")
}

model Destination {
  id           String   @id @default(cuid())
  tripId       String
  city         String
  country      String
  arrivalDate  DateTime?
  departureDate DateTime?
  priority     Int      @default(1)
  notes        String?
  createdAt    DateTime @default(now())

  trip         Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@map("destinations")
}

model PriceAlert {
  id            String   @id @default(cuid())
  userId        String
  tripId        String?
  alertType     String
  origin        String?
  destination   String?
  maxPrice      Decimal?
  minPrice      Decimal?
  preferredDates Json?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  trip          Trip?    @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@map("price_alerts")
}

model ShoppingItem {
  id           String   @id @default(cuid())
  userId       String
  name         String
  category     String?
  targetPrice  Decimal?
  maxPrice     Decimal?
  currentPrice Decimal?
  url          String?
  imageUrl     String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("shopping_items")
}

model UserConnection {
  id               String   @id @default(cuid())
  userId           String
  connectedUserId  String
  connectionType   String   @default("friend")
  status           String   @default("pending")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user             User     @relation("UserConnections", fields: [userId], references: [id], onDelete: Cascade)
  connectedUser    User     @relation("ConnectedToUser", fields: [connectedUserId], references: [id], onDelete: Cascade)

  @@unique([userId, connectedUserId])
  @@map("user_connections")
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  type      String
  data      Json     @default("{}")
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
EOF

# Create environment file
cat > .env << 'EOF'
DATABASE_URL="postgresql://username:password@localhost:5432/triplink"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
NODE_ENV=development
EOF
```

### 2.3 Create Backend Project Structure
```bash
# Create directory structure
mkdir -p src/{controllers,services,models,middleware,routes,utils,config}

# Create main server file
cat > src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes (to be added)
// app.use('/api/auth', authRoutes);
// app.use('/api/trips', tripRoutes);
// app.use('/api/alerts', alertRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
EOF

# Create basic middleware
cat > src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
EOF

# Create basic routes
cat > src/routes/auth.ts << 'EOF'
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone
      }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
EOF

# Update main server file to include routes
sed -i '/\/\/ Routes (to be added)/a app.use("/api/auth", require("./routes/auth").default);' src/index.ts
```

---

## Step 3: Mobile App Setup

### 3.1 Initialize React Native Project
```bash
cd ../mobile-app

# Create React Native project
npx react-native@latest init SynvoyMobile --template react-native-template-typescript

# Install additional dependencies
cd SynvoyMobile
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install @reduxjs/toolkit react-redux
npm install react-native-vector-icons
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-native-async-storage/async-storage
npm install react-native-gesture-handler
npm install react-native-reanimated

# Install dev dependencies
npm install -D @types/react-native-vector-icons
```

### 3.2 Set up Project Structure
```bash
# Create source directory structure
mkdir -p src/{components,screens,services,store,utils,assets}

# Create basic components
cat > src/components/Button.tsx << 'EOF'
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  variant = 'primary', 
  style, 
  ...props 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.button, styles[variant], style]} 
      {...props}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#1E3A8A',
  },
  secondary: {
    backgroundColor: '#0D9488',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  outlineText: {
    color: '#1E3A8A',
  },
});
EOF

# Create basic screens
cat > src/screens/LoginScreen.tsx << 'EOF'
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button } from '../components/Button';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: Implement login logic
    Alert.alert('Login', 'Login functionality to be implemented');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to TripLink</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button title="Sign In" onPress={handleLogin} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
EOF

# Create Redux store
cat > src/store/index.ts << 'EOF'
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
EOF

# Create auth slice
cat > src/store/slices/authSlice.ts << 'EOF'
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
EOF

# Create API service
cat > src/services/api.ts << 'EOF'
import { store } from '../store';

const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  private getHeaders(): HeadersInit {
    const state = store.getState();
    const token = state.auth.token;
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
}

export const apiService = new ApiService();
EOF
```

---

## Step 4: Web App Setup

### 4.1 Initialize Next.js Project
```bash
cd ../web-app

# Create Next.js project
npx create-next-app@latest synvoy-web --typescript --tailwind --eslint

cd synvoy-web

# Install additional dependencies
npm install @reduxjs/toolkit react-redux
npm install axios
npm install react-hook-form
npm install @headlessui/react
npm install @heroicons/react
npm install recharts
```

### 4.2 Set up Project Structure
```bash
# Create source directory structure
mkdir -p src/{components,pages,hooks,services,store,utils}

# Create basic components
cat > src/components/Button.tsx << 'EOF'
import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={twMerge(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
EOF

# Create basic pages
cat > src/pages/login.tsx << 'EOF'
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to TripLink
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
EOF
```

---

## Step 5: Database Setup

### 5.1 PostgreSQL Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE triplink;
CREATE USER triplink_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE triplink TO triplink_user;
\q
EOF

# Update .env file with correct database URL
cd ../backend
sed -i 's/username:password@localhost:5432\/triplink/triplink_user:your_secure_password@localhost:5432\/triplink/' .env
```

### 5.2 Run Database Migrations
```bash
# Generate and run Prisma migrations
npx prisma generate
npx prisma db push

# Create seed data (optional)
cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQJ6qK6O', // password: test123
      firstName: 'Test',
      lastName: 'User',
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Add seed script to package.json
npm pkg set scripts.seed="ts-node prisma/seed.ts"

# Run seed
npm run seed
```

---

## Step 6: Development Scripts

### 6.1 Create Development Scripts
```bash
cd ..

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "triplink",
  "version": "1.0.0",
  "description": "Smart Travel & Shopping Platform",
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:web": "cd web-app && npm run dev",
    "dev:mobile": "cd mobile-app/SynvoyMobile && npm run android",
    "build:backend": "cd backend && npm run build",
    "build:web": "cd web-app && npm run build",
    "test:backend": "cd backend && npm test",
    "test:web": "cd web-app && npm test",
    "db:migrate": "cd backend && npx prisma db push",
    "db:seed": "cd backend && npm run seed",
    "db:studio": "cd backend && npx prisma studio",
    "install:all": "npm install && cd backend && npm install && cd ../web-app && npm install && cd ../mobile-app/SynvoyMobile && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.0.1"
  }
}
EOF

# Install root dependencies
npm install
```

### 6.2 Create Docker Setup (Optional)
```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: triplink
      POSTGRES_USER: triplink_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://triplink_user:your_secure_password@postgres:5432/triplink
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
EOF

# Create backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
EOF
```

---

## Step 7: Testing Setup

### 7.1 Backend Testing
```bash
cd backend

# Install testing dependencies
npm install -D jest @types/jest supertest @types/supertest

# Create Jest configuration
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
EOF

# Add test script to package.json
npm pkg set scripts.test="jest"
npm pkg set scripts.test:watch="jest --watch"

# Create sample test
mkdir -p src/__tests__
cat > src/__tests__/auth.test.ts << 'EOF'
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  test('POST /register should create a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });
});
EOF
```

### 7.2 Frontend Testing
```bash
cd ../web-app

# Install testing dependencies
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Create test setup
cat > src/test-utils.tsx << 'EOF'
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <Provider store={store}>{children}</Provider>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
EOF

# Create sample test
cat > src/__tests__/Button.test.tsx << 'EOF'
import React from 'react';
import { render, screen } from '../test-utils';
import { Button } from '../components/Button';

describe('Button', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('applies variant classes', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByText('Secondary Button');
    expect(button).toHaveClass('bg-teal-600');
  });
});
EOF
```

---

## Step 8: Development Workflow

### 8.1 Start Development Environment
```bash
# Start all services
npm run dev:backend  # Terminal 1
npm run dev:web      # Terminal 2
npm run dev:mobile   # Terminal 3

# Or use Docker
docker-compose up -d
```

### 8.2 Development Commands
```bash
# Database operations
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database with test data
npm run db:studio     # Open Prisma Studio

# Testing
npm run test:backend  # Run backend tests
npm run test:web      # Run web app tests

# Building
npm run build:backend # Build backend for production
npm run build:web     # Build web app for production
```

---

## Step 9: Next Steps

### 9.1 Immediate Actions
1. **Set up your development environment** following the steps above
2. **Test the basic setup** by running the development servers
3. **Create your first user** using the registration endpoint
4. **Test the mobile app** on an Android emulator or device

### 9.2 Development Priorities
1. **Complete authentication flow** in mobile and web apps
2. **Implement trip creation and management**
3. **Add price alert functionality**
4. **Set up basic notifications**

### 9.3 Resources
- **Documentation**: Check the `docs/` folder for detailed documentation
- **API Reference**: Backend API documentation will be generated
- **Design System**: Create consistent UI components
- **Testing**: Write tests for all new features

---

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connection
psql -h localhost -U triplink_user -d triplink

# Reset database
npx prisma db push --force-reset
```

#### Mobile App Issues
```bash
# Clear React Native cache
cd mobile-app/SynvoyMobile
npx react-native start --reset-cache

# Clean Android build
cd android && ./gradlew clean && cd ..
```

#### Web App Issues
```bash
# Clear Next.js cache
cd web-app
rm -rf .next
npm run dev
```

---

## Conclusion

You now have a complete development environment set up for TripLink! The project includes:

- ✅ **Backend API** with Express.js and Prisma
- ✅ **Mobile App** with React Native
- ✅ **Web App** with Next.js
- ✅ **Database** with PostgreSQL
- ✅ **Testing** setup for all platforms
- ✅ **Development** scripts and workflows

**Next Steps**:
1. Start developing features following the roadmap
2. Set up your IDE with recommended extensions
3. Create your first feature branch
4. Begin implementing the core functionality

Remember to check the main documentation files for detailed specifications and business requirements. 