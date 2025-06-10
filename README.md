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
`npm run build` - Compile TypeScript   
`npm start` - Run the application 

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

## Screen Recording
 [**Watch Video**](https://drive.google.com/file/d/1ssUJO5shuTPAsj4878TMMS2KbqWN6Xyb/view)
 [**Raw Data at Repository**](./data/ScreenRecording.mp4)