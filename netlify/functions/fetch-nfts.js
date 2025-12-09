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
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        const walletAddress = '0x39c71cbcb08af17187f643701655bfd6db467dc7';
        
        // First, let's see ALL NFTs in the wallet
        const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=100`;

        console.log('Fetching ALL NFTs from wallet...');
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Alchemy API error:', response.status, errorText);
            throw new Error(`Alchemy API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Total NFTs in wallet: ${data.ownedNfts?.length || 0}`);
        
        // Log all contract addresses to see what we have
        if (data.ownedNfts && data.ownedNfts.length > 0) {
            const contracts = [...new Set(data.ownedNfts.map(nft => nft.contract.address))];
            console.log('Contract addresses found:', contracts);
        }

        // Filter for PixelBeasts (try multiple possible addresses)
        const pixelbeastContracts = [
            '0x1acd747b00d65e2e42433f0280e7dcb530de41d7',
            '0xd539a3a5edb713e6587e559a9d007ffff92bd9ab'
        ];

        const pixelbeasts = (data.ownedNfts || []).filter(nft => 
            pixelbeastContracts.includes(nft.contract.address.toLowerCase())
        );

        console.log(`PixelBeasts found: ${pixelbeasts.length}`);

        const formattedNFTs = pixelbeasts.map(nft => ({
            tokenId: nft.tokenId,
            name: nft.name || nft.raw?.metadata?.name || `PixelBeast #${nft.tokenId}`,
            image: nft.image?.originalUrl || nft.image?.cachedUrl || nft.raw?.metadata?.image || '',
            description: nft.description || nft.raw?.metadata?.description || '',
            contract: nft.contract.address
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                assets: formattedNFTs,
                total: formattedNFTs.length,
                debug: {
                    totalNFTsInWallet: data.ownedNfts?.length || 0,
                    pixelbeastsFound: pixelbeasts.length
                }
            })
        };

    } catch (error) {
        console.error('Error fetching NFTs:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
