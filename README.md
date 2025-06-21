# EduSync: Your All-in-One Campus Management Solution

Welcome to **EduSync**! This is a comprehensive, user-friendly platform designed to simplify the management of various aspects of an educational institution. It handles student information, attendance, fees, report card generation, and more, all in one place.

## Technology Stack

EduSync is built with a modern and robust technology stack:

- **Frontend:**
    - [Next.js](https://nextjs.org/) (with App Router)
    - [React](https://react.dev/)
    - [Tailwind CSS](https://tailwindcss.com/)
    - [ShadCN UI](https://ui.shadcn.com/) (for pre-built, accessible UI components)
- **Backend:**
    - [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
    - [MongoDB](https://www.mongodb.com/) (as the primary database)
- **AI (Future/Setup):**
    - [Genkit (Firebase Genkit)](https://firebase.google.com/docs/genkit) (for integrating AI capabilities)
- **Language:**
    - [TypeScript](https://www.typescriptlang.org/)

## What Can EduSync Do?

EduSync is packed with features to make running your institution smoother:

- **Multi-Role User Management:**
    - **Super Admins:** Manage schools, school administrator accounts, define school-wide fee structures (tuition and bus fees, term-wise), and apply student fee concessions.
    - **School Admins:** Manage teachers and students. Create students with automatic fee calculation based on class and optional bus transport. Manage attendance overview, fee collection (recording payments), and report generation for their assigned school. View school fee structures. Control student report card visibility for the entire school.
    - **Teachers:** Mark student attendance for their assigned classes, view their profile, and enter student marks for various assessments (including detailed tool-wise FA marks).
    - **Students:** View their attendance records, fee status (including concessions), profile, and published report cards (if allowed by school admin).
- **Streamlined Attendance Tracking:** Teachers can mark daily attendance (Present, Absent, Late). Admins and Students can view relevant attendance records and summaries.
- **Simplified Fee Management:**
    - Super Admins define tuition fees (per class, term-wise) and bus fees (per location & class category, term-wise).
    - Super Admins can apply individual student fee concessions.
    - School Admins record fee payments for students.
    - Students can view their fee payment history and dues, with concessions factored in.
- **Comprehensive Reporting & Report Card Generation:**
    - Admins can view daily attendance summary reports (class-wise and overall) and fee collection summaries (reflecting concessions). PDF download available.
    - A flexible report card generation system (CBSE State Pattern) allows admins to review and save report cards based on teacher-entered marks. Admins can publish/unpublish individual report cards.
- **Personalized Profiles:** Users can view and update their basic profile information (name, phone, avatar).
- **Role-Based Dashboards:** Each user role (Super Admin, Admin, Teacher, Student) gets a tailored dashboard with relevant information and quick links. The header dynamically displays the school logo for school-affiliated users.

## Project Structure Overview

The project follows a structure typical for Next.js applications using the App Router:

-   **`/src/app/`**: Core of the application, contains all routes, pages, and layouts.
    -   **`/src/app/dashboard/`**: Contains subdirectories for each user role's dashboard and features (e.g., `/admin`, `/student`, `/teacher`, `/super-admin`).
        -   Each feature page typically has a `page.tsx` file.
    -   **`/src/app/actions/`**: Holds all Next.js Server Actions. These functions execute on the server and handle backend logic like database operations, authentication, etc. They are the primary mechanism for backend processing.
    -   **`/src/app/layout.tsx`**: The root layout for the application.
    -   **`/src/app/page.tsx`**: The main landing/login page.
-   **`/src/components/`**: Contains reusable React components.
    -   **`/src/components/ui/`**: ShadCN UI components (buttons, cards, forms, etc.).
    -   **`/src/components/layout/`**: Layout components like the `Header`.
    -   **`/src/components/auth/`**: Authentication-related components (e.g., `LoginForm`).
    -   **`/src/components/report-cards/`**: Components for specific report card templates (e.g., `CBSEStateFront.tsx`, `CBSEStateBack.tsx`).
-   **`/src/lib/`**: Utility functions and library initializations.
    -   **`/src/lib/mongodb.ts`**: Handles the MongoDB database connection.
    -   **`/src/lib/utils.ts`**: General utility functions (like `cn` for classnames).
-   **`/src/types/`**: TypeScript type definitions and Zod schemas for various data structures (User, School, Fees, Attendance, Reports, Concessions, Classes, Marks).
-   **`/src/hooks/`**: Custom React hooks (e.g., `useToast`, `useMobile`).
-   **`/src/contexts/`**: React Context providers (e.g., `StudentDataContext`).
-   **`/src/ai/`**: Contains Genkit setup (`genkit.ts`) and will house AI-related flows and logic. Currently, AI features are not deeply integrated but the foundation is present.
-   **`/public/`**: Static assets.
-   **Configuration Files:**
    -   `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `components.json` (for ShadCN UI).

## Backend Setup & Flow

-   The backend logic is primarily serverless, implemented using **Next.js Server Actions** located in `/src/app/actions/`.
-   These server actions are called directly from client components (React Server Components or client components using `await`).
-   **Database:** MongoDB is used as the database. The connection logic is managed in `/src/lib/mongodb.ts`. Server actions interact with the database (CRUD operations) using the official MongoDB Node.js driver.
-   **Data Validation:** Zod schemas are used within server actions (often imported from `/src/types/`) to validate incoming data before processing or database interaction.
-   **Authentication:** Login uses email (for staff) or admission number (for students) and password. User session data (name, role, email, IDs) is stored in `localStorage` after successful login via the `loginUser` server action. This data is then used by client-side components to determine user role and access permissions. Email login is case-sensitive.
-   **AI Integration (Genkit):** The project is configured to use Genkit for AI functionalities (defined in `/src/ai/`). While not extensively used yet, this setup allows for future integration of LLMs for tasks like content generation, data analysis, or smart assistance.

## Frontend Setup & Flow

-   The frontend is built using **Next.js 14+ with the App Router**. This means routing is directory-based within `/src/app`.
-   **React Server Components (RSCs)** and **Client Components (`"use client"`)** are used. Server Components are preferred for fetching data and rendering static parts, while Client Components handle interactivity.
-   **UI Components:**
    -   [ShadCN UI](https://ui.shadcn.com/) provides a set of pre-built, accessible, and customizable components (e.g., `Button`, `Card`, `Input`, `Table`). These are located in `/src/components/ui/`.
    -   Custom reusable components are built as needed and placed in `/src/components/`.
-   **Styling:**
    -   [Tailwind CSS](https://tailwindcss.com/) is used for utility-first styling.
    -   Global styles and Tailwind base layer customizations (including CSS variables for theming) are in `/src/app/globals.css`.
-   **State Management:**
    -   For simple component-level state, React's `useState` and `useEffect` are used.
    -   For cross-component state or more complex scenarios, React Context API is used (e.g., `StudentDataContext`).
    -   Data fetching from server actions is typically done via `async/await` calls within client components or passed as props from Server Components.
-   **Forms:** React Hook Form (`react-hook-form`) is used for managing form state, validation (with Zod via `@hookform/resolvers/zod`), and submission.
-   **User Session on Client:** After login, user information (role, name, email, IDs) is stored in `localStorage`. The `Header` component and individual dashboard pages read this information to tailor the UI and navigation. The Header dynamically shows the school logo for affiliated users or "EduSync" for Super Admins.

## Key Workflows (High-Level)

1.  **User Authentication:**
    -   User enters credentials (email/admission no. & password) on the login page (`/src/app/page.tsx` -> `LoginForm`).
    -   `loginUser` server action validates credentials against the MongoDB `users` collection. Email check is case-sensitive.
    -   On success, user data is stored in `localStorage`, and the user is redirected to their role-specific dashboard.

2.  **School & Fee Structure Management (Super Admin):**
    -   Super Admin creates/edits schools (`/super-admin/schools`), including setting if students can view published reports.
    -   Defines term-wise tuition fees per class and bus fees per location/category.
    -   Assigns School Administrators (`/super-admin/users`).
    -   Applies student-specific fee concessions (`/super-admin/concessions`).

3.  **User Management (School Admin):**
    -   School Admin manages teachers and students for their school (`/admin/users`).
    -   Student creation includes name, email, password, admission ID, class, optional bus transport details, and other personal details (father's name, mother's name, DOB, etc.).
    -   Data is saved via server actions, linking users to the admin's `schoolId`.

4.  **Marks Entry (Teacher):**
    -   Teachers enter marks for various assessments, including detailed tool-wise marks for Formative Assessments (e.g., FA1-Tool1, FA1-Tool2), for students in their assigned subjects/classes.

5.  **Report Card Generation & Publishing (Admin):**
    -   Admin navigates to report card generation (e.g., `/admin/reports/generate-cbse-state`).
    -   Loads student data using Admission ID.
    -   Report card form populates with student details and marks entered by teachers (Admin view is read-only for marks).
    -   Admin saves the report card (initial save marks it as "Not Published").
    -   Admin can then explicitly "Publish" or "Unpublish" the saved report card.

6.  **Student Report Card Viewing:**
    -   Students navigate to their "Exam Results" page.
    -   They can only view their report card if:
        1.  The School Admin has enabled the school-wide setting "Allow Students To View Published Reports" (in `/admin/settings`).
        2.  The specific report card for the student and academic year has been marked as "Published" by an Admin.

## Getting Started

Ready to dive in? Here's how to get EduSync up and running:

1.  **Clone the Repository:** Get the project files onto your local machine.
    ```bash
    git clone <repository_url>
    cd edusync # Or your project directory name
    ```

2.  **Install Dependencies:** Use npm (or yarn/pnpm) to install all the necessary libraries.
    ```bash
    npm install
    ```

3.  **Set up Your Environment Variables:**
    *   Create a file named `.env.local` in the root of your project.
    *   Add your MongoDB connection string and database name:
        ```env
        MONGODB_URI="your_mongodb_connection_string"
        MONGODB_DB_NAME="edusync_db_name" # Or your preferred database name

        # Optional for Genkit (if you plan to use AI features with Google AI)
        # GOOGLE_API_KEY="your_google_ai_api_key"
        ```
    *   Replace placeholders with your actual MongoDB Atlas connection string and desired database name.

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Next.js development server, usually on `http://localhost:9002` (as per `package.json`).

5.  **Initial Super Admin Setup (Important First Step):**
    *   The application expects an initial Super Admin user to exist to manage schools.
    *   **You will need to manually insert the first Super Admin user into your MongoDB `users` collection.**
    *   Example Super Admin document structure:
        ```json
        {
          "name": "Super Admin",
          "email": "siddhumanoj1@gmail.com",
          "password": "Siddhumanoj1@", 
          "role": "superadmin",
          "createdAt": "ISODate(...)", 
          "updatedAt": "ISODate(...)" 
        }
        ```
        *   **Note on Password:** Store the password as plain text (e.g., "Siddhumanoj1@") for the initial setup. The login logic has a fallback to check plain text if hashing fails, intended for this first Super Admin. Subsequent password changes or new user creations (by admins) will store hashed passwords.
    *   After inserting this user, you can log in with these credentials to start creating schools and school admins.

## Available Scripts

-   `npm run dev`: Starts the development server (with Turbopack).
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server (after building).
-   `npm run lint`: Lints the codebase.
-   `npm run typecheck`: Runs TypeScript type checking.
-   `npm run genkit:dev`: Starts the Genkit development flow server (for AI features).

---

We've built EduSync with simplicity and efficiency in mind. We hope you find it as helpful to use as we did to create! If you have any questions or need help, feel free to explore the documentation or reach out.
