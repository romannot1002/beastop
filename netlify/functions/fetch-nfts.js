exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Return fake data to test if function works
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      assets: [
        {
          token_id: "1",
          name: "Test Beast #1",
          image_url: "https://via.placeholder.com/300",
          permalink: "https://opensea.io"
        },
        {
          token_id: "2",
          name: "Test Beast #2",
          image_url: "https://via.placeholder.com/300",
          permalink: "https://opensea.io"
        }
      ]
    })
  };
};
