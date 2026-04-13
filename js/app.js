const btnConnect=document.getElementById("btn-connect");
const networkStatus=document.getElementById("network-status");
const walletInfo=document.getElementById("wallet-info");
const walletAddress=document.getElementById("wallet-address");
const trxBalance=document.getElementById("trx-balance");
const usdtBalance=document.getElementById("usdt-balance");
const createSection=document.getElementById("create-section");
const inputSeller=document.getElementById("input-seller");
const inputAmount=document.getElementById("input-amount");
const btnCreateEscrow=document.getElementById("btn-create-escrow");
const createStatus=document.getElementById("create-status");
const escrowSection=document.getElementById("escrow-section");
const escrowEmpty=document.getElementById("escrow-empty");
const escrowTable=document.getElementById("escrow-table");
const escrowTbody=document.getElementById("escrow-tbody");

function setStatus(msg,type){createStatus.textContent=msg;createStatus.className="status-msg "+(type||"info");}
function setNetworkBadge(isNile){if(isNile){networkStatus.textContent="Nile Testnet";networkStatus.className="status-badge connected";}else{networkStatus.textContent="Wrong Network";networkStatus.className="status-badge wrong-network";}}
function showWalletUI(){walletInfo.classList.remove("hidden");createSection.classList.remove("hidden");escrowSection.classList.remove("hidden");btnConnect.textContent="Disconnect";}
function hideWalletUI(){walletInfo.classList.add("hidden");createSection.classList.add("hidden");escrowSection.classList.add("hidden");btnConnect.textContent="Connect Wallet";networkStatus.textContent="Not Connected";networkStatus.className="status-badge";}
function updateWalletDisplay(){walletAddress.textContent=WalletState.address||"—";trxBalance.textContent=WalletState.trxBalance||"—";usdtBalance.textContent=WalletState.usdtBalance||"—";setNetworkBadge(WalletState.isNile);}

function renderEscrows(list){
  escrowTbody.innerHTML="";
  if(!list||list.length===0){
    escrowEmpty.classList.remove("hidden");
    escrowTable.classList.add("hidden");
    return;
  }
  escrowEmpty.classList.add("hidden");
  escrowTable.classList.remove("hidden");
  for(const e of list){
    const tr=document.createElement("tr");
    const td0=document.createElement("td");
    const td1=document.createElement("td");
    const td2=document.createElement("td");
    const td3=document.createElement("td");
    const td4=document.createElement("td");
    td0.textContent=e.id;
    td1.textContent=e.seller;
    td2.textContent=e.amountUsdt;
    td3.textContent=e.status;
    if(e.status==="Pending"){
      const btnR=document.createElement("button");
      btnR.textContent="Release";
      btnR.className="btn-action";
      btnR.addEventListener("click",function(){handleRelease(e.id);});
      const btnF=document.createElement("button");
      btnF.textContent="Refund";
      btnF.className="btn-action btn-refund";
      btnF.addEventListener("click",function(){handleRefund(e.id);});
      td4.appendChild(btnR);
      td4.appendChild(btnF);
    } else {
      td4.textContent="—";
    }
    tr.appendChild(td0);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    escrowTbody.appendChild(tr);
  }
}

async function handleRelease(id){
  setStatus("Releasing escrow #"+id+"...","info");
  const r=await releaseEscrow(id);
  if(r.success){setStatus("Released! TX:"+r.txId,"success");await loadEscrows();await refreshBalances();updateWalletDisplay();}
  else{setStatus("Error: "+r.error,"error");}
}

async function handleRefund(id){
  setStatus("Refunding escrow #"+id+"...","info");
  const r=await refundEscrow(id);
  if(r.success){setStatus("Refunded! TX:"+r.txId,"success");await loadEscrows();await refreshBalances();updateWalletDisplay();}
  else{setStatus("Error: "+r.error,"error");}
}

async function loadEscrows(){
  try{
    if(!WalletState.address)return;
    const list=await fetchBuyerEscrows(WalletState.address);
    renderEscrows(list);
  }catch(e){console.error("loadEscrows:",e);}
}

btnConnect.addEventListener("click",async()=>{
  if(WalletState.isConnected){WalletState.address=null;WalletState.isConnected=false;WalletState.trxBalance=null;WalletState.usdtBalance=null;WalletState.isNile=false;hideWalletUI();return;}
  btnConnect.disabled=true;btnConnect.textContent="Connecting...";
  const result=await connectWallet();
  if(!result.success){alert(result.error);btnConnect.disabled=false;btnConnect.textContent="Connect Wallet";return;}
  updateWalletDisplay();showWalletUI();await loadEscrows();btnConnect.disabled=false;
});

btnCreateEscrow.addEventListener("click",async()=>{
  const seller=inputSeller.value.trim();
  const amount=parseFloat(inputAmount.value);
  if(!seller||!seller.startsWith("T")){setStatus("Enter a valid TRON seller address.","error");return;}
  if(!amount||amount<=0){setStatus("Enter a valid USDT amount.","error");return;}
  btnCreateEscrow.disabled=true;
  setStatus("Approving USDT...","info");
  const result=await createEscrow(seller,amount);
  if(result.success){setStatus("Escrow created! TX:"+result.txId,"success");inputSeller.value="";inputAmount.value="";await loadEscrows();await refreshBalances();updateWalletDisplay();}
  else{setStatus("Error: "+result.error,"error");}
  btnCreateEscrow.disabled=false;
});

onWalletChange(async()=>{
  if(!WalletState.isConnected)return;
  await refreshBalances();detectNetwork();updateWalletDisplay();await loadEscrows();
});
