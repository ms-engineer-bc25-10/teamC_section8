"use strict";

const line = require("@line/bot-sdk");

const config = {
    channelSecret: process.env.channelSecretLINE,
    channelAccessToken: process.env.channelAccessTokenLINE,
  
  };
  
const client = new line.Client(config);

async function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: "text",
    text,
  });
}

exports.replyText = replyText;

async function replyTextWithQuickReply(replyToken, text, items) {
  const quickReplyItems = items.map((item) => ({
    type: "action",
    action: {
      type: "message",
      label: item.label,
      text: item.text
    }
  }));

  return client.replyMessage(replyToken, {
    type: "text",
    text,
    quickReply: { items: quickReplyItems }
  });
}

exports.replyTextWithQuickReply = replyTextWithQuickReply;
