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
        const maxPages = 20;

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
            
            console.log(`Page ${pageCount + 1}: Found ${nftsInPage.length} NFTs. Total: ${allNFTs.length}`);
            
            pageKey = data.pageKey;
            pageCount++;
            
        } while (pageKey && pageCount < maxPages);

        console.log(`✅ Total NFTs fetched: ${allNFTs.length}`);

        // Filter and format PixelBeasts
        const beasts = allNFTs
            .filter(nft => pixelbeastContracts.includes(nft.contract.address.toLowerCase()))
            .map(nft => {
                const tokenId = nft.tokenId;
                const contractAddress = nft.contract.address;
                
                // Try multiple image sources in order of preference
                let imageUrl = null;
                let imageSource = 'none';
                
                // Priority 1: Alchemy cached URL
                if (nft.image?.cachedUrl && !nft.image.cachedUrl.includes('storage.googleapis.com')) {
                    imageUrl = nft.image.cachedUrl;
                    imageSource = 'cached';
                }
                
                // Priority 2: Alchemy thumbnail
                if (!imageUrl && nft.image?.thumbnailUrl && !nft.image.thumbnailUrl.includes('storage.googleapis.com')) {
                    imageUrl = nft.image.thumbnailUrl;
                    imageSource = 'thumbnail';
                }
                
                // Priority 3: IPFS gateway (if available)
                if (!imageUrl && nft.image?.originalUrl) {
                    const originalUrl = nft.image.originalUrl;
                    if (originalUrl.startsWith('ipfs://')) {
                        const ipfsHash = originalUrl.replace('ipfs://', '');
                        imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                        imageSource = 'ipfs';
                    }
                }
                
                // Priority 4: OpenSea proxy (try to use their CDN)
                if (!imageUrl && nft.image?.originalUrl) {
                    const originalUrl = nft.image.originalUrl;
                    if (originalUrl.includes('storage.googleapis.com')) {
                        // OpenSea sometimes serves these through their CDN
                        imageUrl = `https://i.seadn.io/s/raw/files/${tokenId}.png`;
                        imageSource = 'opensea-cdn';
                    }
                }
                
                // Get attributes for better placeholder
                const attributes = nft.raw?.metadata?.attributes || [];
                const backgroundColor = attributes.find(a => a.trait_type === 'Background')?.value || '#1a1a1a';
                
                console.log(`Beast #${tokenId}: Image source = ${imageSource}, URL = ${imageUrl ? imageUrl.substring(0, 50) + '...' : 'none'}`);
                
                return {
                    tokenId: tokenId,
                    name: nft.name || nft.raw?.metadata?.name || `PixelBeast #${tokenId}`,
                    image: imageUrl,
                    imageSource: imageSource,
                    description: nft.description || '',
                    contractAddress: contractAddress,
                    attributes: attributes,
                    backgroundColor: backgroundColor,
                    openseaUrl: `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
                };
            });

        console.log(`✅ Returning ${beasts.length} PixelBeasts`);
        
        // Log image source statistics
        const sourceStats = beasts.reduce((acc, b) => {
            acc[b.imageSource] = (acc[b.imageSource] || 0) + 1;
            return acc;
        }, {});
        console.log('Image sources:', sourceStats);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                assets: beasts,
                total: beasts.length,
                pagesScanned: pageCount,
                imageStats: sourceStats
            })
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message
            })
        };
    }
};
