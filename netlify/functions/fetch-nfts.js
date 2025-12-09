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

  console.log('Fetching NFTs via Reservoir API - offset:', offset, 'limit:', limit);

  try {
    // Use Reservoir API instead of OpenSea
    const continuation = offset > 0 ? `&continuation=${offset}` : '';
    const apiUrl = `https://api.reservoir.tools/users/${wallet}/tokens/v7?collection=${contract}&limit=${limit}${continuation}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Reservoir API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched tokens:', data.tokens ? data.tokens.length : 0);

    // Transform Reservoir format to OpenSea-like format
    const transformedData = {
      assets: data.tokens ? data.tokens.map(item => ({
        token_id: item.token.tokenId,
        name: item.token.name || `PixelBeast #${item.token.tokenId}`,
        image_url: item.token.image,
        image_preview_url: item.token.image,
        image_thumbnail_url: item.token.image,
        permalink: `https://opensea.io/assets/ethereum/${contract}/${item.token.tokenId}`
      })) : []
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(transformedData)
    };

  } catch (error) {
    console.error('Error fetching from Reservoir:', error.message);
    
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
