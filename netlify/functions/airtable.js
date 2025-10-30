// netlify/functions/airtable.js

const API_KEY = 'patDOLM7ehMbIyqnm.719c1a8c64cbafaf31243b518a8127db8deb8f44c50e82726ab4cb6039e87786';
const BASE_ID = 'app53jLOIwJtf3qVN';
const TABLE_NAME = 'רשימת שמות';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  const airtableHeaders = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // GET - Fetch all records
    if (event.httpMethod === 'GET') {
      const response = await fetch(airtableUrl, {
        headers: airtableHeaders
      });
      const data = await response.json();
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data)
      };
    }

    // POST - Create new record
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const response = await fetch(airtableUrl, {
        method: 'POST',
        headers: airtableHeaders,
        body: JSON.stringify({ fields: body.fields })
      });
      const data = await response.json();
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data)
      };
    }

    // PATCH - Update record
    if (event.httpMethod === 'PATCH') {
      const recordId = event.queryStringParameters.id;
      const body = JSON.parse(event.body);
      
      const response = await fetch(`${airtableUrl}/${recordId}`, {
        method: 'PATCH',
        headers: airtableHeaders,
        body: JSON.stringify({ fields: body.fields })
      });
      const data = await response.json();
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data)
      };
    }

    // DELETE - Delete record
    if (event.httpMethod === 'DELETE') {
      const recordId = event.queryStringParameters.id;
      
      const response = await fetch(`${airtableUrl}/${recordId}`, {
        method: 'DELETE',
        headers: airtableHeaders
      });
      const data = await response.json();
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};