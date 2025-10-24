# Khaata Backend

This is the backend server for the Khaata app built with Express.js, MongoDB, and Mongoose.

## Features

- User registration and authentication
- JWT token-based authentication
- Password hashing with bcrypt
- Input validation with express-validator
- CORS enabled for frontend communication

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create a `.env` file based on `env.example`:
```bash
cp env.example .env
```

3. Update the `.env` file with your MongoDB connection string and JWT secret:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/khaata
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

4. Make sure MongoDB is running on your system

5. Start the server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

## Database Schema

### User Model
```javascript
{
  name: String (required, 2-50 characters),
  email: String (required, unique, valid email),
  password: String (required, min 6 characters, hashed),
  createdAt: Date (default: Date.now)
}
```

## Security Features

- Passwords are hashed using bcrypt with salt rounds of 10
- JWT tokens expire after 7 days
- Input validation prevents malicious data
- CORS is configured for frontend communication
- Email validation ensures proper email format
