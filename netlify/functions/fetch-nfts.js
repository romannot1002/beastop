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

  // Get API key from environment variable
  const apiKey = process.env.ALCHEMY_API_KEY;
  
  if (!apiKey) {
    console.error('ALCHEMY_API_KEY not set!');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'API key not configured',
        assets: [] 
      })
    };
  }

  console.log('Fetching NFTs from Alchemy...');

  try {
    // Use your Alchemy API key
    const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`;
    const params = new URLSearchParams({
      owner: wallet,
      'contractAddresses[]': contract,
      withMetadata: 'true',
      pageSize: '100'
    });
    
    const url = `${baseUrl}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alchemy API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.ownedNfts?.length || 0} NFTs`);

    // Transform to your format
    const transformedData = {
      assets: data.ownedNfts ? data.ownedNfts.map(nft => {
        const tokenId = parseInt(nft.tokenId, 16).toString();
        const imageUrl = nft.image?.cachedUrl || 
                        nft.image?.originalUrl || 
                        nft.media?.[0]?.gateway ||
                        nft.image?.pngUrl;
        
        return {
          token_id: tokenId,
          name: nft.title || `PixelBeast #${tokenId}`,
          image_url: imageUrl,
          image_preview_url: imageUrl,
          image_thumbnail_url: imageUrl,
          permalink: `https://opensea.io/assets/ethereum/${contract}/${tokenId}`
        };
      }) : []
    };

    // Handle pagination
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedAssets = transformedData.assets.slice(start, end);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ assets: paginatedAssets })
    };

  } catch (error) {
    console.error('Error fetching NFTs:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        assets: [] 
      })
    };
  }
};
