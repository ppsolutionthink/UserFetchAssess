import * as https from 'https';
import { URL } from 'url';

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
                'User-Agent': 'Mozilla/5.0 (compatible; API Client)',
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
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    const client = new APIClient('https://challenge.sunvoy.com');

}

// Execute main function if this file is run directly
if (require.main === module) {
    main();
}
