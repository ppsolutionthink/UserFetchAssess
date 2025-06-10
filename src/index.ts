import * as https from 'https';
import { URL } from 'url';
import * as fs from 'fs';
import {
    API_CONFIG,
    DEFAULT_CREDENTIALS,
    DEFAULT_HEADERS,
    FILE_CONFIG,
    REGEX_PATTERNS
} from './constants';

interface HttpResponse {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
}

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
}

interface LoginCredentials {
    username: string;
    password: string;
}

interface SettingsTokens {
    access_token: string;
    apiuser: string;
    language: string;
    openId: string;
    operateId: string;
    userId: string;
}

interface SettingsPayload extends SettingsTokens {
    timestamp: string;
    checkcode: string;
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
     * Make HTTP request
     * @param method 
     * @param path 
     * @param headers 
     * @param body 
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
                port: url.port || 443,
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
        const nonceMatch = html.match(/name="nonce"\s+value="([^"]+)"/);
        return nonceMatch ? nonceMatch[1] : null;
    }

    /**
     * Get login nonce from the login page
     * @returns 
     */
    async getLoginNonce(): Promise<string> {
        console.log('Fetching login page to get nonce...');
        
        const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.LOGIN, {
            'Accept': DEFAULT_HEADERS.ACCEPT_HTML
        });
        
        const nonce = this.extractNonce(response.body);
        if (!nonce) {
            throw new Error('Failed to extract nonce from login page');
        }
        
        console.log(`Extracted nonce: ${nonce}`);
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
        console.log('Attempting login...');
        
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

        if (response.statusCode === 302) {
            console.log('Login successful!');
            return true;
        }
        
        throw new Error(`Login failed with status: ${response.statusCode}`);
    }

    /**
      * Fetch users from the API
      * @returns 
      */
    async fetchUsers(): Promise<User[]> {
        console.log('Fetching users from API...');
        
        const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.USERS, {
            'Accept': DEFAULT_HEADERS.ACCEPT_JSON,
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}${API_CONFIG.ENDPOINTS.LIST}`
        });

        if (response.statusCode === 200) {
            console.log('Users fetched successfully!');
            return JSON.parse(response.body) as User[];
        }
        
        throw new Error(`Failed to fetch users. Status: ${response.statusCode}`);
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
            throw new Error('Failed to extract required tokens from settings page');
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
        console.log('Fetching settings tokens...');
        
        const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.SETTINGS_TOKENS, {
            'Accept': DEFAULT_HEADERS.ACCEPT_HTML,
            'Referer': `${this.baseUrl}${API_CONFIG.ENDPOINTS.LIST}`
        });
        
        if (response.statusCode !== 200) {
            throw new Error('Failed to fetch settings tokens');
        }
        
        const tokens = this.extractSettingsTokens(response.body);
        console.log('Settings tokens extracted successfully!');
        
        console.log(tokens);
        return tokens;
    }

    /**
     * Generate checkcode for settings API (placeholder implementation)
     * In a real scenario, this would need to match the server's algorithm
     */
    private generateCheckcode(tokens: SettingsTokens, timestamp: string): string {
        // Using the provided checkcode as fallback - in reality, this would be calculated
        // based on the specific algorithm used by the API
        return 'F0A2FB72DE26136444FABE5711E139570A04A974';
    }

    /**
      * Fetch authenticated user from the API
      * @returns 
      */
    async fetchAuthenticatedUser(): Promise<User> {
        console.log('Fetching authenticated user from API...');
        
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

        console.log(formData);

        const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.SETTINGS, {
            'Accept': DEFAULT_HEADERS.ACCEPT_JSON,
            'Content-Type': DEFAULT_HEADERS.CONTENT_TYPE_FORM,
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}/`,
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Ch-Ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'Priority': 'u=1, i'
        }, formData, true); // Use API base URL

        console.log(response);
        
        if (response.statusCode === 200) {
            console.log('Authenticated user fetched successfully!');
            return JSON.parse(response.body) as User;
        }
        
        throw new Error(`Failed to fetch authenticated user. Status: ${response.statusCode}`);
        

    }

    /**
     * Save users data to a JSON file
     * @param users 
     * @param filename 
     */
    async saveUsersToFile(users: User[], filename: string = FILE_CONFIG.DEFAULT_OUTPUT_FILENAME): Promise<void> {
        const prettyJson = JSON.stringify(users, null, FILE_CONFIG.JSON_INDENT);
        fs.writeFileSync(filename, prettyJson, FILE_CONFIG.ENCODING);
        console.log(`Users saved to ${filename}`);
        console.log(`Total users: ${users.length}`);
    }

}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    const client = new APIClient(API_CONFIG.BASE_URL);

        try {
        const nonce = await client.getLoginNonce();
        await client.login(nonce, DEFAULT_CREDENTIALS.USERNAME, DEFAULT_CREDENTIALS.PASSWORD);
        const users = await client.fetchUsers();
        await client.fetchAuthenticatedUser();
        await client.saveUsersToFile(users);
        console.log('Process completed successfully!');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error:', errorMessage);
        process.exit(1);
    }
}

// Execute main function if this file is run directly
if (require.main === module) {
    main();
}
