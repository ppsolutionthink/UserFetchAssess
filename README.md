# UserFetchAssess
Assessment for Sunvoy 
(A TypeScript application that fetches user data from an API with authentication and session management.)

## Features
- Authentication: Login with nonce-based security
- User Management: Fetch users from multiple API endpoints
- Settings Integration: Extract settings data and call dynamic API tokens
- Session Handling: Automatic cookie management
- File Export: Save user data to JSON files

## Scripts
npm start - Run the application 
npm run build - Compile TypeScript

## Configuration
Edit `src/constants.ts` to modify:

## Output
The application generates a users.json file containing all fetched user data:

``` json
[
  {
    "id": "111",
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com"
  }
]
```

