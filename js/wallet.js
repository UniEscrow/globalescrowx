const USDT_CONTRACT_ADDRESS = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

const WalletState = {
  address: null,
  trxBalance: null,
  usdtBalance: null,
  isConnected: false,
  isNile: false,
};

async function connectWallet() {
  if (typeof window.tronWeb === "undefined" || !window.tronLink) {
    return { success: false, error: "TronLink not found. Please install TronLink." };
  }
  try {
    const res = await window.tronLink.request({ method: "tron_requestAccounts" });
    if (res.code !== 200) {
      return { success: false, error: "User rejected the connection request." };
    }
    const address = window.tronWeb.defaultAddress.base58;
    if (!address) {
      return { success: false, error: "No account found in TronLink." };
    }
    WalletState.address = address;
    WalletState.isConnected = true;
    await refreshBalances();
    detectNetwork();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Unknown error during connect." };
  }
}

async function refreshBalances() {
  if (!WalletState.isConnected || !WalletState.address) return;
  try {
    const sunBalance = await window.tronWeb.trx.getBalance(WalletState.address);
    WalletState.trxBalance = (sunBalance / 1000000).toFixed(2);
  } catch {
    WalletState.trxBalance = "Error";
  }
  try {
    const contract = await window.tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
    const raw = await contract.balanceOf(WalletState.address).call();
    WalletState.usdtBalance = (Number(raw) / 1000000).toFixed(2);
  } catch {
    WalletState.usdtBalance = "Error";
  }
}

function detectNetwork() {
  try {
    const fullNode = window.tronWeb.fullNode?.host || "";
    WalletState.isNile = fullNode.includes("nile");
  } catch {
    WalletState.isNile = false;
  }
}

function shortAddress(addr) {
  if (!addr) return "—";
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function onWalletChange(callback) {
  window.addEventListener("message", (e) => {
    if (e.data?.message?.action === "setAccount" || e.data?.message?.action === "setNode") {
      callback();
    }
  });
}
