import "./style.css";
import { cleanLocalStorageKey, connectWallet } from "./wallet.ts";

// DOM elements
const app = document.getElementById("app") as HTMLButtonElement;
const accountDiv = document.getElementById("account") as HTMLDivElement;
const accountBalance = document.getElementById("balance") as HTMLDivElement;

const resetAccountBtn = document.getElementById(
  "reset-account-btn",
) as HTMLButtonElement;

resetAccountBtn.addEventListener("click", async () => {
  if (
    confirm(
      "Are you sure you want to reset the account? This will generate a new wallet and you may lose access to any funds in the current wallet.",
    )
  ) {
    cleanLocalStorageKey();
    //reload the page
    window.location.reload();
  }
});

async function init() {
  const clients = await connectWallet();

  accountBalance.textContent = "";
  accountDiv.innerHTML = `<a class="entity-link" href="https://explorer.rosario.hoodi.arkiv.network/address/${clients.getAddress()}" target="_blank" rel="noopener noreferrer">${clients.getAddress()}</a>`;

  const balance = await clients.getBalance();
  const ethBalance = Number(balance) / 1e18;
  accountBalance.textContent = `Balance: ${ethBalance.toFixed(4)} ETH`;

  app.setAttribute("style", "display: block;");
}

init()
  .then(() => {
    console.log("App initialized");
  })
  .catch((err) => {
    console.error("Failed to initialize app:", err);
  });
