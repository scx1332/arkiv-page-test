import "./style.css";
import {cleanLocalStorageKey, connectWallet, getClients} from "./wallet.ts";
import {type MutateEntitiesParameters, type Hex, type Entity} from "@arkiv-network/sdk";
import {eq} from "@arkiv-network/sdk/query";


// DOM elements
const app = document.getElementById("app") as HTMLButtonElement;
const accountDiv = document.getElementById("account") as HTMLDivElement;
const accountBalance = document.getElementById("balance") as HTMLDivElement;
const entityListDiv = document.getElementById("entity-list-div") as HTMLDivElement;
const infoLeftPanel = document.getElementById("info-left-panel") as HTMLDivElement;

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

//generate short random string
const uniqueStr = Math.random().toString(36).substring(2, 8);

const globalEntities: Hex[] = [];

async function pushEntities() {
  const clients = getClients();
  let no = -1;


  const operations: MutateEntitiesParameters = {
    creates: [],
    updates: [],
    deletes: [],
    extensions: [],
    ownershipChanges: []
  };
  for (let i = 1; i <= 10; i++) {
    no += 1;
    operations.creates?.push({
      payload: new TextEncoder().encode(`Entity no: ${no}`),
      attributes: [
        { key: "no", value: no },
        { key: "unique", value: uniqueStr },
      ],
      contentType: "text/plain",
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    })
  }

  infoLeftPanel.innerHTML = `<p>Pushing 10 entities with attribute</p>`;

  const entitiesMut = await clients.walletClient.mutateEntities(operations);

  for (const entityHex of entitiesMut.createdEntities) {
    globalEntities.push(entityHex);
  }

  const queryBuilder = clients.publicClient.buildQuery();
  queryBuilder.where(eq("unique", uniqueStr)).withMetadata(true).withPayload(true).withAttributes(true);

  queryBuilder.limit(1);

  infoLeftPanel.innerHTML = `<p>Fetching created entities page 0</p>`;

  const cursor = await queryBuilder.fetch();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const allEntities: Entity[] = [];
  allEntities.push(...(cursor.entities ?? []));

  let pageNo = 0;
  while(cursor.hasNextPage()) {
    pageNo += 1;
    infoLeftPanel.innerHTML = `<p>Fetching created entities page ${pageNo}</p>`;
    await cursor.next();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    allEntities.push(...(cursor.entities ?? []));

    try {
      await clients.walletClient.deleteEntity({
        "entityKey": entitiesMut.createdEntities[5]
      });
    } catch (err) {
      console.error("Failed to delete entity:", err);
    }
  }

  console.log("Queried Entities:", cursor.entities);

  const entities = allEntities ?? [];
  if (entities.length === 0) {
    entityListDiv.textContent = "No entities found.";
  } else {
    const rows = entities
      .map((e: Entity) => {
        const hex = (e.key).toString().slice(0, 6) + "...";
        const attrs =
          Array.isArray(e.attributes) && e.attributes.length
            ? e.attributes.map((a: any) => `${a.key}: ${String(a.value)}`).join(", ")
            : "";
        let payloadStr = "";
        if (e.payload) {
          try {
            payloadStr = new TextDecoder().decode(e.payload);
          } catch {
            payloadStr = String(e.payload);
          }
        }
        return `<tr>
          <td>${hex}</td>
          <td>${attrs}</td>
          <td>${payloadStr}</td>
        </tr>`;
      })
      .join("");

    entityListDiv.innerHTML = `<table class="entity-table">
      <thead><tr><th>Hex</th><th>Attributes</th><th>Payload</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }



  infoLeftPanel.innerHTML = `<p>Finished</p>`;


}

async function init() {
  const clients = await connectWallet();

  accountBalance.textContent = "";
  accountDiv.innerHTML = `<a class="entity-link" href="https://explorer.rosario.hoodi.arkiv.network/address/${clients.getAddress()}" target="_blank" rel="noopener noreferrer">${clients.getAddress()}</a>`;

  const balance = await clients.getBalance();
  const ethBalance = Number(balance) / 1e18;
  accountBalance.textContent = `Balance: ${ethBalance.toFixed(4)} ETH`;

  app.setAttribute("style", "display: block;");

  pushEntities()
}

init()
  .then(() => {
    console.log("App initialized");
  })
  .catch((err) => {
    console.error("Failed to initialize app:", err);
  });
