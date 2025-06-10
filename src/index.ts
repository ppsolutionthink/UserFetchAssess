import * as https from 'https';
import { URL } from 'url';
import * as fs from 'fs';
import {
    API_CONFIG,
    DEFAULT_CREDENTIALS,
    DEFAULT_HEADERS,
    FILE_CONFIG,
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

class APIClient {
    private baseUrl: string;
    private cookies: Map<string, string>;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.cookies = new Map<string, string>();
    }

    /**
     * Parse cookies from HTTP headers
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
     */
    private formatCookies(): string {
        return Array.from(this.cookies.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    /**
     * Make HTTP request
     */
    private async makeRequest(
        method: string, 
        path: string, 
        headers: Record<string, string> = {}, 
        body: string | null = null
    ): Promise<HttpResponse> {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            
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
     */
    private extractNonce(html: string): string | null {
        const nonceMatch = html.match(/name="nonce"\s+value="([^"]+)"/);
        return nonceMatch ? nonceMatch[1] : null;
    }

    /**
     * Get login nonce from the login page
     */
    async getLoginNonce(): Promise<string> {
        console.log('Fetching login page to get nonce...');
        
        const response = await this.makeRequest('GET', '/login', {
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
     */
    async fetchUsers(): Promise<User[]> {
        console.log('Fetching users from API...');
        
        const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.USERS, {
            'Accept': '*/*',
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}/list`
        });

        if (response.statusCode === 200) {
            console.log('Users fetched successfully!');
            return JSON.parse(response.body) as User[];
        }
        
        throw new Error(`Failed to fetch users. Status: ${response.statusCode}`);
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
