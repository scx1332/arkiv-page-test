import "./style.css";
import {cleanLocalStorageKey, connectWallet, getClients} from "./wallet.ts";
import {type MutateEntitiesParameters, type Hex, type Entity} from "@arkiv-network/sdk";
import {eq} from "@arkiv-network/sdk/query";


// DOM elements
const app = document.getElementById("app") as HTMLButtonElement;
const accountDiv = document.getElementById("account") as HTMLDivElement;
const accountBalance = document.getElementById("balance") as HTMLDivElement;
const entityListDiv = document.getElementById("entity-list-div") as HTMLDivElement;
const entityListDivRight = document.getElementById("entity-list-div-right") as HTMLDivElement;
const entityListDivMiddle = document.getElementById("entity-list-div-middle") as HTMLDivElement;
const infoLeftPanel = document.getElementById("info-left-panel") as HTMLDivElement;
const infoMiddlePanel = document.getElementById("info-middle-panel") as HTMLDivElement;
const infoRightPanel = document.getElementById("info-right-panel") as HTMLDivElement;

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

function drawEntities(entities: Entity[], div: HTMLDivElement) {
  if (entities.length === 0) {
    div.textContent = "No entities found.";
  } else {
    const rows = entities
      .map((e: Entity) => {
        const hex = (e.key).toString().slice(0, 6) + "...";
        const attrs =
          Array.isArray(e.attributes) && e.attributes.length
            ? e.attributes.map((a) => `${a.key}: ${String(a.value)}`).join(", ")
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
          <td>${e.lastModifiedAtBlock}</td>
        </tr>`;
      })
      .join("");

    div.innerHTML = `<table class="entity-table">
      <thead><tr><th>Hex</th><th>Attributes</th><th>Payload</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
}

async function oldEntities(blockAfterPush: bigint) {
  const clients = getClients();
  const currentBlock = await clients.publicClient.getBlockNumber();
  const queryBuilder = clients.publicClient.buildQuery();
  queryBuilder.where(eq("unique", uniqueStr)).withMetadata(true).withPayload(true).withAttributes(true);

  queryBuilder.validAtBlock(blockAfterPush)
  const res = await queryBuilder.fetch();

  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("Get number of entities:", res.entities.length);

  if (res.entities.length === 10) {
    infoMiddlePanel.innerHTML = `<p>Data from ${blockAfterPush} (${currentBlock - blockAfterPush} before) get ${res.entities.length} entities</p>`;

    drawEntities(res.entities, entityListDivMiddle);
  } else {
    infoRightPanel.innerHTML = `<p>Data from ${blockAfterPush} (${currentBlock - blockAfterPush} before) get ${res.entities.length} entities</p>`;

    drawEntities(res.entities, entityListDivRight);
  }
}

async function newEntities() {
  const clients = getClients();
  const currentBlock = await clients.publicClient.getBlockNumber();
  const queryBuilder = clients.publicClient.buildQuery();
  queryBuilder.where(eq("unique", uniqueStr)).withMetadata(true).withPayload(true).withAttributes(true);

  queryBuilder.validAtBlock(currentBlock);
  const res = await queryBuilder.fetch();

  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("Get number of entities:", res.entities.length);


  infoLeftPanel.innerHTML = `<p>Current list of ${res.entities.length} entities (for block ${currentBlock})</p>`;
  drawEntities(res.entities, entityListDiv);


}


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

  const blockAfterPush = await clients.publicClient.getBlockNumber();
  console.log("Block after push:", blockAfterPush);

  const queryBuilder = clients.publicClient.buildQuery();
  queryBuilder.where(eq("unique", uniqueStr)).withMetadata(true).withPayload(true).withAttributes(true);

  queryBuilder.limit(2);

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
      if (pageNo === 1) {

        await clients.walletClient.deleteEntity({
          "entityKey": entitiesMut.createdEntities[5]
        });
        await clients.walletClient.updateEntity({
          entityKey: entitiesMut.createdEntities[6],
          payload: new TextEncoder().encode(`Updated Entity no: 6`),
          attributes: [
            { key: "no", value: 6 },
            { key: "unique", value: uniqueStr },
            { key: "updated", value: 1 },
          ],
          contentType: "text/plain",
          expiresIn: 60 * 60 * 24 * 7, // 7 days
        })
      }
    } catch (err) {
      console.error("Failed to delete entity:", err);
    }
  }

  console.log("Queried Entities:", cursor.entities);

  const entities = allEntities ?? [];

  drawEntities(entities, entityListDivMiddle);


  infoLeftPanel.innerHTML = `<p>Finished</p>`;

  while (true) {
    await oldEntities(blockAfterPush);
    await newEntities();
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

async function init() {
  const clients = connectWallet();

  accountBalance.textContent = "";
  accountDiv.innerHTML = `<a class="entity-link" href="https://explorer.rosario.hoodi.arkiv.network/address/${clients.getAddress()}" target="_blank" rel="noopener noreferrer">${clients.getAddress()}</a>`;

  const balance = await clients.getBalance();
  const ethBalance = Number(balance) / 1e18;
  accountBalance.textContent = `Balance: ${ethBalance.toFixed(4)} ETH`;

  app.setAttribute("style", "display: block;");

  if (ethBalance < 0.00001) {
    infoLeftPanel.innerHTML = `<p style="color: red;">Warning: Low balance. Please fund your wallet to proceed.</p>`;
  } else {
    pushEntities()
  }
}

init()
  .then(() => {
    console.log("App initialized");
  })
  .catch((err) => {
    console.error("Failed to initialize app:", err);
  });
