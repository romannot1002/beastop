const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
        
        if (!ALCHEMY_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        const walletAddress = '0x39c71cbcb08af17187f643701655bfd6db467dc7';
        const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=100`;

        console.log('Fetching NFTs...');
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Alchemy error: ${response.status}`);
        }

        const data = await response.json();
        const nfts = data.ownedNfts || [];
        
        console.log(`Found ${nfts.length} total NFTs`);

        const pixelbeastContracts = [
            '0x1acd747b00d65e2e42433f0280e7dcb530de41d7',
            '0xd539a3a5edb713e6587e559a9d007ffff92bd9ab'
        ];

        const beasts = nfts
            .filter(nft => pixelbeastContracts.includes(nft.contract.address.toLowerCase()))
            .map(nft => {
                const tokenId = nft.tokenId;
                const contractAddress = '0x1acd747b00d65e2e42433f0280e7dcb530de41d7';
                
                // Try to get real image from Alchemy
                let imageUrl = nft.image?.cachedUrl || 
                              nft.image?.thumbnailUrl || 
                              nft.image?.pngUrl || 
                              null;
                
                // Skip Google Storage URLs (they're 403 forbidden)
                if (imageUrl && imageUrl.includes('storage.googleapis.com')) {
                    imageUrl = null;
                }
                
                // Create SVG placeholder if no valid image
                if (!imageUrl) {
                    const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='45%25' font-family='monospace' font-size='20' fill='%2300ff41' text-anchor='middle'%3EPixelBeast%3C/text%3E%3Ctext x='50%25' y='55%25' font-family='monospace' font-size='24' fill='%2300ff41' text-anchor='middle'%3E%23${tokenId}%3C/text%3E%3C/svg%3E`;
                    imageUrl = svg;
                }
                
                return {
                    tokenId: tokenId,
                    name: nft.name || nft.raw?.metadata?.name || `PixelBeast #${tokenId}`,
                    image: imageUrl,
                    description: nft.description || '',
                    openseaUrl: `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
                };
            });

        console.log(`Returning ${beasts.length} PixelBeasts`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                assets: beasts,
                total: beasts.length
            })
        };

    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message 
            })
        };
    }
};
