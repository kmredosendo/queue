# Queue Management System

A comprehensive queueing system built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and MySQL. The system provides efficient queue management for better customer service across multiple service lanes.

## Features

### 🔐 Authentication System
- **Admin**: Full access to admin dashboard for managing users and lanes
- **User**: Cashier/office personnel interface for queue operations  
- **Display**: Display screen interface showing current queue status
- **Reservation**: Customer reservation interface for getting queue numbers

### 📊 Admin Dashboard
- Manage service lanes/offices
- Create and manage users with different roles
- Assign users to specific lanes
- View real-time statistics and queue status

### 👨‍💼 User Interface (Cashiers)
- Next number button to advance queue
- Call current number again
- Buzz current number for attention
- Display number of people waiting
- Serve current customer

### 📱 Reservation System
- Select service lane/office
- Get queue number with estimated wait time
- Print-friendly queue ticket

### 📺 Display System
- Shows all active lanes/offices
- Displays current serving number
- Real-time queue status updates

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MySQL with Prisma ORM
- **Authentication**: Custom JWT-based authentication
- **UI Components**: shadcn/ui with Radix UI primitives

## Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd queue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the `.env` file and update with your database credentials:
   ```bash
   # Database - Update with your MySQL credentials
   DATABASE_URL="mysql://root:password@localhost:3306/queue_system"
   
   # JWT Secret for authentication
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   
   # Next.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # Seed with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Demo Credentials

### Admin Access
- **Username**: admin
- **Password**: admin123

### Cashier Access  
- **Username**: cashier
- **Password**: cashier123

### Display Access
- **Username**: display  
- **Password**: display123

### Reservation Access
- **Username**: reservation
- **Password**: reservation123

## Usage

### For Administrators
1. Login with admin credentials
2. Navigate to Admin Dashboard
3. Create new lanes/offices as needed
4. Add users and assign them to specific lanes
5. Monitor real-time queue statistics

### For Cashiers/Staff
1. Login with user credentials
2. Select your assigned lane
3. Use queue controls:
   - **Next**: Advance to next number
   - **Call**: Re-announce current number
   - **Buzz**: Send alert for current number
   - **Serve**: Mark current customer as served

### For Customers (Reservation)
1. Access reservation interface (no login required)
2. Select desired service lane
3. Get queue number and estimated wait time
4. Wait for your number to be called

### For Display Screens
1. Login with display credentials
2. Screen shows all active lanes
3. Real-time updates of current serving numbers
4. Queue status for each lane

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users Management
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Create new user (Admin only)

### Lanes Management  
- `GET /api/lanes` - Get all lanes
- `POST /api/lanes` - Create new lane (Admin only)

### Queue Operations
- `POST /api/queue/operations` - Perform queue operations (Next, Call, Buzz, Serve)
- `POST /api/queue/reservation` - Get new queue number
- `GET /api/queue/reservation` - Get current queue status

## Database Schema

The system uses the following main entities:
- **Users**: System users with different roles
- **Lanes**: Service lanes/offices  
- **LaneUser**: User-lane assignments
- **QueueItem**: Individual queue entries
- **QueueOperation**: Log of queue operations

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

### Project Structure
```
src/
├── app/                 # Next.js 13+ app directory
│   ├── admin/          # Admin dashboard pages
│   ├── user/           # Cashier interface pages  
│   ├── display/        # Display screen pages
│   ├── reservation/    # Customer reservation pages
│   └── api/            # API routes
├── components/         # React components
│   └── ui/            # shadcn/ui components
└── lib/               # Utility libraries
    ├── auth.ts        # Authentication utilities
    ├── prisma.ts      # Prisma client
    └── utils.ts       # General utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
