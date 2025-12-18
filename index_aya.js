"use strict";
const { getBalance } = require("./balance");
const { postTransfer } = require("./transfer");
const { getStatement } = require("./statement");
const { replyText } = require("./lineReply");

exports.handler = async (event) => {
  console.log(event);

  const body = JSON.parse(event.body);
  const eventLine = body.events[0];
  const replyToken = eventLine.replyToken;
  const reqMessage = eventLine.message.text;

  if (reqMessage === "おはよう") {
    await replyText(replyToken, "ゆっくり寝れました？");

  } else if (reqMessage === "残高") {
    const balance = await getBalance();
    await replyText(replyToken, `残高は${balance}円です`);

  } else if (reqMessage === "振込") {
    const applyNo = await postTransfer(); 
    await replyText(replyToken, `振込は${applyNo}で受け付けました`);

  } else if (reqMessage === "履歴") {
  const statement = await getStatement();

  const text = statement.transactions
    .filter(tx => tx.transactionType === "2") 
    .slice(0, 5) //直近5件
    .map(tx => {
      const amount = Math.abs(tx.amount);
      return 
      `📅${tx.transactionDate} 
      💴${amount}円
      📝${tx.remarks ?? ""}`;
    })
    .join("\n\n");

  await replyText(replyToken, text);

  } else {
    await replyText(replyToken, "「残高」「振込」「履歴」と送ってください");
  }

  return {
    statusCode: 200,
    body: "OK",
  };
};