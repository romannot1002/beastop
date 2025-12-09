**Found it!** 🎯 

The images are **403 Forbidden** - Google Cloud Storage is blocking direct access to those URLs.

---

## ✅ **Solution: Use Alchemy's Cached Images or OpenSea CDN**

Update your `fetch-nfts.js` to try multiple image sources:

```javascript
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
            const errorText = await response.text();
            throw new Error(`Alchemy API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Total NFTs: ${data.ownedNfts?.length || 0}`);

        // Helper function to get best available image URL
        function getImageUrl(nft) {
            // Try multiple sources in order of preference
            const sources = [
                nft.image?.cachedUrl,           // Alchemy's cached version (best)
                nft.image?.thumbnailUrl,        // Alchemy thumbnail
                nft.image?.pngUrl,              // PNG version
                nft.raw?.metadata?.image,       // Raw metadata
                // OpenSea CDN fallback
                `https://i.seadn.io/gae/${nft.tokenId}?auto=format&w=256`,
                // Last resort: placeholder
                `https://via.placeholder.com/300/0a0a0a/00ff41?text=PixelBeast+%23${nft.tokenId}`
            ];

            // Return first non-empty URL that doesn't contain storage.googleapis.com
            for (let url of sources) {
                if (url && !url.includes('storage.googleapis.com')) {
                    console.log(`Token ${nft.tokenId}: ${url}`);
                    return url;
                }
            }

            // If all else fails, try to construct OpenSea CDN URL
            const contractAddress = '0x1acd747b00d65e2e42433f0280e7dcb530de41d7';
            const openseaUrl = `https://openseaimageproxy.pxlbst.workers.dev/?url=https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts/${nft.tokenId}`;
            console.log(`Token ${nft.tokenId}: Using fallback`);
            return openseaUrl;
        }

        // Filter for PixelBeasts contracts
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
            image: getImageUrl(nft),
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
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

---

## 🔄 **Deploy and Test**

1. Commit the updated `fetch-nfts.js`
2. Wait for deploy (1-2 min)
3. Refresh your site
4. Check function logs - you should see different URLs now

---

## 🎯 **If Images Still Don't Load:**

We'll need to **proxy the images through a Netlify function**. But try this first!

**Let me know:**
- ✅ What URLs do the function logs show now?
- ✅ Are any images loading?

🚀
