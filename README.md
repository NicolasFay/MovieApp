# MovieApp

## Run the app on a new machine

1. Install [Node.js](https://nodejs.org/) (with npm) and Git. To run on a phone, install **Expo Go** on the device.
2. Clone the repository and open a terminal in the project folder.
3. Install the project dependencies listed in `package-lock.json`:

   ```bash
   npm ci
   ```

4. Create a `.env` file in the project root and add the required API credentials:

   ```dotenv
   EXPO_PUBLIC_API_KEY=your_tmdb_api_key
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Get the movie API key from [The Movie Database](https://www.themoviedb.org/documentation/api) and the URL and anon key from your [Supabase project](https://supabase.com/dashboard). These `EXPO_PUBLIC_` values are included in the client app, so use only public/anon credentials—never a Supabase service-role key. Configure Supabase authentication and run [`src/db/schema.sql`](./src/db/schema.sql) in the Supabase SQL Editor.

5. Start the Expo development server:

   ```bash
   npx expo start
   ```

   Scan the QR code with Expo Go, or use the terminal shortcuts to open a simulator or web version. Keep the phone and computer on the same network. If you change `.env`, stop and restart the server so Expo reloads the values.

`npm ci` installs the dependencies declared by this project, including Expo, React Native, Expo Router, and Supabase. You do not need to install them individually.
