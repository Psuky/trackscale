document.getElementById('connectBtn').addEventListener('click', sendToWorker);
document.getElementById('connectPrivateKeyAlt').addEventListener('click', sendToWorker);

async function sendToWorker() {
  const username = document.getElementById('username').value.trim();
  const privateKey = document.getElementById('toolPrivateKey').value.trim();

  if (!privateKey) {
    alert('La Private Key est obligatoire');
    return;
  }

  try {
    const response = await fetch('/api/connect', {   // ← nouvelle URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        privateKey: privateKey
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('Réponse du Worker :', data);

  } catch (error) {
    console.error('Erreur :', error);
    alert('Échec de l’envoi vers le Worker');
  }
}
