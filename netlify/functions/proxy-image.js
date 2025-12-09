const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const imageUrl = event.queryStringParameters.url;
        
        if (!imageUrl) {
            return {
                statusCode: 400,
                headers,
                body: 'Missing url parameter'
            };
        }

        console.log('Proxying image:', imageUrl);

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.error('Image fetch failed:', response.status);
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const imageBuffer = await response.buffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentType
            },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Proxy error:', error.message);
        
        // Return SVG placeholder on error
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='#1a1a1a'/><text x='50%' y='50%' font-family='monospace' font-size='16' fill='#00ff41' text-anchor='middle'>Image Unavailable</text></svg>`;
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'image/svg+xml'
            },
            body: svg
        };
    }
};
