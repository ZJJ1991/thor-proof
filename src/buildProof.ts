import { resolve } from "path";
import { Transaction } from 'thor-model-kit'
const Trie = require('merkle-patricia-tree');
const rlp = require('rlp');
// https://www.npmjs.com/package/blake-hash
// https://github.com/cryptocoinjs/blake-hash
const blake = require('blake-hash');
const Web3 = require('web3');
const thorify = require('thorify');
const levelup = require('levelup');

var BuildProof: any = function (host, blockHash, dbPath /*optional*/) {
  this.web3 = new Web3()
  thorify(this.web3, host);
  this.web3.eth.getBlock("latest").then(ret => console.log(ret));
  if (blockHash != undefined) {
    this.blockHash = blockHash
    if (dbPath != undefined) {
      this.db = levelup(dbPath); //required only for account/state proofs
    }
  }
};


BuildProof.prototype.getTx = async function (txHash) {
  let tx = await this.web3.eth.getTransaction(txHash, {});
  return tx;
}

BuildProof.prototype.getBlock = async function (blockHash) {
  let block = await this.web3.eth.getBlock(blockHash, true, {})
  return block
}

BuildProof.prototype.getTransactionProof = async function (txHash) {
  let txResult = await this.getTx(txHash)
  if (txResult && txResult != null) { //  Make sure the result is not neither an error nor null
    let transaction = txResult
    let blockResult = await this.getBlock(transaction.blockHash)
    if (blockResult && blockResult != null) { // Make sure the result is not neither an error nor null
      var txTrie = new Trie();
      var b = blockResult;
      var txIndex = [];
      var rawSignedSiblingTx;
      for (var i = 0; i < b.length; i++) {
        var path = rlp.encode(b.transactionIndex);
        // var rawSignedSiblingTx = new EthereumTx(squanchTx(siblingTx)).serialize()
        let rawSignedSiblingTx =  Transaction.decode(squanchTx(b)) // rlp the transaction
        txTrie.put(path, rawSignedSiblingTx, function (error) {
          if (error != null) { return error }
        })
      }
      txTrie.findPath(rlp.encode(transaction.transactionIndex), function (e, rawTxNode, remainder, stack) {
        if (e) { return e }
        else {
          var prf = {
            blockHash: Buffer.from(transaction.blockHash.slice(2), 'hex'),
            // header: rlp.encode(getRawHeader(b)),
            parentNodes: rlp.encode(rawStack(stack)),
            path: rlp.encode(transaction.transactionIndex),
            value: rlp.decode(rawTxNode.value)
          }
          return Promise.resolve(prf)
        }
      })
    } else {
      return blockResult + " (transaction not found)"
    }
  } else {
    return txResult + " (block not found)"
  }

}

var squanchTx = (tx) => {
  tx.gasPrice = '0x' + tx.gasPrice.toString(16)
  tx.value = '0x' + tx.value.toString(16)
  return tx;
}
// var getRawHeader = (_block) => {
//   if (typeof _block.difficulty != 'string') {
//     _block.difficulty = '0x' + _block.difficulty.toString(16)
//   }
//   var block = new EthereumBlock(_block)
//   return block.header.raw
// }
var rawStack = (input) => {
  var output = []
  for (var i = 0; i < input.length; i++) {
    output.push(input[i].raw)
  }
  return output
}


module.exports = BuildProof