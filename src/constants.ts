/**
 * Application Constants
 * Centralized configuration and constant values for the fetch-users project
 */

// API Configuration
export const API_CONFIG = {
    BASE_URL: 'https://challenge.sunvoy.com',
    API_BASE_URL: 'https://api.challenge.sunvoy.com',
    ENDPOINTS: {
        LOGIN: '/login',
        USERS: '/api/users',
        SETTINGS: '/api/settings',
        SETTINGS_TOKENS: '/settings/tokens',
        LIST: '/list'
    },
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3
} as const;

// Default Credentials
export const DEFAULT_CREDENTIALS = {
    USERNAME: 'demo@example.org',
    PASSWORD: 'test'
} as const;

// HTTP Headers
export const DEFAULT_HEADERS = {
    USER_AGENT: 'Mozilla/5.0 (compatible; API Client)',
    ACCEPT_HTML: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ACCEPT_JSON: '*/*',
    CONTENT_TYPE_FORM: 'application/x-www-form-urlencoded'
} as const;

// File Configuration
export const FILE_CONFIG = {
    DEFAULT_OUTPUT_FILENAME: 'users.json',
    ENCODING: 'utf8' as const,
    JSON_INDENT: 4
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    FOUND: 302,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
    NONCE: /name="nonce"\s+value="([^"]+)"/,
    COOKIE_SPLIT: /[;,]/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // Settings token extraction patterns
    ACCESS_TOKEN: /id="access_token"\s+value="([^"]+)"/,
    OPEN_ID: /id="openId"\s+value="([^"]+)"/,
    USER_ID: /id="userId"\s+value="([^"]+)"/,
    API_USER: /id="apiuser"\s+value="([^"]+)"/,
    OPERATE_ID: /id="operateId"\s+value="([^"]+)"/,
    LANGUAGE: /id="language"\s+value="([^"]+)"/
} as const;

// Error Messages
export const ERROR_MESSAGES = {
    NONCE_EXTRACTION_FAILED: 'Failed to extract nonce from login page',
    LOGIN_FAILED: 'Login failed with status',
    FETCH_USERS_FAILED: 'Failed to fetch users. Status',
    FETCH_AUTHENTICATED_USER_FAILED: 'Failed to fetch authenticated user. Status',
    FETCH_TOKENS_FAILED: 'Failed to fetch settings tokens',
    TOKEN_EXTRACTION_FAILED: 'Failed to extract required tokens from settings page',
    REQUEST_FAILED: 'Request failed',
    INVALID_CREDENTIALS: 'Invalid username or password',
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT_ERROR: 'Request timeout',
    FILE_WRITE_ERROR: 'Failed to write file'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    NONCE_EXTRACTED: 'Extracted nonce',
    LOGIN_SUCCESSFUL: 'Login successful!',
    USERS_FETCHED: 'Users fetched successfully!',
    AUTHENTICATED_USER_FETCHED: 'Authenticated user fetched successfully!',
    TOKENS_EXTRACTED: 'Extracted Settings tokens:',
    AUTHENTICATED_USER_ADDED: 'Authenticated user added to users list!',
    CHECK_CODE_GENERATED: 'Generated CheckCode:',
    FILE_SAVED: 'Users saved to',
    PROCESS_COMPLETED: 'Process completed successfully!',
    TOTAL_USERS: 'Total users:'
} as const;

// Loading Messages
export const LOADING_MESSAGES = {
    FETCHING_NONCE: 'Fetching login page to get nonce...',
    ATTEMPTING_LOGIN: 'Attempting login...',
    FETCHING_USERS: 'Fetching users from API...',
    FETCHING_AUTHENTICATED_USER: 'Fetching authenticated user from API...',
    FETCHING_TOKENS: 'Fetching settings tokens...'
} as const;

// Network Configuration
export const NETWORK_CONFIG = {
    DEFAULT_PORT: 443,
    CONNECT_TIMEOUT: 10000, // 10 seconds
    SOCKET_TIMEOUT: 20000,  // 20 seconds
    MAX_REDIRECTS: 5,
    KEEP_ALIVE: true
} as const;


// Export all constants as a single object for convenience
export const CONSTANTS = {
    API_CONFIG,
    DEFAULT_CREDENTIALS,
    DEFAULT_HEADERS,
    FILE_CONFIG,
    HTTP_STATUS,
    REGEX_PATTERNS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    LOADING_MESSAGES,
    NETWORK_CONFIG
} as const;