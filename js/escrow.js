const ESCROW_CONTRACT_ADDRESS = "TMjyyyTUfz5FNuDG6eK1YjASXFKdLXg2tG";
const USDT_TRC20_ADDRESS = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
const ESCROW_STATUS = ["Pending","Released","Refunded"];

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function sendTx(contractAddress,functionSelector,parameters,from){
  const tx=await window.tronWeb.transactionBuilder.triggerSmartContract(
    contractAddress,functionSelector,{feeLimit:100000000,from:from},parameters,from
  );
  const signed=await window.tronWeb.trx.sign(tx.transaction);
  const result=await window.tronWeb.trx.sendRawTransaction(signed);
  return result.txid||result.transaction?.txID;
}

async function createEscrow(sellerAddress,amountUsdt){
  try{
    const from=window.tronWeb.defaultAddress.base58;
    const amountSun=Math.floor(amountUsdt*1000000);
    await sendTx(USDT_TRC20_ADDRESS,"approve(address,uint256)",[
      {type:"address",value:ESCROW_CONTRACT_ADDRESS},
      {type:"uint256",value:amountSun}
    ],from);
    await wait(10000);
    const txId=await sendTx(ESCROW_CONTRACT_ADDRESS,"createEscrow(address,uint256)",[
      {type:"address",value:sellerAddress},
      {type:"uint256",value:amountSun}
    ],from);
    return {success:true,txId};
  }catch(err){return {success:false,error:err.message||String(err)};}
}

async function releaseEscrow(id){
  try{
    const from=window.tronWeb.defaultAddress.base58;
    const escrowId=parseInt(id,10);
    console.log("releasing escrow id:",escrowId,"type:",typeof escrowId);
    const txId=await sendTx(ESCROW_CONTRACT_ADDRESS,"releaseEscrow(uint256)",[
      {type:"uint256",value:escrowId}
    ],from);
    return {success:true,txId};
  }catch(err){return {success:false,error:err.message||String(err)};}
}

async function refundEscrow(id){
  try{
    const from=window.tronWeb.defaultAddress.base58;
    const escrowId=parseInt(id,10);
    const txId=await sendTx(ESCROW_CONTRACT_ADDRESS,"refundEscrow(uint256)",[
      {type:"uint256",value:escrowId}
    ],from);
    return {success:true,txId};
  }catch(err){return {success:false,error:err.message||String(err)};}
}

async function fetchBuyerEscrows(buyerAddress){
  try{
    const ESCROW_ABI=[
      {"name":"getEscrow","type":"Function","inputs":[{"name":"_id","type":"uint256"}],"outputs":[{"name":"buyer","type":"address"},{"name":"seller","type":"address"},{"name":"amount","type":"uint256"},{"name":"status","type":"uint8"}]},
      {"name":"getBuyerEscrows","type":"Function","inputs":[{"name":"_buyer","type":"address"}],"outputs":[{"name":"","type":"uint256[]"}]}
    ];
    const ec=await window.tronWeb.contract(ESCROW_ABI,ESCROW_CONTRACT_ADDRESS);
    const ids=await ec.getBuyerEscrows(buyerAddress).call();
    if(!ids||ids.length===0)return [];
    const results=[];
    for(const rawId of ids){
      try{
        const id=Number(rawId);
        const d=await ec.getEscrow(id).call();
        const seller=d.seller?window.tronWeb.address.fromHex(d.seller):window.tronWeb.address.fromHex(d[1]);
        const amount=Number(d.amount||d[2]||0);
        const sn=Number(d.status!==undefined?d.status:d[3]!==undefined?d[3]:0);
        results.push({id,seller,amountUsdt:(amount/1000000).toFixed(2),status:ESCROW_STATUS[sn]||"Pending"});
      }catch(e){console.error("escrow read error",e);}
    }
    return results;
  }catch(err){console.error("fetchBuyerEscrows:",err);return [];}
}
