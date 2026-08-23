**FitUI — Full-Stack Fitness Tracking App (Work in Progress)**

FitUI is a mobile fitness companion app I'm currently building from the ground up, designed around a backend-first MVP approach across four core domains: authentication, workout logging, progress tracking, and meal tracking.

The backend is built with Node.js and Express, backed by a serverless PostgreSQL database (Neon). It handles secure user authentication using bcrypt password hashing and JWT-based sessions, along with a full profile system for tracking weight, height, and fitness goals. The workout logging feature uses a session-based data model — each workout is a container holding multiple nested exercises with sets, reps, weight, and rest intervals — giving it a more realistic structure than a simple flat log. Progress tracking and meal tracking round out the backend with full CRUD APIs, ownership-based access control (users can only ever read or modify their own data), and consistent input validation throughout.

On the frontend, I'm building a React Native app using Expo, with a custom authentication context for session persistence, a JWT-secured API client, and dedicated screens for each core feature — workouts, progress entries, and meal logs — all built with plain React state management and native styling, keeping the app lightweight and dependency-lean.

Deliberate scope decisions have shaped this into a focused MVP rather than a sprawling feature set: no external food-database integrations, no exercise-library autocomplete, no analytics or charts yet, and no refresh-token complexity — just a clean, working core that can be extended later. The schema does include dormant hooks for future features like importing workouts from Instagram or YouTube, but that functionality is intentionally not built yet.

Currently in active development: the backend is fully complete and tested, the mobile app is functional and verified via web preview with live database writes confirmed, and on-device testing via Expo Go is in progress. Next steps include deployment and further mobile polish.
