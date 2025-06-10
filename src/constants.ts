// API Configuration
export const API_CONFIG = {
    BASE_URL: 'https://challenge.sunvoy.com',
    API_BASE_URL: 'https://api.challenge.sunvoy.com',
    ENDPOINTS: {
        LOGIN: '/login',
        USERS: '/api/users',
        SETTINGS: '/api/settings',
        LIST: 'list',
    }
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