const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const wallet = '0x39c71cbcb08af17187f643701655bfd6db467dc7';
  const contract = '0xd539a3a5edb713e6587e559a9d007ffff92bd9ab';
  const { offset = '0', limit = '50' } = event.queryStringParameters || {};

  console.log('Fetching NFTs - offset:', offset, 'limit:', limit);

  try {
    const apiUrl = `https://api.opensea.io/api/v1/assets?owner=${wallet}&asset_contract_address=${contract}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenSea API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched assets:', data.assets ? data.assets.length : 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Error fetching from OpenSea:', error.message);
    
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
