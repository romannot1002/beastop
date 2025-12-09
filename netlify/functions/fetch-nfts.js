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
            console.error('Missing API key');
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

        // Filter for PixelBeasts and format
        const pixelbeastContracts = [
            '0x1acd747b00d65e2e42433f0280e7dcb530de41d7',
            '0xd539a3a5edb713e6587e559a9d007ffff92bd9ab'
        ];

        const beasts = nfts
            .filter(nft => pixelbeastContracts.includes(nft.contract.address.toLowerCase()))
            .map(nft => {
                const tokenId = nft.tokenId;
                const contractAddress = '0x1acd747b00d65e2e42433f0280e7dcb530de41d7';
                
                return {
                    tokenId: tokenId,
                    name: nft.name || nft.raw?.metadata?.name || `PixelBeast #${tokenId}`,
                    image: `https://via.placeholder.com/300/1a1a1a/00ff41?text=Beast+%23${tokenId}`,
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
