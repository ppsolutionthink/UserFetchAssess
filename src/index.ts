import * as https from 'https';
import * as fs from 'fs';
import { URL } from 'url';
import * as crypto from 'crypto';

import {
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
} from './constants';

interface HttpResponse {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface SettingsTokens {
    access_token: string;
    apiuser: string;
    language: string;
    openId: string;
    operateId: string;
    userId: string;
}
class APIClient {
    private baseUrl: string;
    private apiBaseUrl: string;
    private cookies: Map<string, string>;

    constructor(baseUrl: string, apiBaseUrl?: string) {
        this.baseUrl = baseUrl;
        this.apiBaseUrl = apiBaseUrl || API_CONFIG.API_BASE_URL;
        this.cookies = new Map<string, string>();
    }

    /**
     * Parse cookies from HTTP headers
     * @param headers 
     * @returns 
     */
    private parseCookies(headers: Record<string, string | string[] | undefined>): void {
        const setCookieHeaders = headers['set-cookie'];
        if (!setCookieHeaders) {
            return;
        }
        
        const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        
        cookieArray.forEach((cookieHeader: string) => {
            if (cookieHeader) {
                const [cookiePart] = cookieHeader.split(';');
                const [name, value] = cookiePart.split('=');
                if (name && value) {
                    this.cookies.set(name.trim(), value.trim());
                }
            }
        });
    }

    /**
     * Format cookies for HTTP request headers
     * @returns 
     */
    private formatCookies(): string {
        return Array.from(this.cookies.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    /**
     * Make HTTP request with support for different base URLs
     * @param method 
     * @param path 
     * @param headers 
     * @param body 
     * @param useApiBaseUrl 
     * @returns 
     */
    private async makeRequest(
        method: string, 
        path: string, 
        headers: Record<string, string> = {}, 
        body: string | null = null,
        useApiBaseUrl: boolean = false
    ): Promise<HttpResponse> {
        return new Promise((resolve, reject) => {
            const baseUrl = useApiBaseUrl ? this.apiBaseUrl : this.baseUrl;
            const url = new URL(path, baseUrl);
            
            // Build headers object with proper typing
            const requestHeaders: Record<string, string> = {
                'User-Agent': DEFAULT_HEADERS.USER_AGENT,
                ...headers
            };

            // Add cookies if available
            if (this.cookies.size > 0) {
                requestHeaders['Cookie'] = this.formatCookies();
            }

            // Add content length for POST requests
            if (body) {
                requestHeaders['Content-Length'] = Buffer.byteLength(body).toString();
            }
            
            const options: https.RequestOptions = {
                hostname: url.hostname,
                port: url.port || NETWORK_CONFIG.DEFAULT_PORT,
                path: url.pathname + url.search,
                method: method,
                headers: requestHeaders
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    // Parse and store cookies
                    this.parseCookies(res.headers);
                    
                    resolve({
                        statusCode: res.statusCode || 0,
                        headers: res.headers,
                        body: responseBody
                    });
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Request failed: ${err.message}`));
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });
    }

    /**
     * Extract nonce from HTML content
     * @param html 
     * @returns 
     */
    private extractNonce(html: string): string | null {
        const nonceMatch = html.match(REGEX_PATTERNS.NONCE);
        return nonceMatch ? nonceMatch[1] : null;
    }

    /**
     * Extract settings tokens from HTML content
     * @param html 
     * @returns 
     */
    private extractSettingsTokens(html: string): SettingsTokens {
        const accessTokenMatch = html.match(REGEX_PATTERNS.ACCESS_TOKEN);
        const openIdMatch = html.match(REGEX_PATTERNS.OPEN_ID);
        const userIdMatch = html.match(REGEX_PATTERNS.USER_ID);
        const apiUserMatch = html.match(REGEX_PATTERNS.API_USER);
        const operateIdMatch = html.match(REGEX_PATTERNS.OPERATE_ID);
        const languageMatch = html.match(REGEX_PATTERNS.LANGUAGE);

        if (!accessTokenMatch || !openIdMatch || !userIdMatch || 
            !apiUserMatch || !operateIdMatch || !languageMatch) {
            throw new Error(ERROR_MESSAGES.TOKEN_EXTRACTION_FAILED);
        }

        return {
            access_token: accessTokenMatch[1],
            openId: openIdMatch[1],
            userId: userIdMatch[1],
            apiuser: apiUserMatch[1],
            operateId: operateIdMatch[1],
            language: languageMatch[1]
        };
    }

    /**
     * Get settings tokens from the settings/tokens page
     * @returns 
     */
    async getSettingsTokens(): Promise<SettingsTokens> {
        console.log(LOADING_MESSAGES.FETCHING_TOKENS);
        
        const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.SETTINGS_TOKENS, {
            'Accept': DEFAULT_HEADERS.ACCEPT_HTML,
            'Referer': `${this.baseUrl}${API_CONFIG.ENDPOINTS.LIST}`
        });
        
        if (response.statusCode !== HTTP_STATUS.OK) {
            throw new Error(`${ERROR_MESSAGES.FETCH_TOKENS_FAILED}: ${response.statusCode}`);
        }
        
        const tokens = this.extractSettingsTokens(response.body);
        console.log(`${SUCCESS_MESSAGES.TOKENS_EXTRACTED} ${JSON.stringify(tokens)}`);
        return tokens;
    }

    /**
     * Get login nonce from the login page
     * @returns 
     */
    async getLoginNonce(): Promise<string> {
        console.log(LOADING_MESSAGES.FETCHING_NONCE);
        
        const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.LOGIN, {
            'Accept': DEFAULT_HEADERS.ACCEPT_HTML
        });
        
        const nonce = this.extractNonce(response.body);
        if (!nonce) {
            throw new Error(ERROR_MESSAGES.NONCE_EXTRACTION_FAILED);
        }
        
        console.log(`${SUCCESS_MESSAGES.NONCE_EXTRACTED}: ${nonce}`);
        return nonce;
    }

    /**
     * Perform login authentication
     * @param nonce 
     * @param username 
     * @param password 
     * @returns 
     */
    async login(nonce: string, username: string, password: string): Promise<boolean> {
        console.log(LOADING_MESSAGES.ATTEMPTING_LOGIN);
        
        const formData = new URLSearchParams({
            nonce: nonce,
            username: username,
            password: password
        }).toString();

        const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.LOGIN, {
            'Content-Type': DEFAULT_HEADERS.CONTENT_TYPE_FORM,
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}${API_CONFIG.ENDPOINTS.LOGIN}`
        }, formData);

        if (response.statusCode === HTTP_STATUS.FOUND) {
            console.log(SUCCESS_MESSAGES.LOGIN_SUCCESSFUL);
            return true;
        }
        
        throw new Error(`${ERROR_MESSAGES.LOGIN_FAILED}: ${response.statusCode}`);
    }

    /**
     * Fetch users from the API
     * @returns 
     */
    async fetchUsers(): Promise<User[]> {
        console.log(LOADING_MESSAGES.FETCHING_USERS);
        
        const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.USERS, {
            'Accept': DEFAULT_HEADERS.ACCEPT_JSON,
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}${API_CONFIG.ENDPOINTS.LIST}`
        });

        if (response.statusCode === HTTP_STATUS.OK) {
            console.log(SUCCESS_MESSAGES.USERS_FETCHED);
            return JSON.parse(response.body) as User[];
        }
        
        throw new Error(`${ERROR_MESSAGES.FETCH_USERS_FAILED}: ${response.statusCode}`);
    }

    /**
     * Generate checkcode for settings API using HMAC-SHA1
     * This method implements the exact algorithm from the website's JavaScript code
     * @param tokens 
     * @param timestamp 
     * @returns 
     */
    private generateCheckcode(tokens: SettingsTokens, timestamp: string): string {
        // Create the payload object with all parameters (excluding checkcode)
        const payload: Record<string, string> = {
            access_token: tokens.access_token,
            apiuser: tokens.apiuser,
            language: tokens.language,
            openId: tokens.openId,
            operateId: tokens.operateId,
            timestamp: timestamp,
            userId: tokens.userId
        };
        
        // Sort the keys alphabetically and create query string
        const sortedParams = Object.keys(payload)
            .sort()
            .map(key => `${key}=${encodeURIComponent(payload[key])}`)
            .join('&');
        
        // Create HMAC-SHA1 hash with the secret key 'mys3cr3t'
        const hmac = crypto.createHmac('sha1', 'mys3cr3t');
        hmac.update(sortedParams);
        
        // Generate the checkcode in uppercase hex format
        const checkcode = hmac.digest('hex').toUpperCase();
        
        console.log(`${SUCCESS_MESSAGES.CHECK_CODE_GENERATED} ${checkcode}`);
        return checkcode;
    }
    
    /**
     * Fetch settings user from the API using dynamically extracted tokens
     * @returns 
     */
    async fetchAuthenticatedUser(): Promise<User> {
        console.log(LOADING_MESSAGES.FETCHING_AUTHENTICATED_USER);
        
        // Get fresh tokens from the settings page
        const tokens = await this.getSettingsTokens();
        
        // Generate current timestamp
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        // Generate checkcode (using placeholder implementation)
        const checkcode = this.generateCheckcode(tokens, timestamp);
        
        // Prepare form data for settings API
        const formData = new URLSearchParams({
            access_token: tokens.access_token,
            apiuser: tokens.apiuser,
            language: tokens.language,
            openId: tokens.openId,
            operateId: tokens.operateId,
            timestamp: timestamp,
            userId: tokens.userId,
            checkcode: checkcode
        }).toString();
        
        const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.SETTINGS, {
            'Accept': DEFAULT_HEADERS.ACCEPT_JSON,
            'Content-Type': DEFAULT_HEADERS.CONTENT_TYPE_FORM,
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}/`
        }, formData, true); // Use API base URL

        if (response.statusCode === HTTP_STATUS.OK) {
            console.log(SUCCESS_MESSAGES.AUTHENTICATED_USER_FETCHED);
            return JSON.parse(response.body) as User;
        }
        
        throw new Error(`${ERROR_MESSAGES.FETCH_AUTHENTICATED_USER_FAILED}: ${response.statusCode}`);
    }

    /**
     * Fetch all users and add settings user to the list
     * @returns 
     */
    async fetchAllUsers(): Promise<User[]> {
        // Fetch regular users
        const users = await this.fetchUsers();
        
        // Fetch settings user
        const settingsUser = await this.fetchAuthenticatedUser();
        
        // Check if settings user already exists in the list
        const existingUser = users.find(user => user.id === settingsUser.id || user.email === settingsUser.email);
        
        if (!existingUser) {
            users.push(settingsUser);
            console.log(SUCCESS_MESSAGES.AUTHENTICATED_USER_ADDED);
        } else {
            console.log(`Settings user already exists in the list (ID: ${settingsUser.id})`);
        }
        
        return users;
    }

    /**
     * Save users data to a JSON file
     * @param users 
     * @param filename 
     */
    async saveUsersToFile(users: User[], filename: string = FILE_CONFIG.DEFAULT_OUTPUT_FILENAME): Promise<void> {
        const prettyJson = JSON.stringify(users, null, FILE_CONFIG.JSON_INDENT);
        fs.writeFileSync(filename, prettyJson, FILE_CONFIG.ENCODING);
        console.log(`${SUCCESS_MESSAGES.FILE_SAVED} ${filename}`);
        console.log(`${SUCCESS_MESSAGES.TOTAL_USERS} ${users.length}`);
    }
  }


/**
 * Main execution function
 */
async function main(): Promise<void> {
    const client = new APIClient(API_CONFIG.BASE_URL, API_CONFIG.API_BASE_URL);
    
    try {
        const nonce = await client.getLoginNonce();
        await client.login(nonce, DEFAULT_CREDENTIALS.USERNAME, DEFAULT_CREDENTIALS.PASSWORD);
        
        // Fetch all users including settings user
        const allUsers = await client.fetchAllUsers();
        await client.saveUsersToFile(allUsers);
        
        console.log(SUCCESS_MESSAGES.PROCESS_COMPLETED);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error:', errorMessage);
        process.exit(1);
    }
}

// Start point
if (require.main === module) {
    main();
}