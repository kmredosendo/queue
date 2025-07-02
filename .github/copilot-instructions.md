# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a comprehensive queueing system built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and MySQL. The system includes:

- **Admin Dashboard**: Manage lanes/offices and users with different roles (admin, user, display, reservation)
- **User Interface**: For cashiers to manage queue operations (next number, advance call, buzz current number)
- **Reservation System**: For customers to get queue numbers by selecting lanes/offices
- **Display System**: Shows current queue status for all active lanes

## Key Technologies
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes
- **Database**: MySQL with Prisma ORM
- **Authentication**: Custom authentication system (no third-party providers)

## User Roles
- **admin**: Full access to admin dashboard
- **user**: Cashier/office personnel interface
- **display**: Display screen interface
- **reservation**: Customer reservation interface

## Code Style Guidelines
- Use TypeScript for all components and API routes
- Follow Next.js App Router conventions
- Use shadcn/ui components for consistent UI
- Implement proper error handling and loading states
- Use Prisma for database operations
- Follow REST API conventions for endpoints
