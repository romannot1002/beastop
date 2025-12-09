javascript
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const wallet = '0x39c71cbcb08af17187f643701655bfd6db467dc7';
  const contract = '0xd539a3a5edb713e6587e559a9d007ffff92bd9ab';
  const { offset = '0', limit = '50' } = event.queryStringParameters || {};

  console.log('=== STARTING FETCH ===');
  console.log('Wallet:', wallet);
  console.log('Collection:', contract);
  console.log('Offset:', offset, 'Limit:', limit);

  try {
    // Try Alchemy API (free tier, no auth needed for public data)
    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/demo/getNFTsForOwner?owner=${wallet}&contractAddresses[]=${contract}&withMetadata=true&pageSize=${limit}`;
    
    console.log('Trying Alchemy API...');
    console.log('URL:', alchemyUrl);
    
    const response = await fetch(alchemyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      throw new Error(`Alchemy API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Data received:', JSON.stringify(data).substring(0, 200));
    console.log('Number of NFTs:', data.ownedNfts ? data.ownedNfts.length : 0);

    // Transform Alchemy format to our format
    const transformedData = {
      assets: data.ownedNfts ? data.ownedNfts.map(nft => ({
        token_id: nft.tokenId,
        name: nft.title || `PixelBeast #${nft.tokenId}`,
        image_url: nft.image?.cachedUrl || nft.image?.originalUrl || nft.media?.[0]?.gateway,
        image_preview_url: nft.image?.thumbnailUrl || nft.image?.cachedUrl,
        image_thumbnail_url: nft.image?.thumbnailUrl || nft.image?.cachedUrl,
        permalink: `https://opensea.io/assets/ethereum/${contract}/${nft.tokenId}`
      })) : []
    };

    console.log('Transformed assets count:', transformedData.assets.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(transformedData)
    };

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack,
        assets: [] 
      })
    };
  }
};
```


**Try the updated code first and send me the Netlify Function logs!** 🔍
