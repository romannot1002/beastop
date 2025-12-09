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
            console.error('ALCHEMY_API_KEY is not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'API key not configured'
                })
            };
        }

        const walletAddress = '0x39c71cbcb08af17187f643701655bfd6db467dc7';
        const contractAddress = '0x1acd747b00d65e2e42433f0280e7dcb530de41d7';
        
        const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${walletAddress}&contractAddresses[]=${contractAddress}&withMetadata=true&pageSize=100`;

        console.log('Fetching NFTs from Alchemy...');
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Alchemy API error:', response.status, errorText);
            throw new Error(`Alchemy API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Successfully fetched ${data.ownedNfts?.length || 0} NFTs`);

        const formattedNFTs = (data.ownedNfts || []).map(nft => ({
            tokenId: nft.tokenId,
            name: nft.name || nft.raw?.metadata?.name || `PixelBeast #${nft.tokenId}`,
            image: nft.image?.originalUrl || nft.image?.cachedUrl || nft.raw?.metadata?.image || '',
            description: nft.description || nft.raw?.metadata?.description || ''
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                assets: formattedNFTs,
                total: formattedNFTs.length
            })
        };

    } catch (error) {
        console.error('Error fetching NFTs:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message
            })
        };
    }
};
