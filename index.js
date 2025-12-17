"use strict";

const line = require("@line/bot-sdk");
var request = require("request");

const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};

const client = new line.Client(config);
const sunabarToken = process.env.sunabarToken;

exports.handler = (event) => {
  console.log(event);
  const replyToken = JSON.parse(event.body).events[0].replyToken;

  let reqMessage = JSON.parse(event.body).events[0].message.text;
  let resMessage = "";

  if (reqMessage == "おはよう") {
    resMessage = "ゆっくり寝れました？";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
    });
  } else if (reqMessage == "残高") {
    resMessage = "残高は未実装";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
    });
  } else if (reqMessage == "振込") {
    resMessage = "振込は未実装";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
    });
  } else {
    return client.replyMessage(replyToken, {
      type: "text",
      text: "残高？振込？",
    });
  }
};
