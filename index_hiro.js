"use strict";

const line = require("@line/bot-sdk");
var request = require("request");
const { transferMoney } = require("./transferMoney");
const { getDetail } = require("./getDetail");

// 環境変数をオブジェクトで宣言
const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};

const client = new line.Client(config);
const sunabarToken = process.env.sunabarToken;
const userStatus = {};

exports.handler = async (event) => {
  // Lineからのイベントをログで出す
  console.log(event);
  const replyToken = JSON.parse(event.body).events[0].replyToken;

  let reqMessage = JSON.parse(event.body).events[0].message.text;
  let resMessage = "";

  const userId = JSON.parse(event.body).events[0].source.userId;

  if (reqMessage == "太宰府天満宮") {
    resMessage = "1000円になります";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "1000円を振り込む",
              text: "1000円を振り込む",
            },
          },
        ],
      },
    });
  } else if (reqMessage.includes("振り込む")) {
    try {
      // 入力されたテキストから金額のみを取得
      const money = reqMessage.match(/\d+/g).join("");
      console.log(money);

      // 引数に金額を設定して、振込依頼APIを発動
      const result = await transferMoney(money);

      // 振り込みAPIからレスポンスから「applyNo」を格納
      userStatus[userId] = {
        applyNo: result.applyNo,
      };

      resMessage =
        "振り込み受け付けを行いました。\nログインをしてパスワードを入力して振り込み手続きを完了してください。\nhttps://sso.sunabar.gmo-aozora.com/b2c/login";
      return client.replyMessage(replyToken, {
        type: "text",
        text: resMessage,
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "message",
                label: "振り込みました",
                text: "振り込みました",
              },
            },
          ],
        },
      });
    } catch (err) {
      console.error(err);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "送金に失敗しました",
      });
    }
  } else if (reqMessage == "振り込みました") {
    try {
      // 「applyNo」を引数に、振込依頼結果紹介APIを発動
      const result = await getDetail(userStatus[userId].applyNo);

      // resultに格納されている数字が「1(完了)」であるか確認
      // 「2」は未完了
      // 「8」は期限切れ
      if (result == 1) {
        resMessage = "振り込みが確認できました。\nお守りをお渡しします。";
        return client.replyMessage(replyToken, [
          {
            type: "text",
            text: resMessage,
          },
          {
            type: "image",
            originalContentUrl: "https://i.ibb.co/dw3fKZcc/omamori-goukaku.png",
            previewImageUrl: "https://i.ibb.co/dw3fKZcc/omamori-goukaku.png",
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "確認に失敗しました",
      });
    }
  }
};
