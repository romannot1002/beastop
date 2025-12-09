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
        const pixelbeastContracts = [
            '0x1acd747b00d65e2e42433f0280e7dcb530de41d7',
            '0xd539a3a5edb713e6587e559a9d007ffff92bd9ab'
        ];

        let allNFTs = [];
        let pageKey = undefined;
        let pageCount = 0;
        const maxPages = 20; // Increased safety limit

        console.log('Starting NFT fetch for wallet:', walletAddress);

        // Fetch all pages
        do {
            let url = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=100`;
            
            if (pageKey) {
                url += `&pageKey=${encodeURIComponent(pageKey)}`;
            }
            
            console.log(`Fetching page ${pageCount + 1}...`);
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Alchemy API error:', response.status, errorText);
                throw new Error(`Alchemy error: ${response.status}`);
            }

            const data = await response.json();
            const nftsInPage = data.ownedNfts || [];
            allNFTs = allNFTs.concat(nftsInPage);
            
            console.log(`Page ${pageCount + 1}: Found ${nftsInPage.length} NFTs. Total so far: ${allNFTs.length}`);
            console.log(`Next pageKey: ${data.pageKey ? 'exists' : 'none (last page)'}`);
            
            pageKey = data.pageKey;
            pageCount++;
            
        } while (pageKey && pageCount < maxPages);

        console.log(`✅ Total NFTs fetched across ${pageCount} pages: ${allNFTs.length}`);

        // Filter for PixelBeasts and format
        const beasts = allNFTs
            .filter(nft => {
                const contractAddr = nft.contract.address.toLowerCase();
                const isPixelBeast = pixelbeastContracts.includes(contractAddr);
                return isPixelBeast;
            })
            .map(nft => {
                const tokenId = nft.tokenId;
                // Use the ACTUAL contract address from the NFT
                const contractAddress = nft.contract.address;
                
                console.log(`Processing Beast #${tokenId} from contract ${contractAddress}`);
                
                // ONLY use Alchemy's cached/thumbnail URLs
                let imageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl;
                
                // Skip Google Storage URLs
                if (imageUrl && imageUrl.includes('storage.googleapis.com')) {
                    imageUrl = null;
                }
                
                // SVG fallback
                if (!imageUrl) {
                    const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='45%25' font-family='monospace' font-size='20' fill='%23f7931a' text-anchor='middle'%3EAsset%3C/text%3E%3Ctext x='50%25' y='55%25' font-family='monospace' font-size='24' fill='%23f7931a' text-anchor='middle'%3E%23${tokenId}%3C/text%3E%3C/svg%3E`;
                    imageUrl = svg;
                }
                
                return {
                    tokenId: tokenId,
                    name: nft.name || nft.raw?.metadata?.name || `PixelBeast #${tokenId}`,
                    image: imageUrl,
                    description: nft.description || '',
                    contractAddress: contractAddress,
                    // Fixed OpenSea URL format
                    openseaUrl: `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
                };
            });

        console.log(`✅ Returning ${beasts.length} PixelBeasts`);

        // Log first few OpenSea URLs to verify
        if (beasts.length > 0) {
            console.log('Sample OpenSea URLs:');
            beasts.slice(0, 3).forEach(b => {
                console.log(`  Beast #${b.tokenId}: ${b.openseaUrl}`);
            });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                assets: beasts,
                total: beasts.length,
                pagesScanned: pageCount
            })
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            })
        };
    }
};
