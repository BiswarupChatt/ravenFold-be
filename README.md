# ravenfold-be

Modular Node.js and Express.js backend scaffold for the RavenFold ecommerce API.

The codebase uses native ES modules and `@/` imports that resolve to `src/`.

## Documentation

- [Folder structure](docs/FOLDER_STRUCTURE.md)

## Scripts

```bash
npm run dev
npm start
npm test
```

## Endpoints

- `GET /` - API status
- `GET /api` - API welcome route
- `GET /api/health` - Health check
- `GET /api/auth` - Auth module status
- `POST /api/auth/register` - Register a customer account
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/google` - Login or signup with a Google ID token
- `POST /api/auth/facebook` - Login or signup with a Facebook access token
- `GET /api/admin/dashboard` - Admin dashboard module status

## Social auth

The frontend should complete the provider login flow, then send the provider token to this API. The backend verifies the provider token, links the provider account to an existing user with the same verified email, or creates a new user, then returns this API's JWT.

Required environment variables:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

Optional environment variables:

```bash
GOOGLE_CLIENT_IDS=client-id-1,client-id-2
FACEBOOK_GRAPH_VERSION=your-meta-graph-api-version
```

Request examples:

```bash
POST /api/auth/google
{
  "idToken": "google-id-token"
}

POST /api/auth/facebook
{
  "accessToken": "facebook-user-access-token"
}
```
