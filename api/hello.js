export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  return new Response(
    JSON.stringify({ message: 'Hello World!' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
} 