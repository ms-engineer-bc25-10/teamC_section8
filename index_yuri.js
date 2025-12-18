"use strict";

const line = require("@line/bot-sdk");

const { drawOmikuji } = require("./omikuji");
const { requestTransfer } = require("./transfer");

// 日本時間(JST)で「今日の日付 YYYY-MM-DD」を返す
function getTodayJST() {
  //「今」の日時を作る(Lambda/サーバーではUTC(世界標準時)になることが多い)
  const now = new Date();
  //今の時刻をミリ秒に変換,日本はUTC+9時間
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  //YYYY-MM-DD形式に整形する(ISO形式の文字列に変換+先頭10文字だけ切り出す)
  return jst.toISOString().slice(0, 10);
}

const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};

const client = new line.Client(config);

exports.handler = async (event) => {
  console.log(event);

  const body = JSON.parse(event.body);
  const replyToken = body.events[0].replyToken;
  const reqMessage = body.events[0].message.text;

  if (reqMessage === "おみくじ") {
    return client.replyMessage(replyToken, {
      type: "text",
      text: "どの神社のおみくじを購入しますか？",
    });
  }

  if (reqMessage === "太宰府天満宮") {
    return client.replyMessage(replyToken, {
      type: "text",
      text: "⛩ 太宰府天満宮のおみくじです。\n料金は100円です。",
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "100円でおみくじを引く",
              text: "100円でおみくじを引く",
            },
          },
        ],
      },
    });
  }

  if (reqMessage === "100円でおみくじを引く") {
    try {
      const transferDate = getTodayJST();
      const amount = 100;

      const result = await requestTransfer(
        process.env.sunabarToken,
        transferDate,
        amount
      );

      console.log("振込API結果:", result);

      return client.replyMessage(replyToken, {
        type: "text",
        text:
          "振込み受付を行いました。\n\n" +
          "ログインして\n" +
          "振込みを完了してください。\n\n" +
          "https://sso.sunabar.gmo-aozora.com/b2c/login",
      });
    } catch (err) {
      console.error("振込エラー:", err);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "振込受付に失敗しました",
      });
    }
  }

  if (reqMessage === "振込完了") {
    return client.replyMessage(replyToken, {
      type: "text",
      text:
        "振込みを確認できました。\n" +
        "おみくじの結果です 🎯\n\n" +
        "           ↓  ↓  ↓ \n\n\n\n" +
        "           ↓  ↓  ↓ \n\n\n\n" +
        "           ↓  ↓  ↓ \n\n\n\n" +
        "      ◆太宰府天満宮◆\n" +
        "             おみくじ\n" +
        drawOmikuji(),
    });
  }
};
